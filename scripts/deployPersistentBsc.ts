// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
import { run, ethers, upgrades } from "hardhat";
import { chainIdToAddresses } from "./networkVariables";
// let fs = require("fs");
const ETHERSCAN_TX_URL = "https://testnet.bscscan.io/tx/";


async function deployPersistentBsc() {
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
  const [owner] = accounts;



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
  console.log("Contract indexSwapLibrary deployed to: ", indexSwapLibrary.address);
  console.log("------------------------------ Contract Deployment Ended ------------------------------");
  

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
deployPersistentBsc()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
