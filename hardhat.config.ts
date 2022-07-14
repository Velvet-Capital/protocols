import { config as dotEnvConfig } from "dotenv";
dotEnvConfig();
import "@nomiclabs/hardhat-etherscan";
import "@nomiclabs/hardhat-waffle";
import "@nomiclabs/hardhat-ethers";
import "@typechain/hardhat";
import "@openzeppelin/hardhat-upgrades";
import "solidity-coverage";
import "./tasks/accounts";
import "./tasks/balance";
import "./tasks/block-number";
import "./tasks/deployIndexSwap";
import "./tasks/setTokenIndexSwap";

import { HardhatUserConfig } from "hardhat/types";
import { chainIdToAddresses } from "./scripts/networkVariables";

const mnemonic = process.env.MNEMONIC;
if (!mnemonic) {
  throw new Error("Please set your MNEMONIC in a .env file");
}

const infuraApiKey = process.env.INFURA_API_KEY;
const privateKey = process.env.PRIVATE_KEY;
const forkChainId: any = process.env.FORK_CHAINID;

if (!infuraApiKey) {
  throw new Error("Please set your INFURA_API_KEY in a .env file");
}
const chainIds = {
  ganache: 5777,
  goerli: 5,
  hardhat: 7545,
  kovan: 42,
  mainnet: 1,
  rinkeby: 4,
  bscTestnet: 97,
  bscMainnet: 56,
  MaticTestnet: 80001,
  MaticMainnet: 137,
  ropsten: 3,
};

const config: HardhatUserConfig = {
  networks: {
    hardhat: {
      accounts: {
        mnemonic,
      },
      forking: {
        // eslint-disable-next-line
        enabled: true,
        url: forkChainId
          ? chainIdToAddresses[forkChainId].RpcUrl
          : `https://bsc-dataseed.binance.org`,
      },
      // chainId: chainIds.hardhat,
      // allowUnlimitedContractSize: true
    },
    ganache: {
      chainId: 5777,
      url: "http://127.0.0.1:8545/",
    },

    mainnet: {
      accounts: {
        count: 10,
        initialIndex: 0,
        mnemonic,
        path: "m/44'/60'/0'/0",
      },
      chainId: chainIds["mainnet"],
      url: "https://mainnet.infura.io/v3/" + infuraApiKey + "",
    },
    rinkeby: {
      accounts: {
        initialIndex: 0,
        mnemonic,
        // path: "m/44'/60'/0'/0",
      },
      chainId: chainIds["rinkeby"],
      url: "https://rinkeby.infura.io/v3/" + infuraApiKey + "",
    },
    bscTestnet: {
      accounts: {
        initialIndex: 0,
        mnemonic,
        // path: "m/44'/60'/0'/0",
      },
      chainId: chainIds["bscTestnet"],
      url: "https://data-seed-prebsc-1-s1.binance.org:8545",
    },
    bscMainnet: {
      accounts: {
        initialIndex: 1,
        mnemonic,
        // path: "m/44'/60'/0'/0",
      },
      chainId: chainIds["bscMainnet"],
      url: "https://bsc-dataseed.binance.org/",
    },
    MaticTestnet: {
      accounts: {
        initialIndex: 0,
        mnemonic,
        // path: "m/44'/60'/0'/0",
      },
      // chainId: chainIds["MaticTestnet"],
      chainId: 80001,
      allowUnlimitedContractSize: true,
      url:
        "https://speedy-nodes-nyc.moralis.io/" +
        infuraApiKey +
        "/polygon/mumbai",
    },
    MaticMainnet: {
      accounts: {
        initialIndex: 0,
        mnemonic,
        // path: "m/44'/60'/0'/0",
      },
      chainId: chainIds["MaticMainnet"],
      allowUnlimitedContractSize: true,
      url: "https://rpc-mainnet.maticvigil.com/",
    },
  },
  solidity: {
    compilers: [
      {
        version: "0.8.4",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      {
        version: "0.8.10",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      {
        version: "0.8.0",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      {
        version: "0.7.6",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      {
        version: "0.6.10",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      {
        version: "0.5.16",
      },
      {
        version: "0.6.12",
      },
    ],
  },
  mocha: {
    timeout: 200000,
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
};

module.exports = config;
