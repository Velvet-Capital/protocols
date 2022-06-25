// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
import { run, ethers, upgrades } from "hardhat";
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

  // We get the contract to deploy
  const PriceOracle = await ethers.getContractFactory("PriceOracle");
  const priceProxy = await upgrades.deployProxy(PriceOracle, [
    addresses.PancakeSwapRouterAddress,
  ]);
  await priceProxy.deployed();

  const IndexSwapLibrary = await ethers.getContractFactory("IndexSwapLibrary");
  const libraryProxy = await upgrades.deployProxy(IndexSwapLibrary, [
    priceProxy.address,
    addresses.WETH_Address,
  ]);
  await libraryProxy.deployed();

  const AccessController = await ethers.getContractFactory("AccessController");
  const accessProxy = await upgrades.deployProxy(AccessController);
  await accessProxy.deployed();

  const IndexManager = await ethers.getContractFactory("IndexManager");
  const managerProxy = await upgrades.deployProxy(IndexManager, [
    accessProxy.address,
    addresses.PancakeSwapRouterAddress,
  ]);
  await managerProxy.deployed();

  const IndexSwap = await ethers.getContractFactory("IndexSwap");
  const indexProxy = await upgrades.deployProxy(IndexSwap, [
    "INDEXLY",
    "IDX",
    addresses.WETH_Address,
    addresses.Vault,
    "500000000000000000000",
    libraryProxy.address,
    managerProxy.address,
    accessProxy.address,
  ]);
  await indexProxy.deployed();

  const Rebalancing = await ethers.getContractFactory("Rebalancing");
  const rebalanceProxy = await upgrades.deployProxy(Rebalancing, [
    libraryProxy.address,
    managerProxy.address,
    accessProxy.address,
  ]);

  const priceOracle = PriceOracle.attach(priceProxy.address);
  console.log(`IndexSwap deployed to: ${indexProxy.address}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
