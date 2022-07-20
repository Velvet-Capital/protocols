
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
FORK_CHAINID=97
```


## Deployment process 

Follwoing contract you have to deploy once only for particular chain

```
yarn deployBsc:common
```

Now you have to deploy gonsis safe valut and valut module

```
yarn deployBsc:safe
```

Now we have to to deploy Index contract

```
 npx hardhat DEPLOY_INDEXSWAP --name "DefiIndex" --symbol "DFIX" --fee "1" --tokenmetadata 0xA90a29063B8b010a68B0d50996Af958de3e67B38 --safeaddress  0x8dE5517DaCe1dD8B7970470E71bbB3565EE5F36C --indexswaplibrary 0xE9d3eFa014055c8258454962585555723D7425bD --module  0x4e91E38a0393FF2eD372Cb4E8638ae93aaD7844c --network bscMainnet
```

Next we have initialization token in index
```
 npx hardhat SET_TOKENS_INDEXSWAP --indexswap 0xb7df96Ec89F46aB11e1DAe5264ce84B1B2Da48b5  --tokens ["0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c","0x2170Ed0880ac9A755fd29B2688956BD959F933F8","0x1D2F0da169ceB9fC7B3144628dB156f3F6c60dBE","0x3EE2200Efb3400fAbB9AacF31297cBdD1d435D47","0x1CE0c2827e2eF14D5C4f29a091d735A204794041","0x7083609fCE4d1d8Dc0C979AAb8c869Ea2C873402",    "0x85EAC5Ac2F758618dFa09bDbe0cf174e7d574D5B","0xbA2aE424d960c26247Dd6c32edC70B295c744C43","0x570A5D26f7765Ecb712C0924E4De545B89fD43dF", "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c"] --weight [10000,10000,10000,10000,10000,10000,10000,10000,10000,10000] --network bscMainnet
```


Create Index Using factory contract

```
npx hardhat CREATE_INDEX --indexfactory   --name "DefiIndex" --symbol "DFIX" --fee "1" --network bscMainnet
```