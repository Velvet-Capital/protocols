import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import {
  IndexSwap,
  PriceOracle,
  IERC20__factory,
  IndexSwapLibrary,
  IndexManager,
  Rebalancing,
  AccessController,
  TokenMetadata,
} from "../typechain";
import { chainIdToAddresses } from "../scripts/networkVariables";

//use default BigNumber
// chai.use(require("chai-bignumber")());

describe.only("Tests for IndexSwap", () => {
  let accounts;
  let priceOracle: PriceOracle;
  let indexSwap: IndexSwap;
  let indexSwapLibrary: IndexSwapLibrary;
  let indexManager: IndexManager;
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

      const priceProxy = await upgrades.deployProxy(PriceOracle, [
        addresses.PancakeSwapRouterAddress,
      ]);
      await priceProxy.deployed();
      priceOracle = PriceOracle.attach(priceProxy.address);

      const TokenMetadata = await ethers.getContractFactory("TokenMetadata");
      tokenMetadata = await TokenMetadata.deploy();
      await tokenMetadata.deployed();

      tokenMetadata.add(
        ethInstance.address,
        "0xf508fCD89b8bd15579dc79A6827cB4686A3592c8"
      );

      const IndexSwapLibrary = await ethers.getContractFactory(
        "IndexSwapLibrary"
      );
      const libraryProxy = await upgrades.deployProxy(IndexSwapLibrary, [
        priceOracle.address,
        addresses.WETH_Address,
        tokenMetadata.address,
      ]);
      await libraryProxy.deployed();
      indexSwapLibrary = IndexSwapLibrary.attach(libraryProxy.address);

      const AccessController = await ethers.getContractFactory(
        "AccessController"
      );
      const accessController = await AccessController.deploy();
      await accessController.deployed();

      const IndexManager = await ethers.getContractFactory("IndexManager");
      const indexManager = await IndexManager.deploy(
        accessController.address,
        addresses.PancakeSwapRouterAddress,
        addresses.Module,
        tokenMetadata.address
      );

      await indexManager.deployed();

      const IndexSwap = await ethers.getContractFactory("IndexSwap");
      const indexProxy = await upgrades.deployProxy(IndexSwap, [
        "INDEXLY",
        "IDX",
        addresses.WETH_Address,
        addresses.Vault,
        "500000000000000000000",
        indexSwapLibrary.address,
        indexManager.address,
        accessController.address,
        tokenMetadata.address,
      ]);
      await indexProxy.deployed();
      indexSwap = IndexSwap.attach(indexProxy.address);

      const Rebalancing = await ethers.getContractFactory("Rebalancing");
      const rebalanceProxy = await upgrades.deployProxy(Rebalancing, [
        indexSwapLibrary.address,
        indexManager.address,
        accessController.address,
        tokenMetadata.address,
      ]);
      await rebalanceProxy.deployed();
      rebalancing = Rebalancing.attach(rebalanceProxy.address);

      const MyModule = ethers.getContractFactory("MyModule");
      let myModule = (await MyModule).attach(addresses.Module);
      await myModule.addOwner(indexManager.address);

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
          [busdInstance.address, ethInstance.address],
          [5000, 5000]
        );
      });

      it("Invest 0.1BNB into Top10 fund", async () => {
        const indexSupplyBefore = await indexSwap.totalSupply();
        console.log("0.1bnb before", indexSupplyBefore);
        await indexSwap.investInFund({
          value: "100000000000000000",
        });
        const indexSupplyAfter = await indexSwap.totalSupply();
        console.log("0.1bnb after", indexSupplyAfter);

        expect(Number(indexSupplyAfter)).to.be.greaterThanOrEqual(
          Number(indexSupplyBefore)
        );
      });

      it("Invest 2BNB into Top10 fund", async () => {
        const indexSupplyBefore = await indexSwap.totalSupply();
        console.log("0.2bnb before", indexSupplyBefore);
        await indexSwap.investInFund({
          value: "2000000000000000000",
        });
        const indexSupplyAfter = await indexSwap.totalSupply();
        console.log("2bnb after", indexSupplyAfter);

        expect(Number(indexSupplyAfter)).to.be.greaterThanOrEqual(
          Number(indexSupplyBefore)
        );
      });

      it("Invest 1BNB into Top10 fund", async () => {
        const indexSupplyBefore = await indexSwap.totalSupply();
        console.log("0.1bnb before", indexSupplyBefore);
        await indexSwap.investInFund({
          value: "1000000000000000000",
        });
        const indexSupplyAfter = await indexSwap.totalSupply();
        console.log("1bnb after", indexSupplyAfter);

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
        await rebalancing.updateWeights(indexSwap.address, [3333, 6667]);
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

        await rebalancing.updateTokens(
          indexSwap.address,
          [ethInstance.address, daiInstance.address, wbnbInstance.address],
          [2000, 6000, 2000]
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
