// SPDX-License-Identifier: MIT

/**
 * @title IndexManager for a particular Index
 * @author Velvet.Capital
 * @notice This contract is used for transferring funds form vault to contract and vice versa 
           and swap tokens to and fro from BNB
 * @dev This contract includes functionalities:
 *      1. Deposit tokens to vault
 *      2. Withdraw tokens from vault
 *      3. Swap BNB for tokens
 *      4. Swap tokens for BNB
 */

pragma solidity ^0.8.4;
import "./IIndexSwap.sol";

interface IAdapter{
    function init(
        address _accessController,
        address _pancakeSwapAddress,
        address _velvetSafeModule,
        address _tokenMetadata
    ) external;

    /**
     * @return Returns the address of the base token (WETH, WBNB, ...)
     */
    function getETH() external view returns (address);

    function _pullFromVault(
        IIndexSwap _index,
        address t,
        uint256 amount,
        address to
    ) external;


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
    ) external payable  returns (uint256 swapResult) ;
 
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
    ) external  returns (uint256 swapResult);
   

    function redeemToken(
        address _vAsset,
        address _underlying,
        uint256 _amount,
        address _to
    ) external;
  
    function redeemBNB(
        address _vAsset,
        uint256 _amount,
        address _to
    ) external;

    /**
     * @notice The function sets the path (ETH, token) for a token
     * @return Path for (ETH, token)
     */
    function getPathForETH(address crypto)
        external
        view
        returns (address[] memory);

    /**
     * @notice The function sets the path (token, ETH) for a token
     * @return Path for (token, ETH)
     */
    function getPathForToken(address token)
        external
        view
        returns (address[] memory);

}
