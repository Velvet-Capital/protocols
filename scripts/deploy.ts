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

  // Adapter
  const Adapter = await ethers.getContractFactory("Adapter");
  const adapter = await Adapter.deploy(
    accessController.address,
    addresses.PancakeSwapRouterAddress,
    "0xEc440E63372c2c7392F57beB544D3027d225768d",
    tokenMetadata.address
  );
  await adapter.deployed();

  // Index Swap
  const IndexSwap = await ethers.getContractFactory("IndexSwap");
  const indexSwap = await IndexSwap.deploy(
    "INDEXLY",
    "IDX",
    addresses.WETH_Address,
    "0x424D1ccB40ec890AC2Fc90917798db3ECfE20581",
    "500000000000000000000",
    indexSwapLibrary.address,
    adapter.address,
    accessController.address,
    tokenMetadata.address,
    "100",
    "0xcFC89B2986e70d5E64b3399E651024110681F64A" // treasury
  );
  await indexSwap.deployed();

  const Rebalancing = await ethers.getContractFactory("Rebalancing");
  const rebalancing = await Rebalancing.deploy(
    indexSwapLibrary.address,
    adapter.address,
    accessController.address,
    tokenMetadata.address
  );
  await rebalancing.deployed();

  console.log(`Adapter deployed to: ${adapter.address}`);
  console.log(`IndexSwap deployed to: ${indexSwap.address}`);
  console.log(`Rebalancing deployed to: ${rebalancing.address}`);
  console.log(`IndexSwapLibrary deployed to: ${indexSwapLibrary.address}`);
  console.log(`TokenMetadata deployed to: ${tokenMetadata.address}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
