pragma solidity ^0.8.4 || ^0.7.6 || ^0.8.0;

import "@uniswap/lib/contracts/libraries/TransferHelper.sol";
import "../interfaces/IUniswapV2Router02.sol";
import "../interfaces/IWETH.sol";

import "../core/IndexSwapLibrary.sol";
import "./IndexSwap.sol";

contract IndexManager {
    IUniswapV2Router02 public pancakeSwapRouter;

    constructor(address _pancakeSwapAddress) {
        pancakeSwapRouter = IUniswapV2Router02(_pancakeSwapAddress);
    }

    /**
     * @return Returns the address of the base token (WETH, WBNB, ...)
     */
    function getETH() public view returns (address) {
        return pancakeSwapRouter.WETH();
    }

    /**
     * @notice Transfer tokens from vault to a specific address
     */
    function _pullFromVault(
        IndexSwap _index,
        address t,
        uint256 amount,
        address to
    ) public {
        TransferHelper.safeTransferFrom(t, _index.getVault(), to, amount);
    }

    /**
     * @notice The function swaps ETH to a specific token
     * @param t The token being swapped to the specific token
     * @param swapAmount The amount being swapped
     * @param to The address where the token is being send to after swapping
     * @return swapResult The outcome amount of the specific token afer swapping
     */
    function _swapETHToToken(
        address t,
        uint256 swapAmount,
        address to
    ) public payable returns (uint256 swapResult) {
        if (t == getETH()) {
            IWETH(t).deposit{value: swapAmount}();
            swapResult = swapAmount;
            if (to != address(this)) {
                IWETH(t).transfer(to, swapAmount);
            }
        } else {
            swapResult = pancakeSwapRouter.swapExactETHForTokens{
                value: swapAmount
            }(
                0,
                getPathForETH(t),
                to,
                block.timestamp // using 'now' for convenience, for mainnet pass deadline from frontend!
            )[1];
        }
    }

    /**
     * @notice The function swaps a specific token to ETH
     * @param t The token being swapped to ETH
     * @param swapAmount The amount being swapped
     * @param to The address where ETH is being send to after swapping
     * @return swapResult The outcome amount in ETH afer swapping
     */
    function _swapTokenToETH(
        address t,
        uint256 swapAmount,
        address to
    ) public returns (uint256 swapResult) {
        TransferHelper.safeApprove(t, address(pancakeSwapRouter), swapAmount);
        swapResult = pancakeSwapRouter.swapExactTokensForETH(
            swapAmount,
            0,
            getPathForToken(t),
            to,
            block.timestamp
        )[1];
    }

    /**
     * @notice The function sets the path (ETH, token) for a token
     * @return Path for (ETH, token)
     */
    function getPathForETH(address crypto)
        public
        view
        returns (address[] memory)
    {
        address[] memory path = new address[](2);
        path[0] = getETH();
        path[1] = crypto;

        return path;
    }

    /**
     * @notice The function sets the path (token, ETH) for a token
     * @return Path for (token, ETH)
     */
    function getPathForToken(address token)
        public
        view
        returns (address[] memory)
    {
        address[] memory path = new address[](2);
        path[0] = token;
        path[1] = getETH();

        return path;
    }
}