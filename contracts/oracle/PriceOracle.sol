// SPDX-License-Identifier: UNLICENSED

/**
 * @title PriceOracle
 * @author Velvet.Capital
 * @notice This contract is used for getting live prices of particular token and token pair 
 * @dev This contract includes functionalities:
 *      1. Get live prices for a particular pair
 *      2. Get pair address for the particular token
 */

pragma solidity ^0.8.4;

import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

import "../interfaces/IUniswapV2Pair.sol";
import "../interfaces/IPriceOracle.sol";
import "../interfaces/IUniswapV2Router02.sol";
import "../interfaces/IUniswapV2Factory.sol";

contract PriceOracle is IPriceOracle {
    using SafeMath for uint256;

    IUniswapV2Router02 public uniswapV2Router;

    function initialize(address _uniSwapRouter) external override {
        IUniswapV2Router02 _uniswapV2Router = IUniswapV2Router02(
            _uniSwapRouter
        );
        uniswapV2Router = _uniswapV2Router;
    }

    function getPairAddress(address _assetOne, address _assetTwo)
        public
        view
        returns (address)
    {
        address pair = IUniswapV2Factory(uniswapV2Router.factory()).getPair(
            _assetOne,
            _assetTwo
        );
        return pair;
    }

    /**
     * @notice Fetches and sorts the reserves for a pair.
     * @param tokenA Address of tokenA contract
     * @param tokenB Address of tokenB contract
     */

    function getReserves(address tokenA, address tokenB)
        internal
        view
        returns (uint256 reserveA, uint256 reserveB)
    {
        address pair = getPairAddress(tokenA, tokenB);
        (uint256 reserve0, uint256 reserve1, ) = IUniswapV2Pair(pair)
            .getReserves();

        (address token0, ) = sortTokens(tokenA, tokenB);
        (reserveA, reserveB) = tokenA == token0
            ? (reserve0, reserve1)
            : (reserve1, reserve0);
    }

    /**
     * @notice Returns sorted token addresses, used to handle return values from pairs sorted in this order.
     * @param tokenA Address of tokenA contract
     * @param tokenB Address of tokenB contract
     */

    function sortTokens(address tokenA, address tokenB)
        internal
        pure
        returns (address token0, address token1)
    {
        require(tokenA != tokenB, "PancakeLibrary: IDENTICAL_ADDRESSES");
        (token0, token1) = tokenA < tokenB
            ? (tokenA, tokenB)
            : (tokenB, tokenA);
        require(token0 != address(0), "PancakeLibrary: ZERO_ADDRESS");
    }

    function getDecimal(address tokenAddress)
        external
        view
        override
        returns (uint256)
    {
        return IERC20Metadata(tokenAddress).decimals();
    }

    /**

     * @notice Returns the USD price for a particular BEP20 token.
     * @param token_address address of BEP20 token contract
     * @param token1_address address of USDT token contract
     */
    function getTokenPrice(address token_address, address token1_address)
        external
        view
        override
        returns (uint256 price)
    {
        uint256 token_decimals = IERC20Metadata(token_address).decimals();
        uint256 min_amountIn = 1 * 10**token_decimals;
        if (token_address == token1_address) {
            price = min_amountIn;
        } else {
            (uint256 reserve0, uint256 reserve1) = getReserves(
                token_address,
                token1_address
            );
            price = uniswapV2Router.getAmountOut(
                min_amountIn,
                reserve0,
                reserve1
            );
        }
    }
}
