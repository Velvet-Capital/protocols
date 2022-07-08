import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import {
  IndexSwap,
  PriceOracle,
  IERC20__factory,
  IndexFactory,
  IndexSwapLibrary,
  Adapter,
  AccessController,
  Rebalancing,
  TokenMetadata,
} from "../typechain";
import { chainIdToAddresses } from "../scripts/networkVariables";

//use default BigNumber
// chai.use(require("chai-bignumber")());

describe.skip("Tests for IndexFactory", () => {
  let accounts;
  let priceOracle: PriceOracle;
  let indexSwap: IndexSwap;
  let indexFactory: IndexFactory;
  let indexSwapLibrary: IndexSwapLibrary;
  let adapter: Adapter;
  let rebalancing: Rebalancing;
  let accessController: AccessController;
  let tokenMetadata: TokenMetadata;
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
  // const wbnbInstance.address =addresses.WETH_Address;
  // const btcInstance.address = addresses.BTC_Address;
  // const ethInstance.address = addresses.ETH_Address;
  describe.only("Tests for IndexFactory contract", () => {
    before(async () => {
      accounts = await ethers.getSigners();
      [owner, investor1, nonOwner, vault, addr1, addr2, ...addrs] = accounts;

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
      accessController = await AccessController.deploy();
      await accessController.deployed();

      const Adapter = await ethers.getContractFactory("Adapter");
      adapter = await Adapter.deploy(
        accessController.address,
        addresses.PancakeSwapRouterAddress,
        addresses.Module,
        tokenMetadata.address
      );
      await adapter.deployed();

      const IndexFactory = await ethers.getContractFactory("IndexFactory");
      indexFactory = await IndexFactory.deploy();
      await indexFactory.deployed();

      let indexAddress = "";

      const index = await indexFactory.createIndex(
        "INDEXLY",
        "IDX",
        addresses.PancakeSwapRouterAddress,
        addresses.WETH_Address,
        addresses.Vault,
        addresses.Module,
        "500000000000000000000",
        indexSwapLibrary.address,
        tokenMetadata.address,
        "250",
        owner.address
      );
      index.wait();

      const result = index.to;
      if (result) {
        indexAddress = result.toString();
      }

      const IndexSwap = await ethers.getContractFactory("IndexSwap");
      indexSwap = await IndexSwap.attach(indexAddress);

      const Rebalancing = await ethers.getContractFactory("Rebalancing");
      rebalancing = await Rebalancing.deploy(
        indexSwapLibrary.address,
        adapter.address,
        accessController.address,
        tokenMetadata.address
      );
      await rebalancing.deployed();

      const VelvetSafeModule = ethers.getContractFactory("VelvetSafeModule");
      let myModule = (await VelvetSafeModule).attach(addresses.Module);
      await myModule.addOwner(adapter.address);

      console.log("indexSwap deployed to:", indexSwap.address);
    });

    describe("IndexFactory Contract", function () {
      it("init", async () => {
        let indexAddress = "";

        const index = await indexFactory.createIndex(
          "INDEXLY",
          "IDX",
          addresses.PancakeSwapRouterAddress,
          addresses.WETH_Address,
          addresses.Vault,
          addresses.Module,
          "500000000000000000000",
          addresses.IndexSwapLibrary,
          tokenMetadata.address,
          "250",
          owner.address
        );

        console.log("index return from factory", index);

        const result = index.to;
        if (result) {
          indexAddress = result.toString();
        }

        const IndexSwap = await ethers.getContractFactory("IndexSwap");
        indexSwap = await IndexSwap.attach(indexAddress);
      });

      it("Initialize IndexFund Tokens", async () => {
        console.log(indexSwap.address);
      });

      it("Initialize IndexFund Tokens", async () => {
        await indexSwap
          .connect(owner)
          .init([busdInstance.address, ethInstance.address], [1, 1]);
      });

      it("Invest 0.1BNB into Top10 fund", async () => {
        const indexSupplyBefore = await indexSwap.totalSupply();
        //console.log("0.1bnb before", indexSupplyBefore);
        await indexSwap.investInFund({
          value: "100000000000000000",
        });
        const indexSupplyAfter = await indexSwap.totalSupply();
        //console.log("0.1bnb after", indexSupplyAfter);

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
        //console.log("2bnb after", indexSupplyAfter);

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

      it("should revert when Rebalance is called from an account which is not assigned as asset manager", async () => {
        await expect(
          rebalancing.connect(nonOwner).rebalance(indexSwap.address)
        ).to.be.revertedWith("Caller is not an Asset Manager");
      });

      it("updateWeights should revert if total Weights not equal 10,000", async () => {
        await expect(
          rebalancing.updateWeights(indexSwap.address, [100, 200])
        ).to.be.revertedWith("INVALID_WEIGHTS");
      });
      it("should Update Weights and Rebalance", async () => {
        let beforeTokenXBalance;
        let beforeVaultValue;

        const values = await indexSwapLibrary.getTokenAndVaultBalance(
          indexSwap.address
        );
        const receipt = await values.wait();

        if (
          receipt.events &&
          receipt.events[0] &&
          receipt.events[0].args &&
          receipt.events[0].args.tokenBalances
        ) {
          beforeTokenXBalance = receipt.events[0].args.tokenBalances;
          beforeVaultValue = receipt.events[0].args.vaultValue;
        }

        if (
          receipt.events &&
          receipt.events[1] &&
          receipt.events[1].args &&
          receipt.events[1].args.tokenBalances
        ) {
          beforeTokenXBalance = receipt.events[1].args.tokenBalances;
          beforeVaultValue = receipt.events[1].args.vaultValue;
        }

        await rebalancing.updateWeights(indexSwap.address, [3333, 6667]);

        let afterTokenXBalance;
        let afterVaultValueBNB;

        const valuesAfter = await indexSwapLibrary.getTokenAndVaultBalance(
          indexSwap.address
        );
        const receiptAfter = await valuesAfter.wait();

        if (
          receiptAfter.events &&
          receiptAfter.events[0] &&
          receiptAfter.events[0].args &&
          receiptAfter.events[0].args.tokenBalances
        ) {
          afterTokenXBalance = receiptAfter.events[0].args.tokenBalances;
          afterVaultValueBNB = receiptAfter.events[0].args.vaultValue;
        }

        if (
          receiptAfter.events &&
          receiptAfter.events[1] &&
          receiptAfter.events[1].args &&
          receiptAfter.events[1].args.tokenBalances
        ) {
          afterTokenXBalance = receiptAfter.events[1].args.tokenBalances;
          afterVaultValueBNB = receiptAfter.events[1].args.vaultValue;
        }

        const afterToken0Bal = Number(
          ethers.utils.formatEther(afterTokenXBalance[0])
        );
        const afterToken1Bal = Number(
          ethers.utils.formatEther(afterTokenXBalance[1])
        );
        const afterVaultValue = Number(
          ethers.utils.formatEther(afterVaultValueBNB)
        );

        expect(Math.ceil((afterToken0Bal * 10) / afterVaultValue)).to.be.gte(
          (3333 * 10) / 10000
        );
        expect(Math.ceil((afterToken1Bal * 10) / afterVaultValue)).to.be.gte(
          (6667 * 10) / 10000
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

        const values = await indexSwapLibrary.getTokenAndVaultBalance(
          indexSwap.address
        );
        const receipt = await values.wait();

        if (
          receipt.events &&
          receipt.events[0] &&
          receipt.events[0].args &&
          receipt.events[0].args.tokenBalances
        ) {
          beforeTokenXBalance = receipt.events[0].args.tokenBalances;
          beforeVaultValue = receipt.events[0].args.vaultValue;
        }

        if (
          receipt.events &&
          receipt.events[2] &&
          receipt.events[2].args &&
          receipt.events[2].args.tokenBalances
        ) {
          beforeTokenXBalance = receipt.events[2].args.tokenBalances;
          beforeVaultValue = receipt.events[2].args.vaultValue;
        }

        await rebalancing.updateTokens(
          indexSwap.address,
          [ethInstance.address, daiInstance.address, wbnbInstance.address],
          [2000, 6000, 2000]
        );

        let afterTokenXBalance;
        let afterVaultValueBNB;

        const valuesAfter = await indexSwapLibrary.getTokenAndVaultBalance(
          indexSwap.address
        );
        const receiptAfter = await valuesAfter.wait();

        if (
          receiptAfter.events &&
          receiptAfter.events[0] &&
          receiptAfter.events[0].args &&
          receiptAfter.events[0].args.tokenBalances
        ) {
          afterTokenXBalance = receiptAfter.events[0].args.tokenBalances;
          afterVaultValueBNB = receiptAfter.events[0].args.vaultValue;
        }

        if (
          receiptAfter.events &&
          receiptAfter.events[1] &&
          receiptAfter.events[1].args &&
          receiptAfter.events[1].args.tokenBalances
        ) {
          afterTokenXBalance = receiptAfter.events[1].args.tokenBalances;
          afterVaultValueBNB = receiptAfter.events[1].args.vaultValue;
        }

        if (
          receiptAfter.events &&
          receiptAfter.events[2] &&
          receiptAfter.events[2].args &&
          receiptAfter.events[2].args.tokenBalances
        ) {
          afterTokenXBalance = receiptAfter.events[2].args.tokenBalances;
          afterVaultValueBNB = receiptAfter.events[2].args.vaultValue;
        }

        const afterETHBal = Number(
          ethers.utils.formatEther(afterTokenXBalance[0])
        );
        const afterDAIBal = Number(
          ethers.utils.formatEther(afterTokenXBalance[1])
        );
        const afterWBNBBal = Number(
          ethers.utils.formatEther(afterTokenXBalance[2])
        );
        const afterVaultValue = Number(
          ethers.utils.formatEther(afterVaultValueBNB)
        );

        expect(Math.ceil((afterETHBal * 10) / afterVaultValue)).to.be.gte(
          (2000 * 10) / 10000
        );
        expect(Math.ceil((afterDAIBal * 10) / afterVaultValue)).to.be.gte(
          (6000 * 10) / 10000
        );
        expect(Math.ceil((afterWBNBBal * 10) / afterVaultValue)).to.be.gte(
          (2000 * 10) / 10000
        );
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
