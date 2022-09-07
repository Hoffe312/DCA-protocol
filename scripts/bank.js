const { ethers, getNamedAccounts, network } = require("hardhat");

const AMOUNT = ethers.utils.parseEther("0.1");

async function main() {
  const { deployer } = await getNamedAccounts();
  const tokenlock = await ethers.getContractAt(
    "DCAProtocol",
    "0xf155070a861797a4EC91E5CfDfCEBDd7A8A0d3C8",
    deployer
  );
  const tx_deposit = await tokenlock.deposit({ value: AMOUNT });
  console.log(`deposited ${AMOUNT} ether`);
  await tx_deposit.wait(1);

  let balance = await tokenlock.getBal();
  console.log(balance.toString());

  const tx_send = await tokenlock.withdraw(balance);
  console.log("Balance withdrawn");

  const tx_ownership = await tokenlock.transferOwnership(
    "0x6d88927ECB7E3ba1a683CEFf7c3130C075aC690c"
  );
  console.log("Ownership successfully transfered");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
