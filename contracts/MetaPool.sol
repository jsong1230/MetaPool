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

    // ============================================================
    // State Variables
    // ============================================================

    mapping(uint256 => Market) public markets;
    mapping(uint256 => mapping(address => Bet)) public bets;

    uint256 public marketCount;
    uint256 public minBet;
    uint256 public maxBet;
    uint256 public platformFeeRate;
    uint256 public constant FEE_DENOMINATOR = 10000;
    uint256 public accumulatedFees;

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
            // Void 확정: 상태 Voided로 전환, 수수료 없음
            market.status = MarketStatus.Voided;
        } else {
            // Yes/No 확정: 패배 풀에서 수수료 계산
            uint256 losingPool = (_outcome == MarketOutcome.Yes) ? market.noPool : market.yesPool;
            platformFee = losingPool * platformFeeRate / FEE_DENOMINATOR;
            accumulatedFees += platformFee;
            market.status = MarketStatus.Resolved;
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
    }
}
