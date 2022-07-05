// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4 || ^0.7.6 || ^0.8.0;

import "./access/AccessController.sol";
import "./core/IndexSwap.sol";
import "./core/IndexSwapLibrary.sol";
import "./core/IndexManager.sol";
import "./oracle/PriceOracle.sol";
import "./rebalance/Rebalancing.sol";
import "./vault/MyModule.sol";
import "./venus/TokenMetadata.sol";

contract IndexFactory {
    event IndexCreation(
        IndexSwap index,
        string _name,
        string _symbol,
        address _outAsset,
        address _vault,
        uint256 _maxInvestmentAmount,
        IndexSwapLibrary _indexSwapLibrary,
        IndexManager _indexManager,
        AccessController _accessController
    );

    function createIndex(
        string memory _name,
        string memory _symbol,
        address _uniswapRouter,
        address _outAsset,
        address _vault,
        MyModule _myModule,
        uint256 _maxInvestmentAmount,
        IndexSwapLibrary _indexSwapLibrary,
        TokenMetadata _tokenMetadata
    ) public returns (IndexSwap index) {
        // Access Controller
        AccessController _accessController = new AccessController();

        // Index Manager
        IndexManager _indexManager = new IndexManager(
            _accessController,
            _uniswapRouter,
            _myModule,
            _tokenMetadata
        );

        // Index Swap
        index = new IndexSwap(
            _name,
            _symbol,
            _outAsset,
            _vault,
            _maxInvestmentAmount,
            _indexSwapLibrary,
            _indexManager,
            _accessController,
            _tokenMetadata
        );

        // Rebalancing
        Rebalancing rebalancing = new Rebalancing(
            _indexSwapLibrary,
            _indexManager,
            _accessController,
            _tokenMetadata
        );

        emit IndexCreation(
            index,
            _name,
            _symbol,
            _outAsset,
            _vault,
            _maxInvestmentAmount,
            _indexSwapLibrary,
            _indexManager,
            _accessController
        );
    }

    function initializeTokens(
        IndexSwap _index,
        address[] calldata _tokens,
        uint96[] calldata _denorms
    ) public {
        _index.init(_tokens, _denorms);
    }
}
