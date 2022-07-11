import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { BigNumber } from "ethers";
import {
  IndexSwap,
  PriceOracle,
  IERC20__factory,
  IndexSwapLibrary,
  Adapter,
  Rebalancing,
  AccessController,
  TokenMetadata,
  VelvetSafeModule,
} from "../typechain";

import { chainIdToAddresses } from "../scripts/networkVariables";

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

var chai = require("chai");
//use default BigNumber
chai.use(require("chai-bignumber")());

describe.only("Tests for IndexSwap", () => {
  let accounts;
  let priceOracle: PriceOracle;
  let indexSwap: IndexSwap;
  let indexSwapLibrary: IndexSwapLibrary;
  let adapter: Adapter;
  let rebalancing: Rebalancing;
  let tokenMetadata: TokenMetadata;
  let accessController: AccessController;
  let velvetSafeModule: VelvetSafeModule;
  let gnosisSafeContract: GnosisSafeContract;
  let txObject;
  let owner: SignerWithAddress;
  let nonOwner: SignerWithAddress;
  let investor1: SignerWithAddress;
  let addr2: SignerWithAddress;
  let addr1: SignerWithAddress;
  let vault: SignerWithAddress;
  let addrs: SignerWithAddress[];
  //const APPROVE_INFINITE = ethers.BigNumber.from(1157920892373161954235); //115792089237316195423570985008687907853269984665640564039457
  let approve_amount = ethers.constants.MaxUint256; //(2^256 - 1 )
  let token;
  const forkChainId: any = process.env.FORK_CHAINID;
  const provider = ethers.provider;
  const chainId: any = forkChainId ? forkChainId : 56;
  const addresses = chainIdToAddresses[chainId];
  var bnbBefore = 0;
  var bnbAfter = 0;
  let safeAddress = "0x";

  const wbnbInstance = new ethers.Contract(
    addresses.WETH_Address,
    IERC20__factory.abi,
    ethers.getDefaultProvider()
  );
  const busdInstance = new ethers.Contract(
    addresses.BUSD,
    IERC20__factory.abi,
    ethers.getDefaultProvider()
  );
  const daiInstance = new ethers.Contract(
    addresses.DAI_Address,
    IERC20__factory.abi,
    ethers.getDefaultProvider()
  );
  const ethInstance = new ethers.Contract(
    addresses.ETH_Address,
    IERC20__factory.abi,
    ethers.getDefaultProvider()
  );
  const btcInstance = new ethers.Contract(
    addresses.BTC_Address,
    IERC20__factory.abi,
    ethers.getDefaultProvider()
  );

  describe.only("Tests for IndexSwap contract", () => {
    before(async () => {
      accounts = await ethers.getSigners();
      [owner, investor1, nonOwner, vault, addr1, addr2, ...addrs] = accounts;

      const provider = ethers.getDefaultProvider();
      const safeOwner = owner;

      const ethAdapter = new EthersAdapter({
        ethers,
        signer: safeOwner,
      });

      const id = await ethAdapter.getChainId();
      const contractNetworks: ContractNetworksConfig = {
        [id]: {
          multiSendAddress: "0xA238CBeb142c10Ef7Ad8442C6D1f9E89e07e7761",
          safeMasterCopyAddress: "0xd9Db270c1B5E3Bd161E8c8503c55cEABeE709552",
          safeProxyFactoryAddress: "0xa6B71E26C5e0845f74c812102Ca7114b6a896AB2",
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
      safeAddress = newSafeAddress;
      console.log("Safe deployed to: ", newSafeAddress);

      const VelvetSafeModule = await ethers.getContractFactory(
        "VelvetSafeModule"
      );
      velvetSafeModule = await VelvetSafeModule.deploy(newSafeAddress);
      await velvetSafeModule.deployed();
      console.log("VelvetSafeModule deployed to: ", velvetSafeModule.address);

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

      const PriceOracle = await ethers.getContractFactory("PriceOracle");
      priceOracle = await PriceOracle.deploy();
      await priceOracle.deployed();
      priceOracle.initialize(addresses.PancakeSwapRouterAddress);

      const TokenMetadata = await ethers.getContractFactory("TokenMetadata");
      tokenMetadata = await TokenMetadata.deploy();
      await tokenMetadata.deployed();

      if (chainId == "56") {
        tokenMetadata.add(
          ethInstance.address,
          "0xf508fCD89b8bd15579dc79A6827cB4686A3592c8"
        );

        tokenMetadata.addBNB();
      }

      const IndexSwapLibrary = await ethers.getContractFactory(
        "IndexSwapLibrary"
      );
      indexSwapLibrary = await IndexSwapLibrary.deploy(
        priceOracle.address,
        addresses.WETH_Address,
        tokenMetadata.address
      );
      await indexSwapLibrary.deployed();

      const AccessController = await ethers.getContractFactory(
        "AccessController"
      );
      const accessController = await AccessController.deploy();
      await accessController.deployed();

      const Adapter = await ethers.getContractFactory("Adapter");
      adapter = await Adapter.deploy(
        accessController.address,
        addresses.PancakeSwapRouterAddress,
        velvetSafeModule.address,
        tokenMetadata.address
      );
      await adapter.deployed();

      const IndexSwap = await ethers.getContractFactory("IndexSwap");
      indexSwap = await IndexSwap.deploy(
        "INDEXLY",
        "IDX",
        addresses.WETH_Address,
        safeAddress,
        "500000000000000000000",
        indexSwapLibrary.address,
        adapter.address,
        accessController.address,
        tokenMetadata.address,
        "100",
        owner.address
      );
      await indexSwap.deployed();

      const Rebalancing = await ethers.getContractFactory("Rebalancing");
      rebalancing = await Rebalancing.deploy(
        indexSwapLibrary.address,
        adapter.address,
        accessController.address,
        tokenMetadata.address
      );
      await rebalancing.deployed();

      if (
        velvetSafeModule.address != "0x0000000000000000000000000000000000000000"
      ) {
        await velvetSafeModule.addOwner(adapter.address);
      }

      await busdInstance
        .connect(vault)
        .approve(adapter.address, approve_amount);
      await wbnbInstance
        .connect(vault)
        .approve(adapter.address, approve_amount);
      await daiInstance.connect(vault).approve(adapter.address, approve_amount);
      await ethInstance.connect(vault).approve(adapter.address, approve_amount);
      await btcInstance.connect(vault).approve(adapter.address, approve_amount);

      console.log("indexSwap deployed to:", indexSwap.address);
    });

    describe("IndexSwap Contract", function () {
      it("should check Index token name and symbol", async () => {
        expect(await indexSwap.name()).to.eq("INDEXLY");
        expect(await indexSwap.symbol()).to.eq("IDX");
      });
      it("initialize should revert if total Weights not equal 10,000", async () => {
        await expect(
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
            ],
            [100, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000]
          )
        ).to.be.revertedWith("INVALID_WEIGHTS");
      });
      it("Initialize IndexFund Tokens", async () => {
        await indexSwap.init(
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
          ],
          [1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000]
        );
      });

      it("Invest 0.1BNB into Top10 fund", async () => {
        const indexSupplyBefore = await indexSwap.totalSupply();
        //console.log("0.1bnb before", indexSupplyBefore);
        await indexSwap.investInFund({
          value: "100000000000000000",
        });
        const indexSupplyAfter = await indexSwap.totalSupply();

        const valuesAfter = await indexSwapLibrary.getTokenAndVaultBalance(
          indexSwap.address
        );
        const receipt = await valuesAfter.wait();

        let vaultBalance;
        let tokenBalances;

        if (
          receipt.events &&
          receipt.events[0] &&
          receipt.events[0].args &&
          receipt.events[0].args.tokenBalances
        ) {
          tokenBalances = receipt.events[0].args.tokenBalances;
          vaultBalance = receipt.events[0].args.vaultValue;
        }

        if (
          receipt.events &&
          receipt.events[1] &&
          receipt.events[1].args &&
          receipt.events[1].args.tokenBalances
        ) {
          tokenBalances = receipt.events[1].args.tokenBalances;
          vaultBalance = receipt.events[1].args.vaultValue;
        }

        if (
          receipt.events &&
          receipt.events[2] &&
          receipt.events[2].args &&
          receipt.events[2].args.tokenBalances
        ) {
          tokenBalances = receipt.events[2].args.tokenBalances;
          vaultBalance = receipt.events[2].args.vaultValue;
        }

        bnbBefore = Number(vaultBalance);

        expect(Number(indexSupplyAfter)).to.be.greaterThanOrEqual(
          Number(indexSupplyBefore)
        );
      });

      it("Invest 2BNB into Top10 fund", async () => {
        const indexSupplyBefore = await indexSwap.totalSupply();
        //console.log("0.2bnb before", indexSupplyBefore);
        await indexSwap.investInFund({
          value: "2000000000000000000",
        });
        const indexSupplyAfter = await indexSwap.totalSupply();

        const valuesAfter = await indexSwapLibrary.getTokenAndVaultBalance(
          indexSwap.address
        );
        const receipt = await valuesAfter.wait();

        let vaultBalance;
        let tokenBalances;

        if (
          receipt.events &&
          receipt.events[0] &&
          receipt.events[0].args &&
          receipt.events[0].args.tokenBalances
        ) {
          tokenBalances = receipt.events[0].args.tokenBalances;
          vaultBalance = receipt.events[0].args.vaultValue;
        }

        if (
          receipt.events &&
          receipt.events[1] &&
          receipt.events[1].args &&
          receipt.events[1].args.tokenBalances
        ) {
          tokenBalances = receipt.events[1].args.tokenBalances;
          vaultBalance = receipt.events[1].args.vaultValue;
        }

        if (
          receipt.events &&
          receipt.events[2] &&
          receipt.events[2].args &&
          receipt.events[2].args.tokenBalances
        ) {
          tokenBalances = receipt.events[2].args.tokenBalances;
          vaultBalance = receipt.events[2].args.vaultValue;
        }

        bnbAfter = Number(vaultBalance);

        expect(Number(indexSupplyAfter)).to.be.greaterThanOrEqual(
          Number(indexSupplyBefore)
        );
      });

      it("BNB amount increases after investing", async () => {
        expect(bnbAfter).to.be.gt(bnbBefore);
      });

      it("Invest 1BNB into Top10 fund", async () => {
        const indexSupplyBefore = await indexSwap.totalSupply();
        //console.log("0.1bnb before", indexSupplyBefore);
        await indexSwap.investInFund({
          value: "1000000000000000000",
        });
        const indexSupplyAfter = await indexSwap.totalSupply();
        //console.log("1bnb after", indexSupplyAfter);

        expect(Number(indexSupplyAfter)).to.be.greaterThanOrEqual(
          Number(indexSupplyBefore)
        );
      });

      it("Investment should fail when contract is paused", async () => {
        await rebalancing.setPause(indexSwap.address, true);
        await expect(
          indexSwap.investInFund({
            value: "1000000000000000000",
          })
        ).to.be.reverted;
      });

      it("update Weights should revert if total Weights not equal 10,000", async () => {
        await expect(
          rebalancing.updateWeights(
            indexSwap.address,
            [100, 500, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000]
          )
        ).to.be.revertedWith("INVALID_WEIGHTS");
      });

      it("should revert to charge fees", async () => {
        await expect(
          rebalancing.feeModule(indexSwap.address)
        ).to.be.revertedWith(
          "Fee has already been charged after the last rebalancing!"
        );
      });

      it("should Update Weights and Rebalance", async () => {
        await rebalancing.updateWeights(
          indexSwap.address,
          [1500, 500, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000]
        );
      });

      it("should charge fees", async () => {
        await rebalancing.feeModule(indexSwap.address);
      });

      it("should Update Weights and Rebalance", async () => {
        await rebalancing.updateWeights(
          indexSwap.address,
          [1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000]
        );
      });

      it("updateTokens should revert if total Weights not equal 10,000", async () => {
        await expect(
          rebalancing.updateTokens(
            indexSwap.address,
            [ethInstance.address, daiInstance.address, wbnbInstance.address],
            [2000, 6000, 1000]
          )
        ).to.be.revertedWith("INVALID_WEIGHTS");
      });

      it("should update tokens", async () => {
        // current = BUSD:ETH = 1:2
        // target = ETH:DAI:WBNB = 1:3:1

        let beforeTokenXBalance;
        let beforeVaultValue;

        await rebalancing.updateTokens(
          indexSwap.address,
          [ethInstance.address, daiInstance.address, wbnbInstance.address],
          [2000, 6000, 2000]
        );
      });

      it("withdrawal should revert when contract is paused", async () => {
        const amountIndexToken = await indexSwap.balanceOf(owner.address);
        const updateAmount = parseInt(amountIndexToken.toString()) + 1;
        const AMOUNT = ethers.BigNumber.from(updateAmount.toString()); //

        await expect(indexSwap.withdrawFund(AMOUNT)).to.be.revertedWith(
          "The contract is paused !"
        );
      });

      it("should unpause", async () => {
        await rebalancing.setPause(indexSwap.address, false);
      });

      it("when withdraw fund more then balance", async () => {
        const amountIndexToken = await indexSwap.balanceOf(owner.address);
        const updateAmount = parseInt(amountIndexToken.toString()) + 1;
        const AMOUNT = ethers.BigNumber.from(updateAmount.toString()); //

        await expect(
          indexSwap.connect(nonOwner).withdrawFund(AMOUNT)
        ).to.be.revertedWith("caller is not holding given token amount");
      });

      it("should withdraw fund and burn index token successfully", async () => {
        const amountIndexToken = await indexSwap.balanceOf(owner.address);
        //console.log(amountIndexToken, "amountIndexToken");
        const AMOUNT = ethers.BigNumber.from(amountIndexToken); //1BNB

        txObject = await indexSwap.withdrawFund(AMOUNT);

        expect(txObject.confirmations).to.equal(1);
      });
    });
  });
});
