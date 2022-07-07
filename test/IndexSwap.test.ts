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
} from "../typechain";
import { chainIdToAddresses } from "../scripts/networkVariables";

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

  describe.only("Tests for IndexSwap contract", () => {
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

        tokenMetadata.add(
          wbnbInstance.address,
          "0xA07c5b74C9B40447a954e1466938b865b6BBea36"
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
      const accessController = await AccessController.deploy();
      await accessController.deployed();

      const Adapter = await ethers.getContractFactory("Adapter");
      adapter = await Adapter.deploy(
        accessController.address,
        addresses.PancakeSwapRouterAddress,
        addresses.Module,
        tokenMetadata.address
      );
      await adapter.deployed();

      const IndexSwap = await ethers.getContractFactory("IndexSwap");
      indexSwap = await IndexSwap.deploy(
        "INDEXLY",
        "IDX",
        addresses.WETH_Address,
        addresses.Vault,
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

      if (addresses.Module != "0x0000000000000000000000000000000000000000") {
        const VelvetSafeModule = ethers.getContractFactory("VelvetSafeModule");
        let myModule = (await VelvetSafeModule).attach(addresses.Module);
        await myModule.addOwner(adapter.address);
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
            [5000, 1000]
          )
        ).to.be.revertedWith("INVALID_WEIGHTS");
      });
      it("Initialize IndexFund Tokens", async () => {
        await indexSwap.init(
          [wbnbInstance.address, ethInstance.address],
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

      it("Invest 20BNB into Top10 fund", async () => {
        const indexSupplyBefore = await indexSwap.totalSupply();
        //console.log("0.2bnb before", indexSupplyBefore);
        await indexSwap.investInFund({
          value: "20000000000000000000",
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

      it("Print values", async () => {
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
        console.log("After last investment");
        console.log("tokens", afterTokenXBalance);
        console.log("vault", afterVaultValue);
        console.log(
          Number(ethers.utils.formatEther(afterTokenXBalance[0])) /
            afterVaultValue
        );
        console.log(
          Number(ethers.utils.formatEther(afterTokenXBalance[1])) /
            afterVaultValue
        );
        console.log("vault value", afterVaultValue);
        console.log("total supply", await indexSwap.totalSupply());
      });

      it("Investment should fail when contract is paused", async () => {
        await rebalancing.setPause(indexSwap.address, true);
        await expect(
          indexSwap.investInFund({
            value: "1000000000000000000",
          })
        ).to.be.reverted;
      });

      it("should revert when Rebalance is called from an account which is not assigned as asset manager", async () => {
        await expect(
          rebalancing.connect(nonOwner).rebalance(indexSwap.address)
        ).to.be.revertedWith("Caller is not an Asset Manager");
      });

      it("update Weights should revert if total Weights not equal 10,000", async () => {
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

        await rebalancing.updateWeights(indexSwap.address, [6667, 3333]);

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
          (6667 * 10) / 10000
        );
        expect(Math.ceil((afterToken1Bal * 10) / afterVaultValue)).to.be.gte(
          (3333 * 10) / 10000
        );
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

        await rebalancing.updateWeights(indexSwap.address, [5000, 5000]);

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

        console.log("After update weights");

        console.log(
          Number(ethers.utils.formatEther(afterTokenXBalance[0])) /
            afterVaultValue
        );
        console.log(
          Number(ethers.utils.formatEther(afterTokenXBalance[1])) /
            afterVaultValue
        );

        console.log("vault value", afterVaultValue);
        console.log("total supply", await indexSwap.totalSupply());

        expect(Math.ceil((afterToken0Bal * 10) / afterVaultValue)).to.be.gte(
          (5000 * 10) / 10000
        );
        expect(Math.ceil((afterToken1Bal * 10) / afterVaultValue)).to.be.gte(
          (5000 * 10) / 10000
        );
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

        console.log("After update tokens");
        console.log(
          Number(ethers.utils.formatEther(afterTokenXBalance[0])) /
            afterVaultValue
        );
        console.log(
          Number(ethers.utils.formatEther(afterTokenXBalance[1])) /
            afterVaultValue
        );
        console.log(
          Number(ethers.utils.formatEther(afterTokenXBalance[2])) /
            afterVaultValue
        );
        console.log("vault value", afterVaultValue);
        console.log("total supply", await indexSwap.totalSupply());

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
