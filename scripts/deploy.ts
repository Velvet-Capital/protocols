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

  tokenMetadata.add(
    "0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c",
    "0x882C173bC7Ff3b7786CA16dfeD3DFFfb9Ee7847B"
  ); // BTC
  tokenMetadata.add(
    "0x2170ed0880ac9a755fd29b2688956bd959f933f8",
    "0xf508fCD89b8bd15579dc79A6827cB4686A3592c8"
  ); // ETH
  tokenMetadata.addBNB(); // WBNB
  tokenMetadata.add(
    "0x1d2f0da169ceb9fc7b3144628db156f3f6c60dbe",
    "0xB248a295732e0225acd3337607cc01068e3b9c10"
  ); // XRP
  tokenMetadata.add(
    "0x3ee2200efb3400fabb9aacf31297cbdd1d435d47",
    "0x9A0AF7FDb2065Ce470D72664DE73cAE409dA28Ec"
  ); // ADA
  tokenMetadata.add(
    "0x7083609fce4d1d8dc0c979aab8c869ea2c873402",
    "0x1610bc33319e9398de5f57B33a5b184c806aD217"
  ); // DOT
  tokenMetadata.add(
    "0x85eac5ac2f758618dfa09bdbe0cf174e7d574d5b",
    "0x61eDcFe8Dd6bA3c891CB9bEc2dc7657B3B422E93"
  ); // TRX
  tokenMetadata.add(
    "0x0e09fabb73bd3ade0a17ecc321fd13a19e81ce82",
    "0x86aC3974e2BD0d60825230fa6F355fF11409df5c"
  ); // CAKE
  tokenMetadata.add(
    "0x8ff795a6f4d97e7887c79bea79aba5cc76444adf",
    "0x5F0388EBc2B94FA8E123F404b79cCF5f40b29176"
  ); // BCH
  tokenMetadata.add(
    "0x0d8ce2a99bb6e3b7db580ed848240e4a0f9ae153",
    "0xf91d58b5aE142DAcC749f58A49FCBac340Cb0343"
  ); // FIL

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

  indexSwap.init(
    [
      "0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c",
      "0x2170ed0880ac9a755fd29b2688956bd959f933f8",
      "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c",
      "0x1d2f0da169ceb9fc7b3144628db156f3f6c60dbe",
      "0x3ee2200efb3400fabb9aacf31297cbdd1d435d47",
      "0x7083609fce4d1d8dc0c979aab8c869ea2c873402",
      "0x85eac5ac2f758618dfa09bdbe0cf174e7d574d5b",
      "0x0e09fabb73bd3ade0a17ecc321fd13a19e81ce82",
      "0x8ff795a6f4d97e7887c79bea79aba5cc76444adf",
      "0x0d8ce2a99bb6e3b7db580ed848240e4a0f9ae153",
    ], // FIL
    [1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000]
  );

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
