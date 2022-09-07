const { ethers, getNamedAccounts, network } = require("hardhat");

const AMOUNT = ethers.utils.parseEther("0.1");

async function main() {
  const { deployer } = await getNamedAccounts();
  const tokenlock = await ethers.getContractAt(
    "DCAProtocol",
    "0xfCF88Ba71825B14c93703BE54bcff9C5a34EC7a1",
    deployer
  );
  const tx_deposit = await tokenlock.deposit({ value: AMOUNT });
  console.log(`deposited ${AMOUNT} ether`);
  await tx_deposit.wait(1);

  let balance = await tokenlock.getBal();
  console.log(balance.toString());

  const tx_send = await tokenlock.withdraw(balance);
  console.log("Balance withdrawn");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
