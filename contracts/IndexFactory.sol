// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4 || ^0.7.6 || ^0.8.0;

import "./access/AccessController.sol";
import "./core/IndexSwap.sol";
import "./core/IndexSwapLibrary.sol";
import "./core/IndexManager.sol";
import "./oracle/PriceOracle.sol";
import "./rebalance/Rebalancing.sol";
import "./vault/MyModule.sol";

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
        uint256 _maxInvestmentAmount
    ) public returns (IndexSwap index) {
        // Price Oracle
        PriceOracle priceOracle = new PriceOracle();
        priceOracle.initialize(_uniswapRouter);

        // Index Swap Library
        IndexSwapLibrary _indexSwapLibrary = new IndexSwapLibrary();
        _indexSwapLibrary.initialize(address(priceOracle), _outAsset);

        // Access Controller
        AccessController _accessController = new AccessController();
        _accessController.initialize();

        // Index Manager
        IndexManager _indexManager = new IndexManager(
            _accessController,
            _uniswapRouter,
            _myModule
        );

        // Index Swap
        index = new IndexSwap();
        index.initialize(
            _name,
            _symbol,
            _outAsset,
            _vault,
            _maxInvestmentAmount,
            _indexSwapLibrary,
            _indexManager,
            _accessController
        );

        // Rebalancing
        Rebalancing rebalancing = new Rebalancing();
        rebalancing.initialize(
            _indexSwapLibrary,
            _indexManager,
            _accessController
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
