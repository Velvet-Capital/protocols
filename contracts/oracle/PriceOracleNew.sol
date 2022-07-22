pragma solidity ^0.8.4;

import "../interfaces/IUniswapV2Pair.sol";
import "../interfaces/IPriceOracle.sol";
import "../interfaces/IUniswapV2Router02.sol";
import "../interfaces/IUniswapV2Factory.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

import "../lib/FixedPoint.sol";
import "../lib/UniswapV2OracleLibrary.sol";

contract PriceOracleNew {
    //using FixedPoint for *;
    using FixedPoint for *;

    struct PriceInformation {
        address token0;
        address token1;
        uint256 price0CumulativeLast;
        uint256 price1CumulativeLast;
        uint32 blockTimestampLast;
        FixedPoint.uq112x112 price0Average;
        FixedPoint.uq112x112 price1Average;
    }

    // Time until next update
    uint256 public constant PERIOD = 1 hours;

    mapping(address => PriceInformation) pairInformation;

    IUniswapV2Router02 public uniswapV2Router;

    function initialize(address _uniSwapRouter) external {
        IUniswapV2Router02 _uniswapV2Router = IUniswapV2Router02(
            _uniSwapRouter
        );
        uniswapV2Router = _uniswapV2Router;
    }

    function initPair(address _pair) public {
        IUniswapV2Pair pair = IUniswapV2Pair(_pair);

        PriceInformation memory priceInformation = PriceInformation({
            token0: pair.token0(),
            token1: pair.token1(),
            price0CumulativeLast: pair.price0CumulativeLast(),
            price1CumulativeLast: pair.price1CumulativeLast(),
            blockTimestampLast: uint32(block.timestamp),
            price0Average: FixedPoint.uq112x112(
                uint224(
                    (pair.price0CumulativeLast() -
                        pair.price0CumulativeLast()) / 1
                )
            ),
            price1Average: FixedPoint.uq112x112(
                uint224(
                    (pair.price1CumulativeLast() -
                        pair.price1CumulativeLast()) / 1
                )
            )
        });

        pairInformation[_pair] = priceInformation;
    }

    function update(address _pair) external {
        (
            uint256 price0Cumulative,
            uint256 price1Cumulative,
            uint32 blockTimestamp
        ) = UniswapV2OracleLibrary.currentCumulativePrices(_pair);

        uint32 timeElapsed = blockTimestamp -
            pairInformation[_pair].blockTimestampLast;

        // ensure that at least one full period has passed since the last update
        require(
            timeElapsed >= PERIOD,
            "ExampleOracleSimple: PERIOD_NOT_ELAPSED"
        );

        pairInformation[_pair].price0Average = FixedPoint.uq112x112(
            uint224(
                (price0Cumulative -
                    pairInformation[_pair].price0CumulativeLast) / timeElapsed
            )
        );
        pairInformation[_pair].price1Average = FixedPoint.uq112x112(
            uint224(
                (price0Cumulative -
                    pairInformation[_pair].price1CumulativeLast) / timeElapsed
            )
        );

        pairInformation[_pair].price0CumulativeLast = price0Cumulative;
        pairInformation[_pair].price1CumulativeLast = price1Cumulative;
        pairInformation[_pair].blockTimestampLast = blockTimestamp;
    }

    /**
     * @notice Returns the USD price for a particular BEP20 token.
     * @param token_address address of BEP20 token contract
     * @param token1_address address of USDT token contract
     */
    function getTokenPrice(
        address token_address,
        address token1_address,
        address _pair,
        uint256 amountIn
    ) external view returns (uint224 amountOut) {
        require(
            token_address == pairInformation[_pair].token0 ||
                token_address == pairInformation[_pair].token1,
            "invalid token"
        );

        if (token_address == pairInformation[_pair].token0) {
            amountOut = pairInformation[_pair]
                .price0Average
                .mul(amountIn)
                .decode144();
        } else {
            amountOut = pairInformation[_pair]
                .price1Average
                .mul(amountIn)
                .decode144();
        }

        if (token_address == pairInformation[_pair].token0) {
            amountOut = pairInformation[_pair]
                .price0Average
                .mul(amountIn)
                .decode144();
        } else {
            amountOut = pairInformation[_pair]
                .price1Average
                .mul(amountIn)
                .decode144();
        }
    }

    function getBlockTimestamp() public view returns (uint32) {
        return uint32(block.timestamp % 2**32);
    }
}
