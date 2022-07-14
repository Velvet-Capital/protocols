# Smart Contract Dev Template

Template for smart contract development using Typescript & Hardhat

[Available Scripts](https://github.com/yuichiroaoki/typescript-hardhat/wiki/Available-Scripts)

[Setup Environment Variables](https://github.com/yuichiroaoki/typescript-hardhat/wiki/Setup-Environment-Variables)


# Testing 

```
cp .env.example .env
```

set FORK_CHAINID of evm chain  you want to fork,set that value into your .env files

example you want fork bscTestnest 

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
