
# Velvet.Capital

This repository includes the smart contract developed by the team. It has contracts and other scripts to test out. The contracts are divided into multiple sections.

## List of contracts
**1. Access**: This folder includes the contracts related to access. File Name: *AccessController.sol*

**2. Core**: This folder includes contracts related to core functionalities like investing,swapping,withdrawing etc.

* *Adapter.sol* : This includes functions to transfer tokens , interact with vault and swap.

* *IndexSwap.sol* : This includes the investInFund and withdrawal functions.

* *IndexSwapLibrary.sol* : This includes all the logic and functions behind the calculation and balances of token.

**3. Rebalance** : This folder includes the contracts regarding pausable functions and update of tokens and weights.

* *Rebalancing.sol* : This inlcudes the logic behind the pausable function and also rebalancing the profolio along with feeModule.

**4. Vault** : This folder includes the contracts to bridge Gnosis Safe.

* *VelvetSafeModule.sol* : This includes module which needs to to connected with the Gnosis Safe.

**5. Venus** : This includes the logic to implement venus protocol to the index.

## Running test cases

To run the testcase update the .env file and:
```node
npx hardhat test --network hardhat
```


## Deployment

### Deploy Gnosis Safe and it's contract:

```
  1. Import all contracts on Remix
  2. Goto gnosis-safe.io and create a safe 
  3. Deploy the VelvetSafeModule and deploy it with 
     the Gnosis Safe Address
  4. Once deployed, verify the contract address on BscScan
  5. Search for Zodiac App in the app section and click on custom module
  6. Paste the contract address and enableModule
```

### Deploy the TokenMetadata Contract:
If the user wants to earn interest on their investment then they can deploy tokenMetadata with the pair else they can only deploy and not initialize.
```
1. Import all contracts on Remix.
2. Deploy the tokenMetadata.sol.
3. If the tokens are not vTokens then we dont need to
   initialize the contract. But if the tokens are vTokens
   we need to initialize it by passing vTokens and it's 
   underlying token address.
```

### Deploy the Index Contract:

```
1. Deploy the PriceOracle.sol
2. Deploy the AccessController.sol
3. Deploy and initialize IndexSwapLibrary.sol
4. Deploy and initialize Adapter.sol
5. Deploy and initialize IndexSwap.sol
6. Initialize the IndexSwap.sol with the tokens and it's 
   weights.
7. Add Adapter.sol contract address as the owner of the 
   gnosis safe by calling addOwner function in VelvetSafeModule.sol .
8. The Index is ready to be invested in.   
```

### Deploy the Rebalance Contract:
```
1. Deploy the Rebalancing.sol
2. AssetManager can call different functions
```
## Add assetManager to the Index
```
1. Copy the assetManager address and goto AccessController.sol
2. Click and copy the ASSET_MANAGER data(bytes)
3. Goto grantRole and paste both the address and ASSET_MANAGER data
4. Sign the transaction.
```
