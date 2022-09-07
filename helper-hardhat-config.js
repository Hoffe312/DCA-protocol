const networkConfig = {
  31337: {
    name: "localhost",
    wethToken: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    lendingPoolAddressesProvider: "0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5",
    daiEthPriceFeed: "0x773616E4d11A78F511299002da57A0a94577F1f4",
    daiToken: "0x6b175474e89094c44da98b954eedeac495271d0f",
  },
  420: {
    name: "goerli",
    wethToken: "0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6",
    daiToken: "0xdc31ee1784292379fbb2964b3b9c4124d8f89c60",
  },
};

const developmentChains = ["hardhat", "localhost"];

module.exports = { networkConfig, developmentChains };
