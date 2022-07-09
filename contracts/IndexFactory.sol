// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4 || ^0.7.6 || ^0.8.0;

import "./access/AccessController.sol";
import "./core/IndexSwap.sol";
import "./core/IndexSwapLibrary.sol";
import "./core/Adapter.sol";
import "./oracle/PriceOracle.sol";
import "./rebalance/Rebalancing.sol";
import "./vault/VelvetSafeModule.sol";
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
        Adapter _adapter,
        AccessController _accessController
    );

    event RebalanceCreation(Rebalancing _rebalancing);

    function createIndex(
        string memory _name,
        string memory _symbol,
        address _uniswapRouter,
        address _outAsset,
        address _vault,
        VelvetSafeModule _velvetSafeModule,
        uint256 _maxInvestmentAmount,
        IndexSwapLibrary _indexSwapLibrary,
        TokenMetadata _tokenMetadata,
        uint256 _feePointBasis,
        address _treasury
    ) public returns (IndexSwap index) {
        // Access Controller
        AccessController _accessController = new AccessController();

        // Index Manager
        Adapter _adapter = new Adapter(
            _accessController,
            _uniswapRouter,
            _velvetSafeModule,
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
            _adapter,
            _accessController,
            _tokenMetadata,
            _feePointBasis,
            _treasury
        );

        emit IndexCreation(
            index,
            _name,
            _symbol,
            _outAsset,
            _vault,
            _maxInvestmentAmount,
            _indexSwapLibrary,
            _adapter,
            _accessController
        );

        // Rebalancing
        Rebalancing rebalancing = new Rebalancing(
            _indexSwapLibrary,
            _adapter,
            _accessController,
            _tokenMetadata
        );

        emit RebalanceCreation(rebalancing);
    }

    function initializeTokens(
        IndexSwap _index,
        address[] calldata _tokens,
        uint96[] calldata _denorms
    ) public {
        _index.init(_tokens, _denorms);
    }
}
