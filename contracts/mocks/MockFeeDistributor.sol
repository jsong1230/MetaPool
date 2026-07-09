// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @notice 테스트용 FeeDistributor mock — MetaStake의 depositFee/receive 시그니처 재현
contract MockFeeDistributor {
    uint256 public totalReceived;
    uint256 public depositCalls;

    function depositFee() external payable {
        totalReceived += msg.value;
        depositCalls += 1;
    }

    receive() external payable {
        totalReceived += msg.value;
    }
}
