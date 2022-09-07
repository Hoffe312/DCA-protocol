const { network, ethers } = require("hardhat");
const {
  netwprkConfig,
  developmentChains,
} = require("../helper-hardhat-config");
const verify = require("../utils/verify");

module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();
  const chainId = network.config.chainId;

  const TokenLock = await deploy("DCAProtocol", {
    from: deployer,
    args: [],
    log: true,
  });
  log("TokenLock deployed!!");
};
module.exports.tags = ["all", "tokenlock"];
