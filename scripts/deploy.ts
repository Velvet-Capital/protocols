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

  const TokenMetadata = await ethers.getContractFactory("TokenMetadata");
  const tokenMetadata = await TokenMetadata.deploy();
  await tokenMetadata.deployed();

  // We get the contract to deploy
  const AccessController = await ethers.getContractFactory("AccessController");
  const accessProxy = await upgrades.deployProxy(AccessController);
  await accessProxy.deployed();

  const IndexManager = await ethers.getContractFactory("IndexManager");
  const managerProxy = await IndexManager.deploy(
    accessProxy.address,
    addresses.PancakeSwapRouterAddress,
    addresses.Module,
    tokenMetadata.address
  );
  await managerProxy.deployed();

  const IndexSwap = await ethers.getContractFactory("IndexSwap");
  const indexProxy = await upgrades.deployProxy(IndexSwap, [
    "METAVERSE Portfolio",
    "META",
    addresses.WETH_Address,
    addresses.Vault,
    "500000000000000000000",
    addresses.IndexSwapLibrary,
    managerProxy.address,
    accessProxy.address,
  ]);
  await indexProxy.deployed();

  const Rebalancing = await ethers.getContractFactory("Rebalancing");
  const rebalanceProxy = await upgrades.deployProxy(Rebalancing, [
    addresses.IndexSwapLibrary,
    managerProxy.address,
    accessProxy.address,
    tokenMetadata.address,
  ]);
  await rebalanceProxy.deployed();

  console.log(`IndexManager deployed to: ${managerProxy.address}`);
  console.log(`IndexSwap deployed to: ${indexProxy.address}`);
  console.log(`Rebalancing deployed to: ${rebalanceProxy.address}`);

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
