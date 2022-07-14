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
  const [owner] = accounts;

  console.log("------------------------------ Initial Setup Ended ------------------------------");

  console.log("--------------- Contract Deployment Started ---------------");

  const ethAdapter = new EthersAdapter({
        ethers,
        signer: owner,
  });

  const id = await ethAdapter.getChainId();
  
  console.log("addresses",process.argv[0]);

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


  const VelvetSafeModule = await ethers.getContractFactory(
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

  console.log("------------------------------ Deployment Storage Ended ------------------------------");


}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
