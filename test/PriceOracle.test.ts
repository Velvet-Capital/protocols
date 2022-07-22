import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Price } from "@uniswap/sdk";
import { expect } from "chai";
import { ethers } from "hardhat";
import { PriceOracle, IERC20__factory } from "../typechain";
import { chainIdToAddresses } from "../scripts/networkVariables";

describe("Price Oracle", () => {
  let priceOracle: PriceOracle;
  let owner: SignerWithAddress;
  let addr1: SignerWithAddress;
  let addr2: SignerWithAddress;
  let addrs: SignerWithAddress[];

  const forkChainId: any = process.env.FORK_CHAINID;
  const provider = ethers.provider;
  const chainId: any = forkChainId ? forkChainId : 97;
  const addresses = chainIdToAddresses[chainId];

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
  const linkInstance = new ethers.Contract(
    addresses.LINK_Address,
    IERC20__factory.abi,
    ethers.getDefaultProvider()
  );

  before(async () => {
    [owner, addr1, addr2, ...addrs] = await ethers.getSigners();

    const PriceOracle = await ethers.getContractFactory("PriceOracle");
    priceOracle = await PriceOracle.deploy();

    await priceOracle.deployed();

    await priceOracle.initPair("0x61EB789d75A95CAa3fF50ed7E47b96c132fEc082"); // WBNB, BTC
    await priceOracle.initPair("0x74E4716E431f45807DCF19f284c7aA99F18a4fbc"); // WBNB, ETH
    await priceOracle.initPair("0x58F876857a02D6762E0101bb5C46A8c1ED44Dc16"); // WBNB, BUSD
    await priceOracle.initPair("0x824eb9faDFb377394430d2744fa7C42916DE3eCe"); // WBNB, LINK

    // Timeout
    setTimeout(() => {
      console.log("Delayed for 10 second.");
    }, 10000);

    await priceOracle.update("0x61EB789d75A95CAa3fF50ed7E47b96c132fEc082"); // WBNB, BTC
    await priceOracle.update("0x74E4716E431f45807DCF19f284c7aA99F18a4fbc"); // WBNB, ETH
    await priceOracle.update("0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56"); // WBNB, BUSD
    await priceOracle.update("0x824eb9faDFb377394430d2744fa7C42916DE3eCe"); // WBNB, LINK
  });
  // BTC
  it("Get token price of BTC", async () => {
    const btc = addresses.btc;
    const wbnb = addresses.wbnb;
    priceOracle.getTokenPrice(wbnb, btc, "1000000000000000000").then((resp) => {
      expect(resp).to.be.greaterThanOrEqual(0);
    });
  });

  it("Get pair address of BTC and WBNB", async () => {
    const btc = btcInstance.address;
    const wbnb = wbnbInstance.address;
    let pairAdress = "0x0000000000000000000000000000000000000000";
    priceOracle.getPair(btc, wbnb).then((resp) => {
      expect(pairAdress).not.to.be.equal(
        "0x0000000000000000000000000000000000000000"
      );
    });
  });

  it("Get pair address of ETH and WBNB", async () => {
    const eth = ethInstance.address;
    const wbnb = wbnbInstance.address;
    priceOracle.getPair(eth, wbnb).then((resp) => {
      expect(resp).not.to.be.equal(
        "0x0000000000000000000000000000000000000000"
      );
    });
  });

  it("Get ETH token price of WBNB", async () => {
    const eth = ethInstance.address;
    const wbnb = wbnbInstance.address;
    priceOracle.getTokenPrice(wbnb, eth, "1000000000000000000").then((resp) => {
      expect(resp).to.be.greaterThanOrEqual(0);
    });
  });

  it("Get pair address of USDT and WBNB", async () => {
    const usd = busdInstance.address;
    const wbnb = wbnbInstance.address;
    priceOracle.getPair(usd, wbnb).then((resp) => {
      expect(resp).not.to.be.equal(
        "0x0000000000000000000000000000000000000000"
      );
    });
  });

  it("Get USDT token price of WBNB", async () => {
    const usd = busdInstance.address;
    const wbnb = wbnbInstance.address;
    priceOracle.getTokenPrice(wbnb, usd, "1000000000000000000").then((resp) => {
      expect(resp).to.be.greaterThanOrEqual(0);
    });
  });
  // LINK
  it("Get token price of LINK", async () => {
    const link = linkInstance.address;
    const wbnb = wbnbInstance.address;
    priceOracle
      .getTokenPrice(wbnb, link, "1000000000000000000")
      .then((resp) => {
        expect(resp).to.be.greaterThanOrEqual(0);
      });
  });

  it("Get pair address of LINK and WBNB", async () => {
    const link = linkInstance.address;
    const wbnb = wbnbInstance.address;
    let pairAdress = "0x0000000000000000000000000000000000000000";
    priceOracle.getPair(link, wbnb).then((resp) => {
      expect(pairAdress).not.to.be.equal(
        "0x0000000000000000000000000000000000000000"
      );
    });
  });
});
