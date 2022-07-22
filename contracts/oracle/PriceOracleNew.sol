pragma solidity ^0.8.4;

import "../interfaces/IUniswapV2Pair.sol";
import "../interfaces/IPriceOracle.sol";
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
    uint256 public constant PERIOD = 10;

    mapping(address => PriceInformation) pairInformation;

    function getPrice0Avg(address pair) public view returns (uint224 amount) {
        amount = pairInformation[pair].price0Average.decode();
    }

    function getPrice1Avg(address pair) public view returns (uint224 amount) {
        amount = pairInformation[pair].price1Average.decode();
    }

    function getPriceCumm(address pair) public view returns (uint256 amount) {
        amount = pairInformation[pair].price0CumulativeLast;
    }

    function getPrice1Cumm(address pair) public view returns (uint256 amount) {
        amount = pairInformation[pair].price1CumulativeLast;
    }

    function getDecimal(address tokenAddress) external view returns (uint256) {
        return IERC20Metadata(tokenAddress).decimals();
    }

    function getPair(address t1, address t2)
        public
        view
        returns (address pair)
    {
        IUniswapV2Factory factory = IUniswapV2Factory(
            0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73
        );
        pair = factory.getPair(t1, t2);
    }

    function initPair(address _pair) public {
        IUniswapV2Pair pair = IUniswapV2Pair(_pair);

        uint32 lastTimeStamp;
        (, , lastTimeStamp) = pair.getReserves();

        (
            uint256 price0Cumulative,
            uint256 price1Cumulative,

        ) = UniswapV2OracleLibrary.currentCumulativePrices(_pair);

        uint32 timeElapsed = getBlockTimestamp() - lastTimeStamp;

        PriceInformation memory priceInformation = PriceInformation({
            token0: pair.token0(),
            token1: pair.token1(),
            price0CumulativeLast: pair.price0CumulativeLast(),
            price1CumulativeLast: pair.price1CumulativeLast(),
            blockTimestampLast: lastTimeStamp,
            price0Average: FixedPoint.uq112x112(
                uint224(
                    (price0Cumulative -
                        pair.price0CumulativeLast() /
                        timeElapsed)
                )
            ),
            price1Average: FixedPoint.uq112x112(
                uint224(
                    (price1Cumulative -
                        pair.price1CumulativeLast() /
                        timeElapsed)
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
                (price1Cumulative -
                    pairInformation[_pair].price1CumulativeLast) / timeElapsed
            )
        );

        pairInformation[_pair].price0CumulativeLast = price0Cumulative;
        pairInformation[_pair].price1CumulativeLast = price1Cumulative;
        pairInformation[_pair].blockTimestampLast = blockTimestamp;
    }

    /**
     * @notice Returns the amount of _token1 for the input amount of _token0
     * @param _token0 address of input BEP20 token contract
     * @param _token1 address of output BEP20 token contract
     * @param amountIn amount of token0
     */
    function getTokenPrice(
        address _token0,
        address _token1,
        uint256 amountIn
    ) external view returns (uint224 amountOut) {
        address pair = getPair(_token0, _token1);
        require(
            _token0 == pairInformation[pair].token0 ||
                _token0 == pairInformation[pair].token1,
            "invalid token"
        );

        if (_token0 == pairInformation[pair].token0) {
            amountOut = pairInformation[pair]
                .price0Average
                .mul(amountIn)
                .decode144();
        } else {
            amountOut = pairInformation[pair]
                .price1Average
                .mul(amountIn)
                .decode144();
        }
    }

    function getBlockTimestamp() public view returns (uint32) {
        return uint32(block.timestamp % 2**32);
    }
}
