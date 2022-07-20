// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
import { run, ethers, upgrades } from "hardhat";
import { TokenMetadata } from "../typechain";
import { chainIdToAddresses } from "./networkVariables";
// let fs = require("fs");
const ETHERSCAN_TX_URL = "https://testnet.bscscan.io/tx/";

async function main() {
  // Hardhat always runs the compile task when running scripts with its command
  // line interface.
  //
  // If this script is run directly using `node` you may want to call compile
  // manually to make sure everything is compiled
  await run("compile");

  // get current chainId
  const { chainId } = await ethers.provider.getNetwork();
  const forkChainId: any = process.env.FORK_CHAINID;

  const addresses = chainIdToAddresses[forkChainId];
  const accounts = await ethers.getSigners();

  //console.log("accounts",accounts);


  console.log("------------------------------ Initial Setup Ended ------------------------------");

  console.log("--------------- Contract Deployment Started ---------------");
  // Price Oracle
  const PriceOracle = await ethers.getContractFactory("PriceOracle");
  const priceOracle = await PriceOracle.deploy();
  console.log("Contract priceOracle deployed to: ", priceOracle.address);


  await priceOracle.initialize(addresses.PancakeSwapRouterAddress);

  // Token Metadata
  const TokenMetadata = await ethers.getContractFactory("TokenMetadata");
  const tokenMetadata = await TokenMetadata.deploy();
  console.log("Contract tokenMetadata deployed to: ", tokenMetadata.address);

  // Index Library
  const IndexSwapLibrary = await ethers.getContractFactory("IndexSwapLibrary");
  const indexSwapLibrary = await IndexSwapLibrary.deploy(
    priceOracle.address,
    addresses.WETH_Address,
    tokenMetadata.address
  );
  console.log(`Contract indexSwapLibrary deployed to: ${indexSwapLibrary.address}`);


  // Access Controller
  const AccessController = await ethers.getContractFactory("AccessController");
  const accessController = await AccessController.deploy();
  await accessController.deployed();
  console.log(`Contract accessController deployed to: ${accessController.address}`);

  
  // Adapterd
  const Adapter = await ethers.getContractFactory("Adapter");
  const adapter = await Adapter.deploy();
  await adapter.deployed();
    
  console.log(`Contract Adapter deployed to: ${adapter.address}`);

  
  const Rebalancing = await ethers.getContractFactory("Rebalancing");
  const rebalancing = await Rebalancing.deploy();
  await rebalancing.deployed();

  console.log("Contract rebalancing deployed to: ", rebalancing.address);


  const IndexFactory = await ethers.getContractFactory("IndexFactory");
  const indexFactory = await IndexFactory.deploy(
    addresses.PancakeSwapRouterAddress,
    addresses.WETH_Address,
    accounts[1].address,
    indexSwapLibrary.address,
    tokenMetadata.address,
    adapter.address,
    rebalancing.address,
    accessController.address
  );
  await indexFactory.deployed();

  // await indexFactory.createIndex(
  //  "DefiIndex",
  //   "DIDX",
  //   "",
  //   "",
  //   "500000000000000000000",
  //   taskArgs.fee,
  // );  


  console.log("Contract indexFactory deployed to: ", indexFactory.address);


  
  console.log("------------------------------ Contract Deployment Ended ------------------------------");
  
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
