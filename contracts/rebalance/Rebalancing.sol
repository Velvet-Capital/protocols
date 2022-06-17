pragma solidity ^0.8.4 || ^0.7.6 || ^0.8.0;

import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

import "../core/IndexSwapLibrary.sol";
import "../core/IndexManager.sol";
import "../core/IndexSwap.sol";

import "../interfaces/IBalancerLib.sol";

contract Rebalancing is AccessControl, BMath {
    bytes32 public constant ASSET_MANAGER_ROLE =
        keccak256("ASSET_MANAGER_ROLE");

    IndexSwapLibrary public indexSwapLibrary;
    IndexManager public indexManager;

    using SafeMath for uint256;

    constructor(address _indexSwapLibrary, address _indexManager) {
        indexSwapLibrary = IndexSwapLibrary(_indexSwapLibrary);
        indexManager = IndexManager(_indexManager);

        // OpenZeppelin Access Control
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setRoleAdmin(ASSET_MANAGER_ROLE, DEFAULT_ADMIN_ROLE);
        _setupRole(ASSET_MANAGER_ROLE, msg.sender);
    }

    modifier onlyAssetManager() {
        require(
            hasRole(ASSET_MANAGER_ROLE, msg.sender),
            "Caller is not an Asset Manager"
        );
        _;
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
                address t = _index.getTokens()[i];
                uint256 tokenBalance = IERC20(t).balanceOf(_index.getVault());
                uint256 weightDiff = _oldWeights[i].sub(_newWeights[i]);
                uint256 swapAmount = tokenBalance.mul(weightDiff).div(
                    _oldWeights[i]
                );

                if (t == indexManager.getETH()) {
                    indexManager._pullFromVault(
                        _index,
                        t,
                        swapAmount,
                        address(this)
                    );
                } else {
                    indexManager._pullFromVault(
                        _index,
                        t,
                        swapAmount,
                        address(this)
                    );
                    indexManager._swapTokenToETH(t, swapAmount, msg.sender);
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
            address t = _index.getTokens()[i];
            if (_newWeights[i] > _oldWeights[i]) {
                uint256 weightToSwap = _newWeights[i].sub(_oldWeights[i]);
                require(weightToSwap > 0, "weight not greater than 0");
                require(sumWeightsToSwap > 0, "div by 0, sumweight");
                uint256 swapAmount = totalBNBAmount.mul(weightToSwap).div(
                    sumWeightsToSwap
                );

                indexManager._swapETHToToken{value: swapAmount}(
                    t,
                    swapAmount,
                    _index.getVault()
                );
            }
        }
    }

    /**
     * @notice The function rebalances the token weights in the portfolio
     */
    function rebalance(IndexSwap _index) public onlyAssetManager {
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
            oldWeights[i] = tokenBalanceInBNB[i]
                .mul(_index.getTotalWeight())
                .div(vaultBalance);
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
            totalWeight = badd(totalWeight, denorms[i]);
        }
        require(totalWeight == _index.getTotalWeight(), "INVALID_WEIGHTS");

        uint256[] memory newDenorms = evaluateNewDenorms(
            _index,
            tokens,
            denorms
        );

        if (_index.totalSupply() > 0) {
            // sell - swap to BNB
            for (uint256 i = 0; i < _index.getTokens().length; i++) {
                address t = _index.getTokens()[i];
                // token removed
                if (newDenorms[i] == 0) {
                    uint256 tokenBalance = IERC20(t).balanceOf(
                        _index.getVault()
                    );

                    indexManager._pullFromVault(
                        _index,
                        t,
                        tokenBalance,
                        address(indexManager)
                    );
                    indexManager._swapTokenToETH(
                        t,
                        tokenBalance,
                        address(this)
                    );

                    _index.deleteRecord(t);
                }
            }
        }
        _index.updateRecords(tokens, denorms);

        _index.updateTokenList(tokens);

        rebalance(_index);
    }
}