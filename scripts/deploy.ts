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
  const addresses = chainIdToAddresses[chainId];

  // Price Oracle
  const PriceOracle = await ethers.getContractFactory("PriceOracle");
  const priceOracle = await PriceOracle.deploy();
  await priceOracle.deployed();
  priceOracle.initialize(addresses.PancakeSwapRouterAddress);

  // Token Metadata
  const TokenMetadata = await ethers.getContractFactory("TokenMetadata");
  const tokenMetadata = await TokenMetadata.deploy();
  await tokenMetadata.deployed();

  // Access Controller
  const AccessController = await ethers.getContractFactory("AccessController");
  const accessController = await AccessController.deploy();
  await accessController.deployed();

  // Index Library
  const IndexSwapLibrary = await ethers.getContractFactory("IndexSwapLibrary");
  const indexSwapLibrary = await IndexSwapLibrary.deploy(
    priceOracle.address,
    addresses.WETH_Address,
    tokenMetadata.address
  );
  await indexSwapLibrary.deployed();

  // Index Manager
  const IndexManager = await ethers.getContractFactory("IndexManager");
  const indexManager = await IndexManager.deploy(
    accessController.address,
    addresses.PancakeSwapRouterAddress,
    addresses.Module,
    tokenMetadata.address
  );
  await indexManager.deployed();

  // Index Swap
  const IndexSwap = await ethers.getContractFactory("IndexSwap");
  const indexSwap = await IndexSwap.deploy(
    "INDEXLY",
    "IDX",
    addresses.WETH_Address,
    addresses.Vault,
    "500000000000000000000",
    indexSwapLibrary.address,
    indexManager.address,
    accessController.address,
    tokenMetadata.address
  );
  await indexSwap.deployed();

  const Rebalancing = await ethers.getContractFactory("Rebalancing");
  const rebalancing = await Rebalancing.deploy(
    indexSwapLibrary.address,
    indexManager.address,
    accessController.address,
    tokenMetadata.address
  );
  await rebalancing.deployed();

  console.log(`IndexManager deployed to: ${indexManager.address}`);
  console.log(`IndexSwap deployed to: ${indexSwap.address}`);
  console.log(`Rebalancing deployed to: ${rebalancing.address}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
