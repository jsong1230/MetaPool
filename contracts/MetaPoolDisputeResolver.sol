// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/// @notice MetaPool(v2)에서 어댑터가 호출하는 이의/재심 처리 함수
interface IMetaPool {
    enum MarketOutcome { Undecided, Yes, No, Void }

    function resolveDispute(uint256 marketId, address disputant, bool accepted) external;
    function resolveReview(uint256 marketId, MarketOutcome newOutcome) external;
}

/// @notice MetaStake OperatorRegistry의 operator 조회
interface IOperatorRegistry {
    function getOperator(uint256 serviceId, address operator)
        external
        view
        returns (uint256 stake, uint256 unstakeRequestTime, bool active);

    function operatorCount(uint256 serviceId) external view returns (uint256);
}

/// @title MetaPoolDisputeResolver — C1 통합 어댑터
/// @notice MetaPool의 이의제기(F-10)/재심(F-09)을 MetaStake OperatorRegistry의
///         active operator들이 단순 majority(m-of-n) 투표로 판정한다.
///         operator는 열거 불가하므로 각자 tx를 제출하는 pull 방식이며,
///         전체 active operator 수의 과반(2*votes > operatorCount)이 모이면
///         자동으로 MetaPool에 결과를 반영한다.
contract MetaPoolDisputeResolver is Ownable {
    // ── Immutable 설정 ────────────────────────────────────────────────────
    IMetaPool public immutable metaPool;
    IOperatorRegistry public immutable registry;
    uint256 public immutable serviceId;

    // ── 이의(F-10) 투표: key = keccak256(marketId, disputant) ──────────────
    struct DisputeTally {
        uint128 acceptVotes;
        uint128 rejectVotes;
        bool executed;
    }
    mapping(bytes32 => DisputeTally) public disputeTally;
    mapping(bytes32 => mapping(address => bool)) public disputeVoted;

    // ── 재심(F-09) 투표: marketId → outcome → 표수 ────────────────────────
    mapping(uint256 => mapping(uint8 => uint256)) public reviewVotes;
    mapping(uint256 => mapping(address => bool)) public reviewVoted;
    mapping(uint256 => bool) public reviewExecuted;

    // ── Events ────────────────────────────────────────────────────────────
    event DisputeVoteCast(uint256 indexed marketId, address indexed disputant, address indexed operator, bool accept);
    event DisputeExecuted(uint256 indexed marketId, address indexed disputant, bool accepted);
    event ReviewVoteCast(uint256 indexed marketId, address indexed operator, IMetaPool.MarketOutcome outcome);
    event ReviewExecuted(uint256 indexed marketId, IMetaPool.MarketOutcome outcome);

    // ── Errors ────────────────────────────────────────────────────────────
    error NotActiveOperator(address caller);
    error AlreadyVoted();
    error AlreadyExecuted();
    error InvalidOutcome();
    error NoOperators();

    constructor(
        address _initialOwner,
        address _metaPool,
        address _registry,
        uint256 _serviceId
    ) Ownable(_initialOwner) {
        require(_metaPool != address(0) && _registry != address(0), "zero addr");
        metaPool = IMetaPool(_metaPool);
        registry = IOperatorRegistry(_registry);
        serviceId = _serviceId;
    }

    // ── Modifiers ─────────────────────────────────────────────────────────

    modifier onlyOperator() {
        (, , bool active) = registry.getOperator(serviceId, msg.sender);
        if (!active) revert NotActiveOperator(msg.sender);
        _;
    }

    // ── Views ─────────────────────────────────────────────────────────────

    /// @notice 현재 active operator 수
    function operatorCount() public view returns (uint256) {
        return registry.operatorCount(serviceId);
    }

    /// @notice 과반 판정: 2 * votes > 전체 operator 수
    function _isMajority(uint256 votes, uint256 total) internal pure returns (bool) {
        return total > 0 && (2 * votes) > total;
    }

    function _disputeKey(uint256 marketId, address disputant) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(marketId, disputant));
    }

    // ── F-10: 개별 이의 투표 ──────────────────────────────────────────────

    /// @notice operator가 특정 이의(marketId, disputant)에 대해 인정/기각 투표.
    ///         과반 도달 시 MetaPool.resolveDispute 자동 호출.
    function voteDispute(uint256 marketId, address disputant, bool accept) external onlyOperator {
        bytes32 k = _disputeKey(marketId, disputant);
        DisputeTally storage t = disputeTally[k];
        if (t.executed) revert AlreadyExecuted();
        if (disputeVoted[k][msg.sender]) revert AlreadyVoted();

        disputeVoted[k][msg.sender] = true;
        if (accept) {
            t.acceptVotes += 1;
        } else {
            t.rejectVotes += 1;
        }
        emit DisputeVoteCast(marketId, disputant, msg.sender, accept);

        uint256 total = operatorCount();
        if (_isMajority(t.acceptVotes, total)) {
            t.executed = true;
            metaPool.resolveDispute(marketId, disputant, true);
            emit DisputeExecuted(marketId, disputant, true);
        } else if (_isMajority(t.rejectVotes, total)) {
            t.executed = true;
            metaPool.resolveDispute(marketId, disputant, false);
            emit DisputeExecuted(marketId, disputant, false);
        }
    }

    // ── F-09: 재심 결과 투표 ──────────────────────────────────────────────

    /// @notice operator가 재심 마켓의 새 결과(Yes/No/Void)에 투표.
    ///         특정 outcome이 과반 도달 시 MetaPool.resolveReview 자동 호출.
    function voteReview(uint256 marketId, IMetaPool.MarketOutcome outcome) external onlyOperator {
        if (outcome == IMetaPool.MarketOutcome.Undecided) revert InvalidOutcome();
        if (reviewExecuted[marketId]) revert AlreadyExecuted();
        if (reviewVoted[marketId][msg.sender]) revert AlreadyVoted();

        reviewVoted[marketId][msg.sender] = true;
        uint256 c = ++reviewVotes[marketId][uint8(outcome)];
        emit ReviewVoteCast(marketId, msg.sender, outcome);

        if (_isMajority(c, operatorCount())) {
            reviewExecuted[marketId] = true;
            metaPool.resolveReview(marketId, outcome);
            emit ReviewExecuted(marketId, outcome);
        }
    }
}
