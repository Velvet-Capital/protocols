import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Price } from "@uniswap/sdk";
import { expect } from "chai";
import { ethers } from "hardhat";
import { PriceOracleNew, IERC20__factory } from "../typechain";
import { chainIdToAddresses } from "../scripts/networkVariables";

describe("Price Oracle", () => {
  let priceOracleNew: PriceOracleNew;
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

    const PriceOracleNew = await ethers.getContractFactory("PriceOracleNew");
    priceOracleNew = await PriceOracleNew.deploy();

    await priceOracleNew.deployed();
    await priceOracleNew.initialize(addresses.PancakeSwapRouterAddress);

    await priceOracleNew.initPair("0x61EB789d75A95CAa3fF50ed7E47b96c132fEc082");
  });
  // BTC
});
