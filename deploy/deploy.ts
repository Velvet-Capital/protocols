import { HardhatRuntimeEnvironment, Network } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { chainIdToAddresses } from "../scripts/networkVariables";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy, execute } = deployments;

  const { deployer } = await getNamedAccounts();
  // get current chainId
  const chainId = parseInt(await hre.getChainId());
  const addresses = chainIdToAddresses[chainId];

  const priceOracle = await deploy("PriceOracle", {
    from: deployer,
    log: true,
  });
  await execute(
    "PriceOracle",
    {
      from: deployer,
      log: true,
    },
    "initialize",
    addresses.PancakeSwapRouterAddress
  );

  const tokenMetadata = await deploy("TokenMetadata", {
    from: deployer,
    log: true,
  });

  const accessController = await deploy("AccessController", {
    from: deployer,
    log: true,
  });

  const indexSwapLibrary = await deploy("IndexSwapLibrary", {
    args: [priceOracle.address, addresses.WETH_Address, tokenMetadata.address],
    from: deployer,
    log: true,
  });

  const adapter = await deploy("Adapter", {
    args: [
      accessController.address,
      addresses.PancakeSwapRouterAddress,
      addresses.Module,
      tokenMetadata.address,
    ],
    from: deployer,
    log: true,
  });

  const rebalancing = await deploy("Rebalancing", {
    args: [
      indexSwapLibrary.address,
      adapter.address,
      accessController.address,
      tokenMetadata.address,
    ],
    from: deployer,
    log: true,
  });

  const indexFactory = await deploy("IndexFactory", {
    from: deployer,
    log: true,
  });

  await execute(
    "IndexFactory",
    {
      from: deployer,
      log: true,
    },
    "createIndex",
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
    deployer
  );
};
export default func;
func.tags = [
  "PriceOracle",
  "TokenMetadata",
  "AccessController",
  "IndexSwapLibrary",
  "Adapter",
  "Rebalancing",
  "IndexFactory",
];
