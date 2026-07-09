// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @notice 테스트용 OperatorRegistry mock — MetaStake의 getOperator/operatorCount 시그니처만 재현
contract MockOperatorRegistry {
    mapping(uint256 => mapping(address => bool)) public isActive;
    mapping(uint256 => uint256) public operatorCount;

    function setOperator(uint256 serviceId, address op, bool active) external {
        bool was = isActive[serviceId][op];
        if (active && !was) operatorCount[serviceId] += 1;
        if (!active && was) operatorCount[serviceId] -= 1;
        isActive[serviceId][op] = active;
    }

    function getOperator(uint256 serviceId, address op)
        external
        view
        returns (uint256 stake, uint256 unstakeRequestTime, bool active)
    {
        active = isActive[serviceId][op];
        stake = active ? 1 ether : 0;
        unstakeRequestTime = 0;
    }
}
