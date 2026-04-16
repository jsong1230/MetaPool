// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

contract MetaPool is Ownable, ReentrancyGuard, Pausable {
    // ============================================================
    // Enums
    // ============================================================

    enum MarketStatus { Active, Closed, Resolved, Voided, Paused }
    enum MarketOutcome { Undecided, Yes, No, Void }
    enum MarketCategory { Crypto, Sports, Weather, Politics, Entertainment, Other }

    // ============================================================
    // Structs
    // ============================================================

    struct Market {
        uint256 id;
        string question;
        string questionKo;
        string questionZh;
        string questionJa;
        MarketCategory category;
        uint256 bettingDeadline;
        uint256 resolutionDeadline;
        MarketStatus status;
        MarketOutcome outcome;
        uint256 yesPool;
        uint256 noPool;
        uint256 yesCount;
        uint256 noCount;
        uint256 createdAt;
        uint256 resolvedAt;
        address creator;
        uint256 disputeDeadline;
        uint256 disputeCount;
        bool underReview;
    }

    struct Bet {
        uint256 amount;
        bool isYes;
        bool claimed;
    }

    struct Dispute {
        uint256 stake;
        bool resolved;
        bool accepted;
    }

    // ============================================================
    // Custom Errors
    // ============================================================

    error EmptyQuestion();
    error InvalidDeadline(uint256 bettingDeadline, uint256 resolutionDeadline);
    error MarketNotFound(uint256 marketId);
    error MarketNotActive(uint256 marketId, MarketStatus currentStatus);
    error BettingDeadlinePassed(uint256 marketId, uint256 deadline);
    error BetAmountTooLow(uint256 amount, uint256 minBet);
    error BetAmountTooHigh(uint256 amount, uint256 maxBet);
    error OppositeBetExists(uint256 marketId, address user);

    // F-03/F-04/F-07/F-08 Custom Errors
    error MarketNotResolvable(uint256 marketId, MarketStatus currentStatus);
    error BettingNotClosed(uint256 marketId, uint256 deadline);
    error InvalidOutcome();
    error MarketNotResolved(uint256 marketId, MarketStatus currentStatus);
    error MarketNotVoided(uint256 marketId, MarketStatus currentStatus);
    error NotWinner(uint256 marketId, address user);
    error AlreadyClaimed(uint256 marketId, address user);
    error NoBetFound(uint256 marketId, address user);
    error TransferFailed();

    // F-11 Custom Errors
    error MarketNotPausable(uint256 marketId, MarketStatus currentStatus);
    error MarketNotPaused(uint256 marketId, MarketStatus currentStatus);

    // F-12 Custom Errors
    error InvalidMinBet(uint256 minBet);
    error InvalidMaxBet(uint256 maxBet, uint256 currentMinBet);
    error InvalidFeeRate(uint256 feeRate);

    // Referral Custom Errors
    error SelfReferral();
    error ReferrerAlreadySet();
    error NoReferralReward();
    error InsufficientReferralPool();

    // F-09/F-10 Custom Errors
    error DisputePeriodActive(uint256 marketId, uint256 deadline);
    error DisputePeriodEnded(uint256 marketId);
    error InvalidDisputeStake(uint256 sent, uint256 required);
    error NotBettor(uint256 marketId, address user);
    error AlreadyDisputed(uint256 marketId, address user);
    error MarketUnderReview(uint256 marketId);
    error MarketNotUnderReview(uint256 marketId);
    error DisputeNotFound(uint256 marketId, address user);
    error DisputeAlreadyResolved(uint256 marketId, address user);

    // ============================================================
    // Events
    // ============================================================

    event MarketCreated(
        uint256 indexed marketId,
        string question,
        MarketCategory indexed category,
        uint256 bettingDeadline,
        uint256 resolutionDeadline
    );

    event BetPlaced(
        uint256 indexed marketId,
        address indexed bettor,
        bool isYes,
        uint256 amount,
        uint256 newYesPool,
        uint256 newNoPool
    );

    // F-03/F-07/F-08 Events
    event MarketResolved(uint256 indexed marketId, MarketOutcome outcome, uint256 platformFee);
    event WinningsClaimed(uint256 indexed marketId, address indexed user, uint256 amount);
    event RefundClaimed(uint256 indexed marketId, address indexed user, uint256 amount);

    // F-11 Events
    event MarketPaused(uint256 indexed marketId);
    event MarketResumed(uint256 indexed marketId, uint256 newBettingDeadline, uint256 newResolutionDeadline);

    // F-12 Events
    event SettingsUpdated(string setting, uint256 oldValue, uint256 newValue);
    event FeesWithdrawn(address indexed recipient, uint256 amount);

    // F-09/F-10 Events
    event DisputeSubmitted(uint256 indexed marketId, address indexed disputant, uint256 stake, uint256 disputeCount);
    event DisputeResolved(uint256 indexed marketId, address indexed disputant, bool accepted, uint256 stakeReturned);
    event MarketReviewTriggered(uint256 indexed marketId, uint256 disputeCount, uint256 totalBettors);

    // Referral Events
    event ReferrerSet(address indexed user, address indexed referrer);
    event ReferralRewardEarned(address indexed user, address indexed referrer, uint256 amount);
    event ReferralRewardClaimed(address indexed user, uint256 amount);
    event ReferralPoolFunded(uint256 amount, uint256 newBalance);

    // ============================================================
    // State Variables
    // ============================================================

    mapping(uint256 => Market) public markets;
    mapping(uint256 => mapping(address => Bet)) public bets;
    mapping(uint256 => mapping(address => Dispute)) public disputes;

    uint256 public marketCount;
    uint256 public minBet;
    uint256 public maxBet;
    uint256 public platformFeeRate;
    uint256 public constant FEE_DENOMINATOR = 10000;
    uint256 public accumulatedFees;

    // F-09/F-10 상수
    uint256 public constant DISPUTE_PERIOD = 24 hours;
    uint256 public constant DISPUTE_STAKE = 1000 ether;
    uint256 public constant DISPUTE_THRESHOLD = 1000; // 10% (basis points)

    // Referral 상태
    mapping(address => address) public referrers;         // user → referrer
    mapping(address => uint256) public referralRewards;   // user → claimable reward
    mapping(address => bool) public hasPlacedBet;         // user → first bet flag
    uint256 public referralRewardAmount = 500 ether;      // 500 META per side
    uint256 public referralPool;                          // owner-funded reward pool

    // ============================================================
    // Constructor
    // ============================================================

    constructor(
        address _initialOwner,
        uint256 _minBet,
        uint256 _maxBet,
        uint256 _platformFeeRate
    ) Ownable(_initialOwner) {
        require(_minBet > 0, "minBet must be > 0");
        require(_maxBet > _minBet, "maxBet must be > minBet");
        require(_platformFeeRate <= 1000, "feeRate must be <= 10%");

        minBet = _minBet;
        maxBet = _maxBet;
        platformFeeRate = _platformFeeRate;
    }

    // ============================================================
    // F-01: Market Creation
    // ============================================================

    function createMarket(
        string calldata _question,
        string calldata _questionKo,
        string calldata _questionZh,
        string calldata _questionJa,
        MarketCategory _category,
        uint256 _bettingDeadline,
        uint256 _resolutionDeadline
    ) external onlyOwner returns (uint256 marketId) {
        if (bytes(_question).length == 0) revert EmptyQuestion();
        if (_bettingDeadline <= block.timestamp) {
            revert InvalidDeadline(_bettingDeadline, _resolutionDeadline);
        }
        if (_resolutionDeadline <= _bettingDeadline) {
            revert InvalidDeadline(_bettingDeadline, _resolutionDeadline);
        }

        marketId = ++marketCount;

        Market storage m = markets[marketId];
        m.id = marketId;
        m.question = _question;
        m.questionKo = _questionKo;
        m.questionZh = _questionZh;
        m.questionJa = _questionJa;
        m.category = _category;
        m.bettingDeadline = _bettingDeadline;
        m.resolutionDeadline = _resolutionDeadline;
        m.status = MarketStatus.Active;
        m.outcome = MarketOutcome.Undecided;
        m.createdAt = block.timestamp;
        m.creator = msg.sender;

        emit MarketCreated(marketId, _question, _category, _bettingDeadline, _resolutionDeadline);
    }

    // ============================================================
    // 관리자 기능: 글로벌 Pause
    // ============================================================

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    // ============================================================
    // F-05: Yes/No 베팅
    // ============================================================

    function placeBet(uint256 _marketId, bool _isYes) external payable whenNotPaused {
        Market storage market = markets[_marketId];

        // 마켓 존재 검증: id == 0이면 미존재
        if (market.id == 0) revert MarketNotFound(_marketId);

        // Active 상태 검증
        if (market.status != MarketStatus.Active) revert MarketNotActive(_marketId, market.status);

        // 마감 전 검증
        if (block.timestamp >= market.bettingDeadline) revert BettingDeadlinePassed(_marketId, market.bettingDeadline);

        // 최소 금액 검증
        if (msg.value < minBet) revert BetAmountTooLow(msg.value, minBet);

        // 최대 금액 검증
        if (msg.value > maxBet) revert BetAmountTooHigh(msg.value, maxBet);

        Bet storage bet = bets[_marketId][msg.sender];

        // 반대 방향 차단 (추가 베팅 시에만 해당)
        if (bet.amount > 0 && bet.isYes != _isYes) revert OppositeBetExists(_marketId, msg.sender);

        // 첫 베팅: 방향 설정 + 참여자 수 증가
        bool isFirstEverBet = !hasPlacedBet[msg.sender];
        if (bet.amount == 0) {
            bet.isYes = _isYes;
            if (_isYes) {
                market.yesCount++;
            } else {
                market.noCount++;
            }
        }

        // 금액 합산
        bet.amount += msg.value;

        // 풀 갱신
        if (_isYes) {
            market.yesPool += msg.value;
        } else {
            market.noPool += msg.value;
        }

        emit BetPlaced(_marketId, msg.sender, _isYes, msg.value, market.yesPool, market.noPool);

        // Referral: 첫 베팅 시 양쪽 보상 크레딧
        if (isFirstEverBet) {
            hasPlacedBet[msg.sender] = true;
            address ref = referrers[msg.sender];
            if (ref != address(0) && referralPool >= referralRewardAmount * 2) {
                referralPool -= referralRewardAmount * 2;
                referralRewards[ref] += referralRewardAmount;
                referralRewards[msg.sender] += referralRewardAmount;
                emit ReferralRewardEarned(msg.sender, ref, referralRewardAmount);
                emit ReferralRewardEarned(ref, msg.sender, referralRewardAmount);
            }
        }
    }

    // ============================================================
    // View Functions
    // ============================================================

    function getMarket(uint256 _marketId) external view returns (Market memory) {
        return markets[_marketId];
    }

    function getUserBet(uint256 _marketId, address _user) external view returns (Bet memory) {
        return bets[_marketId][_user];
    }

    function getOdds(uint256 _marketId) external view returns (uint256 yesOdds, uint256 noOdds) {
        Market storage market = markets[_marketId];
        uint256 totalPool = market.yesPool + market.noPool;

        // 풀이 비어있거나 한쪽 풀이 0이면 배당률 계산 불가
        if (totalPool == 0 || market.yesPool == 0 || market.noPool == 0) {
            return (0, 0);
        }

        // 수수료 차감 반영 배당률 (basis points)
        uint256 feeAdjusted = FEE_DENOMINATOR - platformFeeRate;
        yesOdds = (totalPool * feeAdjusted) / market.yesPool;
        noOdds = (totalPool * feeAdjusted) / market.noPool;
    }

    // ============================================================
    // F-03: 결과 확정
    // ============================================================

    function resolveMarket(uint256 _marketId, MarketOutcome _outcome) external onlyOwner {
        Market storage market = markets[_marketId];

        // 마켓 존재 검증
        if (market.id == 0) revert MarketNotFound(_marketId);

        // Active 또는 Closed 상태만 허용
        if (market.status != MarketStatus.Active && market.status != MarketStatus.Closed) {
            revert MarketNotResolvable(_marketId, market.status);
        }

        // 베팅 마감 이후만 가능
        if (block.timestamp < market.bettingDeadline) {
            revert BettingNotClosed(_marketId, market.bettingDeadline);
        }

        // Yes, No, Void만 허용 (Undecided 불가)
        if (_outcome == MarketOutcome.Undecided) revert InvalidOutcome();

        uint256 platformFee = 0;

        if (_outcome == MarketOutcome.Void) {
            // Void 확정: 상태 Voided로 전환, 수수료 없음, 이의제기 기간 없음
            market.status = MarketStatus.Voided;
        } else {
            // Yes/No 확정: 패배 풀에서 수수료 계산
            uint256 losingPool = (_outcome == MarketOutcome.Yes) ? market.noPool : market.yesPool;
            platformFee = losingPool * platformFeeRate / FEE_DENOMINATOR;
            accumulatedFees += platformFee;
            market.status = MarketStatus.Resolved;
            // 이의제기 기간 설정 (24시간)
            market.disputeDeadline = block.timestamp + DISPUTE_PERIOD;
        }

        market.outcome = _outcome;
        market.resolvedAt = block.timestamp;

        emit MarketResolved(_marketId, _outcome, platformFee);
    }

    // ============================================================
    // F-07: 보상 클레임
    // ============================================================

    function claimWinnings(uint256 _marketId) external nonReentrant {
        Market storage market = markets[_marketId];

        // Resolved 상태 검증
        if (market.status != MarketStatus.Resolved) {
            revert MarketNotResolved(_marketId, market.status);
        }

        // 재심 상태 검증: underReview이면 클레임 불가
        if (market.underReview) revert MarketUnderReview(_marketId);

        // 이의제기 기간 중 클레임 보류
        if (block.timestamp <= market.disputeDeadline) {
            revert DisputePeriodActive(_marketId, market.disputeDeadline);
        }

        Bet storage bet = bets[_marketId][msg.sender];

        // 베팅 기록 검증
        if (bet.amount == 0) revert NoBetFound(_marketId, msg.sender);

        // 승리 방향 검증
        bool isWinner = (market.outcome == MarketOutcome.Yes && bet.isYes) ||
                        (market.outcome == MarketOutcome.No && !bet.isYes);
        if (!isWinner) revert NotWinner(_marketId, msg.sender);

        // 이중 클레임 방지
        if (bet.claimed) revert AlreadyClaimed(_marketId, msg.sender);

        // CEI 패턴: 상태 먼저 변경
        bet.claimed = true;

        // 보상 계산
        uint256 losingPool = (market.outcome == MarketOutcome.Yes) ? market.noPool : market.yesPool;
        uint256 winPool = (market.outcome == MarketOutcome.Yes) ? market.yesPool : market.noPool;
        uint256 platformFee = losingPool * platformFeeRate / FEE_DENOMINATOR;
        uint256 distributable = losingPool - platformFee;
        uint256 reward = bet.amount + (distributable * bet.amount / winPool);

        // META 전송
        (bool success, ) = payable(msg.sender).call{value: reward}("");
        if (!success) revert TransferFailed();

        emit WinningsClaimed(_marketId, msg.sender, reward);
    }

    // ============================================================
    // F-04/F-08: Void 환불 클레임
    // ============================================================

    function claimRefund(uint256 _marketId) external nonReentrant {
        Market storage market = markets[_marketId];

        // Voided 상태 검증
        if (market.status != MarketStatus.Voided) {
            revert MarketNotVoided(_marketId, market.status);
        }

        Bet storage bet = bets[_marketId][msg.sender];

        // 베팅 기록 검증
        if (bet.amount == 0) revert NoBetFound(_marketId, msg.sender);

        // 이중 환불 방지
        if (bet.claimed) revert AlreadyClaimed(_marketId, msg.sender);

        // CEI 패턴: 상태 먼저 변경
        bet.claimed = true;
        uint256 refundAmount = bet.amount;

        // 원금 전액 전송
        (bool success, ) = payable(msg.sender).call{value: refundAmount}("");
        if (!success) revert TransferFailed();

        emit RefundClaimed(_marketId, msg.sender, refundAmount);
    }

    // ============================================================
    // View: 예상 보상 계산
    // ============================================================

    function calculateWinnings(uint256 _marketId, address _user) external view returns (uint256) {
        Market storage market = markets[_marketId];
        Bet storage bet = bets[_marketId][_user];

        if (market.status != MarketStatus.Resolved) return 0;
        if (bet.amount == 0) return 0;
        if (bet.claimed) return 0;

        bool isWinner = (market.outcome == MarketOutcome.Yes && bet.isYes) ||
                        (market.outcome == MarketOutcome.No && !bet.isYes);
        if (!isWinner) return 0;

        uint256 losingPool = (market.outcome == MarketOutcome.Yes) ? market.noPool : market.yesPool;
        uint256 winPool = (market.outcome == MarketOutcome.Yes) ? market.yesPool : market.noPool;
        uint256 platformFee = losingPool * platformFeeRate / FEE_DENOMINATOR;
        uint256 distributable = losingPool - platformFee;

        return bet.amount + (distributable * bet.amount / winPool);
    }

    // ============================================================
    // 수수료 인출
    // ============================================================

    function withdrawFees() external onlyOwner nonReentrant {
        uint256 amount = accumulatedFees;
        if (amount == 0) return;

        // CEI 패턴
        accumulatedFees = 0;

        (bool success, ) = payable(owner()).call{value: amount}("");
        if (!success) revert TransferFailed();

        emit FeesWithdrawn(owner(), amount);
    }

    // ============================================================
    // F-11: 긴급 마켓 중단
    // ============================================================

    /// @notice Active 상태의 마켓을 즉시 Paused 상태로 전환한다
    function pauseMarket(uint256 _marketId) external onlyOwner {
        Market storage market = markets[_marketId];

        // 마켓 존재 검증
        if (market.id == 0) revert MarketNotFound(_marketId);

        // Active 상태만 Pause 가능
        if (market.status != MarketStatus.Active) {
            revert MarketNotPausable(_marketId, market.status);
        }

        market.status = MarketStatus.Paused;

        emit MarketPaused(_marketId);
    }

    /// @notice Paused 상태의 마켓을 새 마감시간과 함께 Active로 재개한다
    function resumeMarket(
        uint256 _marketId,
        uint256 _newBettingDeadline,
        uint256 _newResolutionDeadline
    ) external onlyOwner {
        Market storage market = markets[_marketId];

        // 마켓 존재 검증
        if (market.id == 0) revert MarketNotFound(_marketId);

        // Paused 상태만 재개 가능
        if (market.status != MarketStatus.Paused) {
            revert MarketNotPaused(_marketId, market.status);
        }

        // 새 마감시간 검증
        if (_newBettingDeadline <= block.timestamp) {
            revert InvalidDeadline(_newBettingDeadline, _newResolutionDeadline);
        }
        if (_newResolutionDeadline <= _newBettingDeadline) {
            revert InvalidDeadline(_newBettingDeadline, _newResolutionDeadline);
        }

        market.status = MarketStatus.Active;
        market.bettingDeadline = _newBettingDeadline;
        market.resolutionDeadline = _newResolutionDeadline;

        emit MarketResumed(_marketId, _newBettingDeadline, _newResolutionDeadline);
    }

    // ============================================================
    // F-12: 설정 관리
    // ============================================================

    /// @notice 최소 베팅 금액을 변경한다 (minBet > 0, minBet < maxBet)
    function setMinBet(uint256 _minBet) external onlyOwner {
        if (_minBet == 0) revert InvalidMinBet(_minBet);
        if (_minBet >= maxBet) revert InvalidMinBet(_minBet);

        uint256 oldValue = minBet;
        minBet = _minBet;

        emit SettingsUpdated("minBet", oldValue, _minBet);
    }

    /// @notice 최대 베팅 금액을 변경한다 (maxBet > minBet)
    function setMaxBet(uint256 _maxBet) external onlyOwner {
        if (_maxBet <= minBet) revert InvalidMaxBet(_maxBet, minBet);

        uint256 oldValue = maxBet;
        maxBet = _maxBet;

        emit SettingsUpdated("maxBet", oldValue, _maxBet);
    }

    /// @notice 플랫폼 수수료율을 변경한다 (feeRate <= 1000, 즉 10%)
    function setPlatformFeeRate(uint256 _feeRate) external onlyOwner {
        if (_feeRate > 1000) revert InvalidFeeRate(_feeRate);

        uint256 oldValue = platformFeeRate;
        platformFeeRate = _feeRate;

        emit SettingsUpdated("platformFeeRate", oldValue, _feeRate);
    }

    // ============================================================
    // F-10: 이의제기 제출
    // ============================================================

    /// @notice 결과 확정 후 이의제기 기간 내에 1,000 META를 스테이킹하여 이의를 제출한다
    function submitDispute(uint256 _marketId) external payable nonReentrant {
        Market storage market = markets[_marketId];

        // 마켓 존재 검증
        if (market.id == 0) revert MarketNotFound(_marketId);

        // Resolved 상태만 허용
        if (market.status != MarketStatus.Resolved) {
            revert MarketNotResolved(_marketId, market.status);
        }

        // 이의제기 기간 내에만 가능
        if (block.timestamp > market.disputeDeadline) {
            revert DisputePeriodEnded(_marketId);
        }

        // 정확히 DISPUTE_STAKE만 허용
        if (msg.value != DISPUTE_STAKE) {
            revert InvalidDisputeStake(msg.value, DISPUTE_STAKE);
        }

        // 해당 마켓에 베팅한 사용자만 가능
        if (bets[_marketId][msg.sender].amount == 0) {
            revert NotBettor(_marketId, msg.sender);
        }

        // 중복 이의 제출 불가
        if (disputes[_marketId][msg.sender].stake > 0) {
            revert AlreadyDisputed(_marketId, msg.sender);
        }

        // 이의 기록 저장
        disputes[_marketId][msg.sender] = Dispute({
            stake: msg.value,
            resolved: false,
            accepted: false
        });

        // 이의 건수 증가
        market.disputeCount++;

        emit DisputeSubmitted(_marketId, msg.sender, msg.value, market.disputeCount);

        // 임계값 체크: disputeCount >= (yesCount + noCount) * DISPUTE_THRESHOLD / FEE_DENOMINATOR
        uint256 totalBettors = market.yesCount + market.noCount;
        uint256 threshold = totalBettors * DISPUTE_THRESHOLD / FEE_DENOMINATOR;

        if (!market.underReview && market.disputeCount >= threshold && threshold > 0) {
            market.underReview = true;
            emit MarketReviewTriggered(_marketId, market.disputeCount, totalBettors);
        }
    }

    // ============================================================
    // F-10: 이의제기 처리 (관리자)
    // ============================================================

    /// @notice 관리자가 개별 이의제기를 인정 또는 기각한다
    function resolveDispute(
        uint256 _marketId,
        address _disputant,
        bool _accepted
    ) external onlyOwner nonReentrant {
        // 마켓 존재 검증
        if (markets[_marketId].id == 0) revert MarketNotFound(_marketId);

        Dispute storage dispute = disputes[_marketId][_disputant];

        // 이의 기록 존재 검증
        if (dispute.stake == 0) revert DisputeNotFound(_marketId, _disputant);

        // 이미 처리된 이의 검증
        if (dispute.resolved) revert DisputeAlreadyResolved(_marketId, _disputant);

        // CEI 패턴: 상태 먼저 변경
        dispute.resolved = true;
        dispute.accepted = _accepted;

        uint256 stakeReturned = 0;

        if (_accepted) {
            // 이의 인정: 스테이킹 금액 반환
            stakeReturned = dispute.stake;
            (bool success, ) = payable(_disputant).call{value: stakeReturned}("");
            if (!success) revert TransferFailed();
        } else {
            // 이의 기각: 스테이킹 금액 몰수 → accumulatedFees에 추가
            accumulatedFees += dispute.stake;
        }

        emit DisputeResolved(_marketId, _disputant, _accepted, stakeReturned);
    }

    // ============================================================
    // F-09: 재심 결과 처리 (관리자)
    // ============================================================

    /// @notice 관리자가 재심 마켓의 결과를 재결정한다
    function resolveReview(
        uint256 _marketId,
        MarketOutcome _newOutcome
    ) external onlyOwner {
        Market storage market = markets[_marketId];

        // 마켓 존재 검증
        if (market.id == 0) revert MarketNotFound(_marketId);

        // underReview 상태만 처리 가능
        if (!market.underReview) revert MarketNotUnderReview(_marketId);

        // Yes, No, Void만 허용
        if (_newOutcome == MarketOutcome.Undecided) revert InvalidOutcome();

        // 재심 상태 해제
        market.underReview = false;
        // 이의제기 기간 종료 (즉시 클레임 가능하도록)
        market.disputeDeadline = 0;

        if (_newOutcome == MarketOutcome.Void) {
            // Void로 변경: 기존 수수료 취소, Voided 상태로 전환
            // 이전에 축적된 수수료에서 해당 마켓 수수료를 차감 (이미 계산된 수수료 되돌리기)
            uint256 oldLosingPool = (market.outcome == MarketOutcome.Yes) ? market.noPool : market.yesPool;
            uint256 oldFee = oldLosingPool * platformFeeRate / FEE_DENOMINATOR;
            if (accumulatedFees >= oldFee) {
                accumulatedFees -= oldFee;
            }
            market.status = MarketStatus.Voided;
            market.outcome = _newOutcome;
        } else if (_newOutcome != market.outcome) {
            // 결과 변경 (Yes <-> No): 수수료 재계산
            uint256 oldLosingPool = (market.outcome == MarketOutcome.Yes) ? market.noPool : market.yesPool;
            uint256 oldFee = oldLosingPool * platformFeeRate / FEE_DENOMINATOR;

            uint256 newLosingPool = (_newOutcome == MarketOutcome.Yes) ? market.noPool : market.yesPool;
            uint256 newFee = newLosingPool * platformFeeRate / FEE_DENOMINATOR;

            // 기존 수수료 제거 후 새 수수료 추가
            if (accumulatedFees >= oldFee) {
                accumulatedFees -= oldFee;
            }
            accumulatedFees += newFee;

            market.outcome = _newOutcome;
        }
        // 결과가 동일한 경우: 원래 결과 유지, underReview만 해제

        emit MarketResolved(_marketId, _newOutcome, accumulatedFees);
    }

    // ============================================================
    // View: 이의제기 조회
    // ============================================================

    function getDispute(uint256 _marketId, address _user) external view returns (Dispute memory) {
        return disputes[_marketId][_user];
    }

    // ============================================================
    // Referral Program
    // ============================================================

    /// @notice 레퍼러를 설정한다 (첫 베팅 전 1회만 가능)
    function setReferrer(address _referrer) external {
        if (_referrer == msg.sender) revert SelfReferral();
        if (referrers[msg.sender] != address(0)) revert ReferrerAlreadySet();
        if (hasPlacedBet[msg.sender]) revert ReferrerAlreadySet();

        referrers[msg.sender] = _referrer;
        emit ReferrerSet(msg.sender, _referrer);
    }

    /// @notice 축적된 레퍼럴 보상을 클레임한다
    function claimReferralReward() external nonReentrant {
        uint256 reward = referralRewards[msg.sender];
        if (reward == 0) revert NoReferralReward();

        referralRewards[msg.sender] = 0;

        (bool success, ) = payable(msg.sender).call{value: reward}("");
        if (!success) revert TransferFailed();

        emit ReferralRewardClaimed(msg.sender, reward);
    }

    /// @notice Owner가 레퍼럴 풀에 META를 충전한다
    function fundReferralPool() external payable onlyOwner {
        referralPool += msg.value;
        emit ReferralPoolFunded(msg.value, referralPool);
    }

    /// @notice 레퍼럴 보상 금액을 변경한다
    function setReferralRewardAmount(uint256 _amount) external onlyOwner {
        referralRewardAmount = _amount;
    }
}
