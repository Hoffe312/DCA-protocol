const { ethers, getNamedAccounts, network } = require("hardhat");
const tokenlock = require("../deploy/00-deploy-token-lock");
const AMOUNT = ethers.utils.parseEther("0.1");

async function main() {
  const { deployer } = await getNamedAccounts();
  const tokenlock = await ethers.getContractAt(
    "DCAProtocol",
    tokenlock.address,
    deployer
  );
  const tx_deposit = await tokenlock.deposit({ value: AMOUNT });
  console.log(`deposited ${AMOUNT} ether`);
  await tx_deposit.wait(1);

  const balance = await tokenlock.getBal();
  console.log(balance.toString());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
