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
        "1",
        owner.address
      );
      await indexSwap.deployed();

      const Rebalancing = await ethers.getContractFactory("Rebalancing");
      rebalancing = await Rebalancing.deploy(
        indexSwap.address,
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
            [busdInstance.address, ethInstance.address],
            [100, 1000]
          )
        ).to.be.revertedWith("INVALID_WEIGHTS");
      });
      it("Initialize IndexFund Tokens", async () => {
        await indexSwap.init(
          [busdInstance.address, ethInstance.address],
          [5000, 5000]
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
        console.log(receipt);

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

        if (
          receipt.events &&
          receipt.events[3] &&
          receipt.events[3].args &&
          receipt.events[3].args.tokenBalances
        ) {
          tokenBalances = receipt.events[3].args.tokenBalances;
          vaultBalance = receipt.events[3].args.vaultValue;
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

        expect(Number(indexSupplyAfter)).to.be.greaterThanOrEqual(
          Number(indexSupplyBefore)
        );
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
        await rebalancing.setPause(true);
        await expect(
          indexSwap.investInFund({
            value: "1000000000000000000",
          })
        ).to.be.reverted;
      });

      it("update Weights should revert if total Weights not equal 10,000", async () => {
        await expect(
          rebalancing.updateWeights([6667, 3330])
        ).to.be.revertedWith("INVALID_WEIGHTS");
      });

      it("should revert to charge fees", async () => {
        await expect(rebalancing.feeModule()).to.be.revertedWith(
          "Fee has already been charged after the last rebalancing!"
        );
      });

      it("should Update Weights and Rebalance", async () => {
        await rebalancing.updateWeights([6667, 3333]);
      });

      it("should Update Weights and Rebalance", async () => {
        await rebalancing.updateWeights([5000, 5000]);
      });

      it("should Update Weights and Rebalance", async () => {
        await rebalancing.updateWeights([3333, 6667]);
      });

      it("should charge fees", async () => {
        await rebalancing.feeModule();
      });

      it("updateTokens should revert if total Weights not equal 10,000", async () => {
        await expect(
          rebalancing.updateTokens(
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
        await rebalancing.setPause(false);
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
