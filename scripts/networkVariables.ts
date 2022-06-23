const { parseEther } = require("@ethersproject/units");

interface ChainAddresses {
  [contractName: string]: string;
}
const infuraApiKey = process.env.INFURA_API_KEY;

export const ETHMainNet: ChainAddresses = {
  RpcUrl: "https://mainnet.infura.io/v3/" + infuraApiKey + "",
  UniswapV2RouterAddress: "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
  UniswapV2FactoryAddress: "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f",
  WETH_Address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
  DAI_Address: "0x6B175474E89094C44Da98b954EedeAC495271d0F",

  //ChainLink
  LINK_Address: "0x514910771af9ca656af840dff83e8264ecf986ca",
  VRFCoordinator: "0xf0d54349aDdcf704F77AE15b96510dEA15cb7952",
  VRFKeyHash:
    "0xAA77729D3466CA35AE8D28B3BBAC7CC36A5031EFDC430821C02BC31A238AF445",
  VRFFee: parseEther("2.0"), //2 LINK fee
};

export const BSCTestNet: ChainAddresses = {
  RpcUrl: `https://data-seed-prebsc-2-s3.binance.org:8545/`,
  PancakeSwapRouterAddress: "0x9Ac64Cc6e4415144C455BD8E4837Fea55603e5c3",
  Vault: "0x07C0737fdc21adf93200bd625cc70a66B835Cf8b",
  ETH_Address: "0x8BaBbB98678facC7342735486C851ABD7A0d17Ca",
  DAI_Address: "0x8a9424745056Eb399FD19a0EC26A14316684e274",
  PancakeSwapV2RouterAddress: "0xCDe540d7eAFE93aC5fE6233Bee57E1270D3E330F",
  PancakeSwapV2FactoryAddress: "0x01bF7C66c6BD861915CdaaE475042d3c4BaE16A7",
  WETH_Address: "0xae13d989dac2f0debff460ac112a837c89baa7cd",
  BTC_Address: "0x4b1851167f74FF108A994872A160f1D6772d474b",
  BUSD: "0x78867BbEeF44f2326bF8DDd1941a4439382EF2A7",

  //ChainLink
  LINK_Address: "0x84b9B910527Ad5C03A9Ca831909E21e236EA7b06",
  VRFCoordinator: "0xa555fC018435bef5A13C6c6870a9d4C11DEC329C",
  VRFKeyHash:
    "0xc251acd21ec4fb7f31bb8868288bfdbaeb4fbfec2df3735ddbd4f7dc8d60103c",
  VRFFee: parseEther("0.1"), //0.1 LINK fee
};

export const BSCMainNet: ChainAddresses = {
  RpcUrl: `https://bsc-dataseed.binance.org/`,
  PancakeSwapRouterAddress: "0x10ED43C718714eb63d5aA57B78B54704E256024E",
  PancakeSwapV2RouterAddress: "0x10ED43C718714eb63d5aA57B78B54704E256024E",
  PancakeSwapV2FactoryAddress: "0xca143ce32fe78f1f7019d7d551a6402fc5350c73",
  WETH_Address: "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c",
  BUSD: "0xe9e7cea3dedca5984780bafc599bd69add087d56",

  Vault: "0x02B9eDF79660c2b5A24f2C379294bDe265Fd5c34",
  Module: "0x7250C7A64C5BCbe4815E905C10F822C2DA7358Ef",
  ETH_Address: "0x2170Ed0880ac9A755fd29B2688956BD959F933F8",
  DAI_Address: "0x1AF3F329e8BE154074D8769D1FFa4eE058B1DBc3",
  BTC_Address: "0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c",

  //ChainLink
  LINK_Address: "0x404460C6A5EdE2D891e8297795264fDe62ADBB75",
  VRFCoordinator: "0x747973a5A2a4Ae1D3a8fDF5479f1514F65Db9C31",
  VRFKeyHash:
    "0xc251acd21ec4fb7f31bb8868288bfdbaeb4fbfec2df3735ddbd4f7dc8d60103c",
  VRFFee: parseEther("0.2"), //0.2 LINK fee
};

export const MaticMainNet: ChainAddresses = {
  QuickSwapV2RouterAddress: "0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff",
  QuickSwapV2FactoryAddress: "0x5757371414417b8c6caad45baef941abc7d3ab32",
  WETH_Address: "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270",
  DAI: "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063",
};

export const Fantom: ChainAddresses = {
  // https://docs.spookyswap.finance/contracts-1/contracts
  QuickSwapV2RouterAddress: "0xF491e7B69E4244ad4002BC14e878a34207E38c29",
  QuickSwapV2FactoryAddress: "0x152eE697f2E276fA89E96742e9bB9aB1F2E61bE3",
  WETH_Address: "0x21be370D5312f44cB42ce377BC9b8a0cEF1A4C83",
  DAI: "0x8D11eC38a3EB5E956B052f67Da8Bdc9bef8Abf3E",
};

export const chainIdToAddresses: {
  [id: number]: { [contractName: string]: string };
} = {
  1: { ...ETHMainNet },
  97: { ...BSCTestNet },
  56: { ...BSCMainNet },
  137: { ...MaticMainNet },
  250: { ...Fantom },
};
