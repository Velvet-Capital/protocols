// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4 || ^0.7.6 || ^0.8.0;

import "@uniswap/lib/contracts/libraries/TransferHelper.sol";
import "../interfaces/IUniswapV2Router02.sol";
import "../interfaces/IWETH.sol";

import "../core/IndexSwapLibrary.sol";
import "./IndexSwap.sol";
import "../access/AccessController.sol";
import "../vault/VelvetSafeModule.sol";
import "../venus/VBep20Interface.sol";
import "../venus/IVBNB.sol";
import "../venus/TokenMetadata.sol";

contract Adapter {
    IUniswapV2Router02 public pancakeSwapRouter;
    AccessController public accessController;
    VelvetSafeModule internal gnosisSafe;
    TokenMetadata public tokenMetadata;

    constructor(
        AccessController _accessController,
        address _pancakeSwapAddress,
        VelvetSafeModule _myModule,
        TokenMetadata _tokenMetadata
    ) {
        pancakeSwapRouter = IUniswapV2Router02(_pancakeSwapAddress);
        accessController = _accessController;
        gnosisSafe = _myModule;
        tokenMetadata = _tokenMetadata;
    }

    /**
     * @return Returns the address of the base token (WETH, WBNB, ...)
     */
    function getETH() public view returns (address) {
        return pancakeSwapRouter.WETH();
    }

    modifier onlyIndexManager() {
        require(
            accessController.isIndexManager(msg.sender),
            "Caller is not an Index Manager"
        );
        _;
    }

    /**
     * @notice Transfer tokens from vault to a specific address
     */
    function _pullFromVault(
        IndexSwap _index,
        address t,
        uint256 amount,
        address to
    ) public onlyIndexManager {
        if (tokenMetadata.vTokens(t) != address(0)) {
            if (address(gnosisSafe) != address(0)) {
                gnosisSafe.executeTransactionOther(
                    to,
                    amount,
                    tokenMetadata.vTokens(t)
                );
            } else {
                TransferHelper.safeTransferFrom(t, _index.vault(), to, amount);
            }
        } else {
            if (address(gnosisSafe) != address(0)) {
                gnosisSafe.executeTransactionOther(to, amount, t);
            } else {
                TransferHelper.safeTransferFrom(t, _index.vault(), to, amount);
            }
        }
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
    ) public payable onlyIndexManager returns (uint256 swapResult) {
        if (t == getETH()) {
            if (tokenMetadata.vTokens(t) != address(0)) {
                lendBNB(t, tokenMetadata.vTokens(t), swapResult, to);
            } else {
                IWETH(t).deposit{value: swapAmount}();
                swapResult = swapAmount;

                if (to != address(this)) {
                    IWETH(t).transfer(to, swapAmount);
                }
            }
        } else {
            if (tokenMetadata.vTokens(t) != address(0)) {
                swapResult = pancakeSwapRouter.swapExactETHForTokens{
                    value: swapAmount
                }(
                    0,
                    getPathForETH(t),
                    address(this),
                    block.timestamp // using 'now' for convenience, for mainnet pass deadline from frontend!
                )[1];
                lendToken(t, tokenMetadata.vTokens(t), swapResult, to);
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
    }

    /**
     * @notice The function swaps a specific token to ETH
     * @dev Requires the tokens to be send to this contract address before swapping
     * @param t The token being swapped to ETH
     * @param swapAmount The amount being swapped
     * @param to The address where ETH is being send to after swapping
     * @return swapResult The outcome amount in ETH afer swapping
     */
    function _swapTokenToETH(
        address t,
        uint256 swapAmount,
        address to
    ) public onlyIndexManager returns (uint256 swapResult) {
        if (tokenMetadata.vTokens(t) != address(0)) {
            if (t == getETH()) {
                redeemBNB(tokenMetadata.vTokens(t), swapAmount);
                swapResult = address(this).balance;
                payable(to).transfer(swapResult);
            } else {
                redeemToken(tokenMetadata.vTokens(t), swapAmount);
                IERC20 token = IERC20(t);
                uint256 amount = token.balanceOf(address(this));
                require(amount > 0, "zero balance amount");

                TransferHelper.safeApprove(
                    t,
                    address(pancakeSwapRouter),
                    amount
                );
                swapResult = pancakeSwapRouter.swapExactTokensForETH(
                    amount,
                    0,
                    getPathForToken(t),
                    to,
                    block.timestamp
                )[1];
            }
        } else {
            TransferHelper.safeApprove(
                t,
                address(pancakeSwapRouter),
                swapAmount
            );
            if (t == getETH()) {
                IWETH(t).withdraw(swapAmount);
                payable(to).transfer(swapAmount);
                swapResult = swapAmount;
            } else {
                swapResult = pancakeSwapRouter.swapExactTokensForETH(
                    swapAmount,
                    0,
                    getPathForToken(t),
                    to,
                    block.timestamp
                )[1];
            }
        }
    }

    // VENUS
    function lendToken(
        address _underlyingAsset,
        address _vAsset,
        uint256 _amount,
        address _to
    ) internal {
        IERC20 underlyingToken = IERC20(_underlyingAsset);
        VBep20Interface vToken = VBep20Interface(_vAsset);

        underlyingToken.approve(address(vToken), _amount);
        assert(vToken.mint(_amount) == 0);
        uint256 vBalance = vToken.balanceOf(address(this));
        TransferHelper.safeTransfer(_vAsset, _to, vBalance);
    }

    function lendBNB(
        address _underlyingAsset,
        address _vAsset,
        uint256 _amount,
        address _to
    ) internal {
        IERC20 underlyingToken = IERC20(_underlyingAsset);
        IVBNB vToken = IVBNB(_vAsset);

        underlyingToken.approve(address(vToken), _amount);
        vToken.mint{value: _amount}();
        uint256 vBalance = vToken.balanceOf(address(this));
        TransferHelper.safeTransfer(_vAsset, _to, vBalance);
    }

    function redeemToken(address _vAsset, uint256 _amount)
        public
        onlyIndexManager
    {
        VBep20Interface vToken = VBep20Interface(_vAsset);

        require(
            _amount <= vToken.balanceOf(address(this)),
            "not enough balance in venus protocol"
        );
        require(vToken.redeem(_amount) == 0, "redeeming vToken failed");
    }

    function redeemBNB(address _vAsset, uint256 _amount)
        public
        onlyIndexManager
    {
        IVBNB vToken = IVBNB(_vAsset);

        require(
            _amount <= vToken.balanceOf(address(this)),
            "not enough balance in venus protocol"
        );
        require(vToken.redeem(_amount) == 0, "redeeming vToken failed");
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

    // important to receive ETH
    receive() external payable {}
}
