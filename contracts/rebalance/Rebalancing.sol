// SPDX-License-Identifier: MIT

/**
 * @title Rebalancing for a particular Index
 * @author Velvet.Capital
 * @notice This contract is used by asset manager to update weights, update tokens and call pause function. It also
 *         includes the feeModule logic.
 * @dev This contract includes functionalities:
 *      1. Pause the IndexSwap contract
 *      2. Update the token list
 *      3. Update the token weight
 *      4. Update the treasury address
 */

pragma solidity 0.8.6;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

import "../core/IndexSwapLibrary.sol";
import "../core/Adapter.sol";
import "../core/IndexSwap.sol";
import "../access/AccessController.sol";
import "../venus/IVBNB.sol";
import "../venus/VBep20Interface.sol";
import "../venus/TokenMetadata.sol";

contract Rebalancing is ReentrancyGuard {
    bytes32 public constant ASSET_MANAGER_ROLE =
        keccak256("ASSET_MANAGER_ROLE");

    IndexSwapLibrary public indexSwapLibrary;
    Adapter public adapter;

    AccessController public accessController;
    TokenMetadata public tokenMetadata;

    using SafeMath for uint256;

    constructor(
        IndexSwapLibrary _indexSwapLibrary,
        Adapter _adapter,
        AccessController _accessController,
        TokenMetadata _tokenMetadata
    ) {
        indexSwapLibrary = _indexSwapLibrary;
        adapter = _adapter;
        accessController = _accessController;
        tokenMetadata = _tokenMetadata;

        // OpenZeppelin Access Control
        accessController.setupRole(keccak256("DEFAULT_ADMIN_ROLE"), msg.sender);
        accessController.setRoleAdmin(
            keccak256("ASSET_MANAGER_ROLE"),
            keccak256("DEFAULT_ADMIN_ROLE")
        );
        accessController.setupRole(keccak256("ASSET_MANAGER_ROLE"), msg.sender);

        accessController.setRoleAdmin(
            keccak256("INDEX_MANAGER_ROLE"),
            keccak256("DEFAULT_ADMIN_ROLE")
        );
        accessController.setupRole(
            keccak256("INDEX_MANAGER_ROLE"),
            address(this)
        );

        accessController.setupRole(
            keccak256("REBALANCER_CONTRACT"),
            address(this)
        );
    }

    modifier onlyAssetManager() {
        require(
            accessController.isAssetManager(msg.sender),
            "Caller is not an Asset Manager"
        );
        _;
    }

    /**
    @notice The function will pause the InvestInFund() and Withdrawal().
    @param _index The portfolio address whose functions need to paused.
    @param _state The state is bool value which needs to input by the Index Manager.
    */
    function setPause(IndexSwap _index, bool _state) public onlyAssetManager {
        _index.setPaused(_state);
    }

    /**
     * @notice The function sells the excessive token amount of each token considering the new weights
     * @param _oldWeights The current token allocation in the portfolio
     * @param _newWeights The new token allocation the portfolio should be rebalanced to
     * @return sumWeightsToSwap Returns the weight of tokens that have to be swapped to rebalance the portfolio (buy)
     */
    function sellTokens(
        IndexSwap _index,
        uint256[] memory _oldWeights,
        uint256[] memory _newWeights
    ) internal returns (uint256 sumWeightsToSwap) {
        // sell - swap to BNB
        for (uint256 i = 0; i < _index.getTokens().length; i++) {
            if (_newWeights[i] < _oldWeights[i]) {
                uint256 tokenBalance = indexSwapLibrary.getTokenBalance(
                    _index,
                    _index.getTokens()[i],
                    adapter.getETH() == _index.getTokens()[i]
                );

                uint256 weightDiff = _oldWeights[i].sub(_newWeights[i]);
                uint256 swapAmount = tokenBalance.mul(weightDiff).div(
                    _oldWeights[i]
                );

                if (_index.getTokens()[i] == adapter.getETH()) {
                    adapter._pullFromVault(
                        _index,
                        _index.getTokens()[i],
                        swapAmount,
                        address(this)
                    );

                    if (
                        tokenMetadata.vTokens(_index.getTokens()[i]) !=
                        address(0)
                    ) {
                        adapter.redeemBNB(
                            tokenMetadata.vTokens(_index.getTokens()[i]),
                            swapAmount
                        );
                    }

                    IWETH(_index.getTokens()[i]).withdraw(swapAmount);
                } else {
                    adapter._pullFromVault(
                        _index,
                        _index.getTokens()[i],
                        swapAmount,
                        address(adapter)
                    );
                    adapter._swapTokenToETH(
                        _index.getTokens()[i],
                        swapAmount,
                        address(this)
                    );
                }
            } else if (_newWeights[i] > _oldWeights[i]) {
                uint256 diff = _newWeights[i].sub(_oldWeights[i]);
                sumWeightsToSwap = sumWeightsToSwap.add(diff);
            }
        }
    }

    /**
     * @notice The function swaps the sold BNB into tokens that haven't reached the new weight
     * @param _oldWeights The current token allocation in the portfolio
     * @param _newWeights The new token allocation the portfolio should be rebalanced to
     */
    function buyTokens(
        IndexSwap _index,
        uint256[] memory _oldWeights,
        uint256[] memory _newWeights,
        uint256 sumWeightsToSwap
    ) internal {
        uint256 totalBNBAmount = address(this).balance;
        for (uint256 i = 0; i < _index.getTokens().length; i++) {
            if (_newWeights[i] > _oldWeights[i]) {
                uint256 weightToSwap = _newWeights[i].sub(_oldWeights[i]);
                require(weightToSwap > 0, "weight not greater than 0");
                require(sumWeightsToSwap > 0, "div by 0, sumweight");
                uint256 swapAmount = totalBNBAmount.mul(weightToSwap).div(
                    sumWeightsToSwap
                );

                adapter._swapETHToToken{value: swapAmount}(
                    _index.getTokens()[i],
                    swapAmount,
                    _index.vault()
                );
            }
        }
    }

    /**
     * @notice The function rebalances the token weights in the portfolio
     */
    function rebalance(IndexSwap _index) public onlyAssetManager nonReentrant {
        require(_index.totalSupply() > 0);

        uint256 vaultBalance = 0;

        uint256[] memory newWeights = new uint256[](_index.getTokens().length);
        uint256[] memory oldWeights = new uint256[](_index.getTokens().length);
        uint256[] memory tokenBalanceInBNB = new uint256[](
            _index.getTokens().length
        );

        (tokenBalanceInBNB, vaultBalance) = indexSwapLibrary
            .getTokenAndVaultBalance(_index);

        for (uint256 i = 0; i < _index.getTokens().length; i++) {
            oldWeights[i] = tokenBalanceInBNB[i].mul(_index.TOTAL_WEIGHT()).div(
                vaultBalance
            );
            newWeights[i] = uint256(
                _index.getRecord(_index.getTokens()[i]).denorm
            );
        }

        uint256 sumWeightsToSwap = sellTokens(_index, oldWeights, newWeights);
        buyTokens(_index, oldWeights, newWeights, sumWeightsToSwap);
    }

    /**
     * @notice The function updates the token weights and rebalances the portfolio to the new weights
     * @param denorms The new token weights of the portfolio
     */
    function updateWeights(IndexSwap _index, uint96[] calldata denorms)
        public
        onlyAssetManager
    {
        require(
            denorms.length == _index.getTokens().length,
            "Lengths don't match"
        );
        feeModule(_index);
        _index.updateRecords(_index.getTokens(), denorms);
        rebalance(_index);
    }

    /**
     * @notice The function evaluates new denorms after updating the token list
     * @param tokens The new portfolio tokens
     * @param denorms The new token weights for the updated token list
     * @return A list of updated denorms for the new token list
     */
    function evaluateNewDenorms(
        IndexSwap _index,
        address[] memory tokens,
        uint96[] memory denorms
    ) internal view returns (uint256[] memory) {
        uint256[] memory newDenorms = new uint256[](_index.getTokens().length);
        for (uint256 i = 0; i < _index.getTokens().length; i++) {
            for (uint256 j = 0; j < tokens.length; j++) {
                if (_index.getTokens()[i] == tokens[j]) {
                    newDenorms[i] = denorms[j];
                    break;
                }
            }
        }
        return newDenorms;
    }

    /**
     * @notice The function rebalances the portfolio to the updated tokens with the updated weights
     * @param tokens The updated token list of the portfolio
     * @param denorms The new weights for for the portfolio
     */
    function updateTokens(
        IndexSwap _index,
        address[] memory tokens,
        uint96[] memory denorms
    ) public onlyAssetManager {
        uint256 totalWeight = 0;

        for (uint256 i = 0; i < tokens.length; i++) {
            totalWeight = totalWeight.add(denorms[i]);
        }
        require(totalWeight == _index.TOTAL_WEIGHT(), "INVALID_WEIGHTS");
        feeModule(_index);

        uint256[] memory newDenorms = evaluateNewDenorms(
            _index,
            tokens,
            denorms
        );

        if (_index.totalSupply() > 0) {
            // sell - swap to BNB
            for (uint256 i = 0; i < _index.getTokens().length; i++) {
                // token removed
                if (newDenorms[i] == 0) {
                    uint256 tokenBalance = indexSwapLibrary.getTokenBalance(
                        _index,
                        _index.getTokens()[i],
                        adapter.getETH() == _index.getTokens()[i]
                    );

                    if (_index.getTokens()[i] == adapter.getETH()) {
                        adapter._pullFromVault(
                            _index,
                            _index.getTokens()[i],
                            tokenBalance,
                            address(this)
                        );
                        if (
                            tokenMetadata.vTokens(_index.getTokens()[i]) !=
                            address(0)
                        ) {
                            adapter.redeemBNB(
                                tokenMetadata.vTokens(_index.getTokens()[i]),
                                tokenBalance
                            );
                        }
                        IWETH(_index.getTokens()[i]).withdraw(tokenBalance);
                    } else {
                        adapter._pullFromVault(
                            _index,
                            _index.getTokens()[i],
                            tokenBalance,
                            address(adapter)
                        );
                        adapter._swapTokenToETH(
                            _index.getTokens()[i],
                            tokenBalance,
                            address(this)
                        );
                    }

                    _index.deleteRecord(_index.getTokens()[i]);
                }
            }
        }
        _index.updateRecords(tokens, denorms);

        _index.updateTokenList(tokens);

        rebalance(_index);
    }

    // Fee module
    function feeModule(IndexSwap _index) internal {
        for (uint256 i = 0; i < _index.getTokens().length; i++) {
            uint256 tokenBalance = indexSwapLibrary.getTokenBalance(
                _index,
                _index.getTokens()[i],
                adapter.getETH() == _index.getTokens()[i]
            );

            uint256 amount = tokenBalance.mul(_index.getFee()).div(10000);

            if (_index.getTokens()[i] == adapter.getETH()) {
                adapter._pullFromVault(
                    _index,
                    _index.getTokens()[i],
                    amount,
                    address(this)
                );
                if (
                    tokenMetadata.vTokens(_index.getTokens()[i]) != address(0)
                ) {
                    adapter.redeemBNB(
                        tokenMetadata.vTokens(_index.getTokens()[i]),
                        amount
                    );
                }
                IWETH(_index.getTokens()[i]).withdraw(amount);
                payable(_index.getTreasury()).transfer(amount);
            } else {
                adapter._pullFromVault(
                    _index,
                    _index.getTokens()[i],
                    amount,
                    address(adapter)
                );
                adapter._swapTokenToETH(
                    _index.getTokens()[i],
                    amount,
                    _index.getTreasury()
                );
            }
        }
    }

    function updateTreasury(IndexSwap _index, address _newAddress)
        public
        onlyAssetManager
    {
        _index.updateTreasury(_newAddress);
    }

    // important to receive ETH
    receive() external payable {}
}
