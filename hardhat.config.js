require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-etherscan");
require("hardhat-deploy");
require("solidity-coverage");
require("hardhat-gas-reporter");
require("@nomiclabs/hardhat-solhint");
require("hardhat-contract-sizer");
require("dotenv").config();
const RINKEBY_RPC_URL = process.env.RINKEBY_RPC_URL || "";
const PRIVATE_KEY = process.env.PRIVATE_KEY || "0xkey";
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || "key";
const GOERLI_RPC_URL = process.env.GOERLI_RPC_URL || "";
const MAINNET_RPC_URL = process.env.MAINNET_RPC_URL || "";
const MATIC_RPC_URL = process.env.MATIC_RPC_URL || "";

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {
      chainId: 31337,
      blockConfirmations: 1,
      forking: {
        url: MATIC_RPC_URL,
      },
    },
    rinkeby: {
      chainId: 4,
      blockConfirmations: 6,
      url: RINKEBY_RPC_URL,
      accounts: [PRIVATE_KEY],
    },
    goerli: {
      chainId: 5,
      blockConfirmations: 6,
      url: GOERLI_RPC_URL,
      accounts: [PRIVATE_KEY],
    },
    matic: {
      chainId: 137,
      blockConfirmations: 6,
      url: MATIC_RPC_URL,
      accounts: [PRIVATE_KEY],
    },
  },
  solidity: {
    compilers: [
      { version: "0.8.16" },
      { version: "0.8.7" },
      { version: "0.6.0" },
      { version: "0.7.0" },
      { version: "0.7.6" },
      { version: "0.7.1" },
      { version: "0.6.6" },
      { version: "0.6.12" },
      { version: "0.4.19" },
    ],
  },
  namedAccounts: {
    deployer: {
      default: 0,
    },
    player: {
      default: 1,
    },
  },
  etherscan: {
    apiKey: {
      rinkeby: ETHERSCAN_API_KEY,
      goerli: ETHERSCAN_API_KEY,
    },
  },
};
