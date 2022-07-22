// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4 ;
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";
import "./interfaces/IAdapter.sol";
import "./interfaces/IIndexSwap.sol";
import "./interfaces/IRebalancing.sol";
import "./core/IndexSwap.sol";

contract IndexFactory is Ownable
{

    address public treasury;
    address public uniswapRouter;
    address public outAsset;
    address public indexSwapLibrary;
    address public tokenMetadata;
    address private baseStorageAddress;
    address private baseAdapterAddress;
    address private baseRebalancingAddress;
    address private baseAccessControllerAddress;
     
    struct IndexSwaplInfo {
        address indexSwap;
        address rebalancing;
        address owner;
    }

    IndexSwaplInfo[] public IndexSwapInfolList;
    
    event IndexCreation(
        address index,
        string _name,
        string _symbol,
        address _outAsset,
        address _vault,
        uint256 _maxInvestmentAmount,
        address _adapter,
        address _accessController
    );

    event RebalanceCreation(address _rebalancing);

    constructor(
        address _uniswapRouter,
        address _outAsset,
        address _treasury,
        address _indexSwapLibrary,
        address _tokenMetadata,
        address _baseAdapterAddress,
        address _baseRebalancingAddres,
        address _baseAccessControllerAddress
    ) {
        require(_outAsset != address(0), "Invalid Out Asset"); 
        uniswapRouter = _uniswapRouter;
        outAsset = _outAsset;
        treasury = _treasury;
        indexSwapLibrary=_indexSwapLibrary;
        tokenMetadata=_tokenMetadata;
        baseRebalancingAddress = _baseRebalancingAddres;
        baseAdapterAddress =_baseAdapterAddress;
        baseAccessControllerAddress =_baseAccessControllerAddress;
    }

    function createIndex(
        string memory _name,
        string memory _symbol,
        address _vault,
        address _velvetSafeModule,
        uint256 _maxInvestmentAmount,
        uint256 _feePointBasis
     ) public onlyOwner returns (address) {
        require(_vault != address(0), "Invalid Vault");
        require(address(_velvetSafeModule) != address(0), "Invalid Module");
       
        // Access Controller
        address _accessController = Clones.clone(baseAccessControllerAddress);
        IAdapter _adapter = IAdapter(Clones.clone(baseAdapterAddress));

        // Index Manager
        _adapter.init(
            address(_accessController),
            uniswapRouter,
            _velvetSafeModule,
            tokenMetadata
        );
       
        IndexSwap  indexSwap =new IndexSwap(
            _name,
            _symbol,
            outAsset,
            _vault,
            _maxInvestmentAmount,
            indexSwapLibrary,
            address(_adapter),
            address(_accessController),
            tokenMetadata,
            _feePointBasis,
            treasury
        );

        emit IndexCreation(
            address(indexSwap),
            _name,
            _symbol,
            outAsset,
            _vault,
            _maxInvestmentAmount,
            address(_adapter),
            address(_accessController)
         );

        IRebalancing rebalancing =IRebalancing(Clones.clone(baseRebalancingAddress));

        rebalancing.init(
            IIndexSwap(address(indexSwap)),
            indexSwapLibrary,
            address(_adapter),
            address(_accessController),
            tokenMetadata,
             owner()
        );
        
        IndexSwapInfolList.push(IndexSwaplInfo(address(indexSwap),address(rebalancing), owner()));

         emit RebalanceCreation(address(rebalancing));
         emit IndexCreation(
            address(indexSwap),
            _name,
            _symbol,
            outAsset,
            _vault,
            _maxInvestmentAmount,
            address(_adapter),
            address(_accessController)
         );
         return address(indexSwap);
    }
    function validIndexId(uint256 indexfundId) public view returns (bool) {
        if (indexfundId >= 0 && indexfundId <= IndexSwapInfolList.length - 1) return true;
    }
  
    function getIndexList(uint256 indexfundId) external view returns (address){
        return address(IndexSwapInfolList[indexfundId].indexSwap);
    }

    function initializeTokens(
        uint256 indexfundId,
        address[] calldata _tokens,
        uint96[] calldata _denorms
    ) public onlyOwner {
         require(validIndexId(indexfundId), "Not a valid Id");
        IIndexSwap(IndexSwapInfolList[indexfundId].indexSwap).initToken(_tokens, _denorms);
    }

    function setPause(
        uint256 indexfundId,
        bool _state
    ) public onlyOwner {
            require(validIndexId(indexfundId), "Not a valid Id");
            IRebalancing(IndexSwapInfolList[indexfundId].rebalancing).setPause(_state);
    }

    function updateTokens(
        uint256 indexfundId, 
        address[] calldata _tokens,
        uint96[] calldata _denorms) public onlyOwner {
         IRebalancing(IndexSwapInfolList[indexfundId].rebalancing).updateTokens(_tokens,_denorms);
    }

    function updateWeights(
        uint256 indexfundId, 
        uint96[] calldata _denorms) public onlyOwner {
         IRebalancing(IndexSwapInfolList[indexfundId].rebalancing).updateWeights(_denorms);
    }

    function feeModule(uint256 indexfundId) public onlyOwner {
         IRebalancing(IndexSwapInfolList[indexfundId].rebalancing).feeModule();
    }

}