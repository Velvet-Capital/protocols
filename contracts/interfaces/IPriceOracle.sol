// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.4;

interface IPriceOracle {
    function initialize(address _uniSwapRouter) external;

    function initPair(address _pair) external;

    function update(address _pair) external;

    function getTokenPrice(
        address _token0,
        address _token1,
        uint256 amountIn
    ) external view returns (uint224 amountOut);

    function getBlockTimestamp() external view returns (uint32);
}
