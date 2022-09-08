const { network, ethers } = require("hardhat");
const {
  networkConfig,
  developmentChains,
} = require("../helper-hardhat-config");
const verify = require("../utils/verify");
const interval = 2;
const amount = ethers.utils.parseEther("0.01");
module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();
  const chainId = network.config.chainId;

  const TokenLock = await deploy("DCAProtocol", {
    from: deployer,
    args: [amount, interval],
    log: true,
  });
  log("TokenLock deployed!!");
};
module.exports.tags = ["all", "tokenlock"];
