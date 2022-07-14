import { Contract } from "ethers";
import { task, types } from "hardhat/config";
import { DEPLOY_INDEXSWAP } from "./task-names";
import { chainIdToAddresses } from "../scripts/networkVariables";

task(DEPLOY_INDEXSWAP, "Deploy IndexSwap Contract ")
  .addParam("name", "The index Name's address")
  .addParam("symbol", "The symbol's address")
  .addParam("fee", "The feePointBasis's address")
  .addParam("tokenmetadata", "The tokenMetadata's address")
  .addParam("safeaddress", "The safeAddress's address")
  .addParam("indexswaplibrary", "The indexSwapLibrary's address")
  .addParam("module", "The velvetSafeModule's address")
  .setAction(async (taskArgs): Promise<Contract> => {

    const hre = require("hardhat");
    const forkChainId: any = process.env.FORK_CHAINID;
    const { chainId } = await hre.ethers.provider.getNetwork();
    const addresses = chainIdToAddresses[forkChainId];
    const accounts = await hre.ethers.getSigners();
    console.log("------------------------------ Initial Setup Ended ------------------------------");

    console.log("--------------- Contract Deployment Started ---------------");

    const [owner] = accounts;
    // Access Controller
    const AccessController = await hre.ethers.getContractFactory("AccessController");
    const accessController = await AccessController.deploy();
    await accessController.deployed();
  
    // Index Library
    const IndexSwapLibrary = [""];
    
    // Adapter
    const Adapter = await hre.ethers.getContractFactory("Adapter");
    const adapter = await Adapter.deploy(
      accessController.address,
      addresses.PancakeSwapRouterAddress,
      taskArgs.module,
      taskArgs.tokenmetadata
    );
    await adapter.deployed();
      
    console.log(`Adapter deployed to: ${adapter.address}`);

    // Index Swap
    const IndexSwap = await hre.ethers.getContractFactory("IndexSwap");
    const indexSwap = await IndexSwap.deploy(
      taskArgs.name,
      taskArgs.symbol,
      addresses.WETH_Address,
      taskArgs.safeaddress,
      "500000000000000000000",
      taskArgs.indexswaplibrary,
      adapter.address,
      accessController.address,
      taskArgs.tokenmetadata,
      taskArgs.fee,
      owner.address
    );
    await indexSwap.deployed();
    console.log(`IndexSwap deployed to: ${indexSwap.address}`);

    
    const Rebalancing = await hre.ethers.getContractFactory("Rebalancing");
    const rebalancing = await Rebalancing.deploy(
      indexSwap.address,
      taskArgs.indexswaplibrary,
      adapter.address,
      accessController.address,
      taskArgs.tokenmetadata
    );
    await rebalancing.deployed();

    console.log("-------------- Adding adapter contract as owner in safe wallet--------------------");

    const VelvetSafeModule = hre.ethers.getContractFactory("VelvetSafeModule");
    let velvetSafeModule = (await VelvetSafeModule).attach(taskArgs.module); 
    await velvetSafeModule.addOwner(adapter.address);  

  
    console.log(`Rebalancing deployed to: ${rebalancing.address}`);
    console.log("------------------------------ Contract Deployment Ended ------------------------------");

    return indexSwap;
  });
