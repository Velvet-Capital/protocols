import ethers from "ethers";
import { Contract }  from "ethers";
import { task, types } from "hardhat/config";
import Safe, {
  SafeFactory,
  SafeAccountConfig,
  ContractNetworksConfig,
} from "@gnosis.pm/safe-core-sdk";
import EthersAdapter from "@gnosis.pm/safe-ethers-lib";
import {
  SafeTransactionDataPartial,
  GnosisSafeContract,
  SafeVersion,
} from "@gnosis.pm/safe-core-sdk-types";
import { getSafeContract } from "@gnosis.pm/safe-core-sdk/dist/src/contracts/safeDeploymentContracts";

import { CREATE_INDEX } from "./task-names";
import { chainIdToAddresses } from "../scripts/networkVariables";

task(CREATE_INDEX, "Deploy IndexSwap Contract ")
  .addParam("indexfactory", "The indexFactory's address")
  .addParam("name", "The index Name's address")
  .addParam("symbol", "The symbol's address")
  .addParam("fee", "The feePointBasis's address")
  .setAction(async (taskArgs): Promise<Contract> => {

    const hre= require("hardhat");
    const forkChainId: any = process.env.FORK_CHAINID;
    const { chainId } = await hre.ethers.provider.getNetwork();
    const addresses = chainIdToAddresses[forkChainId];
    const accounts = await hre.ethers.getSigners();
    console.log("------------------------------ Initial Setup Ended ------------------------------");

    console.log("--------------- Contract Deployment Started ---------------");

    const [owner] = accounts;

    // Index Swap
    const ethAdapter = new EthersAdapter({
          ethers,
          signer: owner,
    });

    const id = await ethAdapter.getChainId();
    const contractNetworks: ContractNetworksConfig = {
      [id]: {
        multiSendAddress: addresses.MULTI_SEND_ADDRESS,
        safeMasterCopyAddress: addresses.SAFE_MASTER_COPY_ADDRESS,
        safeProxyFactoryAddress: addresses.SAFE_PROXY_FACTORY_ADDRESS,
      },
  };

  const safeFactory = await SafeFactory.create({
      ethAdapter,
      contractNetworks,
      isL1SafeMasterCopy: true,
  }); 
  const owners = [owner.address];
  const threshold = 1;
  const safeAccountConfig: SafeAccountConfig = {
  owners,
  threshold,
  };

  const safeSdk: Safe = await safeFactory.deploySafe({ safeAccountConfig });


  const newSafeAddress = safeSdk.getAddress();
  const safeAddress = newSafeAddress;

  console.log("Safe deployed to: ", newSafeAddress);


  const VelvetSafeModule = await hre.ethers.getContractFactory(
  "VelvetSafeModule"
  );
  const velvetSafeModule = await VelvetSafeModule.deploy(newSafeAddress);
  console.log("VelvetSafeModule deployed to: ", velvetSafeModule.address);

  // await run("verify:verify", {
  //   address: velvetSafeModule.address,
  //   constructorArguments: [newSafeAddress],
  //   contract: "contracts/vault/VelvetSafeModule.sol:VelvetSafeModule"
  // });

  let ABI = ["function enableModule(address module)"];
  let abiEncode = new ethers.utils.Interface(ABI);
  let txData = abiEncode.encodeFunctionData("enableModule", [
  velvetSafeModule.address,
  ]);

  const transaction: SafeTransactionDataPartial = {
  to: safeAddress,
  value: "0",
  data: txData,
  operation: 0,
  safeTxGas: 0,
  baseGas: 0,
  gasPrice: 0,
  gasToken: "0x0000000000000000000000000000000000000000",
  refundReceiver: "0x0000000000000000000000000000000000000000",
  };
  const safeTransaction = await safeSdk.createTransaction(transaction);

  const ethAdapterOwner2 = new EthersAdapter({ ethers, signer: owner });
  const safeSdk2 = await safeSdk.connect({
  ethAdapter: ethAdapterOwner2,
  safeAddress,
  });
  const txHash = await safeSdk2.getTransactionHash(safeTransaction);
  const approveTxResponse = await safeSdk2.approveTransactionHash(txHash);
  await approveTxResponse.transactionResponse?.wait();

  const ethAdapterOwner3 = new EthersAdapter({ ethers, signer: owner });
  const safeSdk3 = await safeSdk2.connect({
  ethAdapter: ethAdapterOwner3,
  safeAddress,
  });
  const executeTxResponse = await safeSdk3.executeTransaction(
  safeTransaction
  );
  await executeTxResponse.transactionResponse?.wait();


    console.log("-------------- Adding adapter contract as owner in safe wallet--------------------");

    const IndexFactory = hre.ethers.getContractFactory("IndexFactory");
    let indexFactory = (await IndexFactory).attach(taskArgs.indexFactory); 
    const indexSwap= await indexFactory.createIndex(
      taskArgs.name,
      taskArgs.symbol,
      newSafeAddress,
      velvetSafeModule.address,
      "500000000000000000000",
      taskArgs.fee,
    );  

    return indexSwap;

  });
