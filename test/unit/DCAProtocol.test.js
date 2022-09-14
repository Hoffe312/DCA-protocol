const { assert, expect } = require("chai");
const { Signer, providers } = require("ethers");
const { network, deployments, ethers, waffle } = require("hardhat");
const {
  developmentChains,
  networkConfig,
} = require("../../helper-hardhat-config");

!developmentChains.includes(network.name)
  ? describe.skip
  : describe("TokenLock unit test", function () {
      let tokenlock,
        tokenlockContract,
        tokenlockSigner,
        interval,
        amount,
        signer;

      beforeEach(async () => {
        accounts = await ethers.getSigners();
        signer = accounts[0];
        user = accounts[1];
        await deployments.fixture("tokenlock");
        tokenlockContract = await ethers.getContract("DCAProtocol");
        tokenlock = tokenlockContract.connect(user);
        tokenlockSigner = tokenlockContract.connect(accounts[0]);
        interval = await tokenlock.getInterval();
        amount = await tokenlock.getAmount();
        depositAmount = ethers.utils.parseEther("0.1");
      });

      describe("constructor", function () {
        it("initializes the raffle correctly", async () => {
          assert.equal(interval.toString(), "10");
          assert.equal(amount.toString(), ethers.utils.parseEther("0.01"));
        });
      });

      describe("deposit", function () {
        it("records user when he deposits", async () => {
          await tokenlock.deposit({ value: depositAmount });
          const contractUser = await tokenlock.getUser(0);
          assert.equal(contractUser, user.address);
        });
        it("mapping of user address to funds", async () => {
          await tokenlock.deposit({ value: depositAmount });
          const contractUser = await tokenlock.getUser(0);
          const balanceMapping = await tokenlock.balances(contractUser);
          assert.equal(balanceMapping.toString(), depositAmount.toString());
        });
        it("without deposit there is no timestamp", async () => {
          const lastTimeStamp = await tokenlock.getLastTimeStamp();
          assert.equal(0, lastTimeStamp);
        });
        it("sets the timettamp correctly", async () => {
          await tokenlock.deposit({ value: depositAmount });
          const lastTimeStamp = await tokenlock.getLastTimeStamp();
          assert.isFalse(lastTimeStamp.toString() == "0");
        });
      });
      describe("checkUpkeep", function () {
        it("returns false if there is no balance and no timestamp", async () => {
          const { upkeepNeeded } = await tokenlock.callStatic.checkUpkeep("0x");
          assert(!upkeepNeeded);
        });
        it("returns true if timePassed and hasPlayers is true", async () => {
          await tokenlockSigner.deposit({ value: depositAmount });
          await network.provider.send("evm_increaseTime", [
            interval.toNumber() + 1,
          ]);
          await network.provider.send("evm_mine");
          const { upkeepNeeded } = await tokenlock.callStatic.checkUpkeep("0x");
          assert(upkeepNeeded);
        });
      });
      describe("performUpkeep", function () {
        it("can only run if checkUpkeep is true", async () => {
          expect(tokenlock.performUpkeep("0x")).to.be.reverted;
        });
        it("performs upkeep if upkeepneeded is true", async () => {
          await tokenlock.deposit({ value: depositAmount });
          await network.provider.send("evm_increaseTime", [
            interval.toNumber() + 1,
          ]);
          await network.provider.request({ method: "evm_mine", params: [] });
          const tx = await tokenlock.performUpkeep("0x");
          assert(tx);
        });
        it("sets the lastTimeStamp new", async () => {
          await tokenlock.deposit({ value: depositAmount });
          const firstTimeStamp =
            (await tokenlock.getLastTimeStamp()).toNumber() +
            interval.toNumber() +
            1 +
            1; //+1 evm_mine
          await network.provider.send("evm_increaseTime", [
            interval.toNumber() + 1,
          ]);
          await network.provider.request({ method: "evm_mine", params: [] });
          await tokenlock.performUpkeep("0x");
          const lastTimeStamp = (await tokenlock.getLastTimeStamp()).toNumber();
          assert.equal(firstTimeStamp, lastTimeStamp);
        });
        it("calls the withdraw function", async () => {
          await tokenlockSigner.deposit({ value: depositAmount });
          const firstBalance = await accounts[0].getBalance();
          await network.provider.send("evm_increaseTime", [
            interval.toNumber() + 1,
          ]);
          await network.provider.request({ method: "evm_mine", params: [] });
          await tokenlockSigner.performUpkeep("0x");
          const finalBalance = await accounts[0].getBalance();
          expect(firstBalance).to.below(finalBalance);
        });
      });
      describe("change functions", function () {
        //reverts because tokenlockSigner is account[0] == owner,  tokenlock is account[1] != owner
        it("changeAmount is onlyOwner", async () => {
          expect(tokenlock.changeAmount(1)).to.be.reverted;
        });
        it("changeInterval is onlyOwner", async () => {
          expect(tokenlock.changeInterval(1)).to.be.reverted;
        });
        it("changeAmount sets new amount", async () => {
          let amountToChange = 5;
          const startingAmount = await tokenlock.getAmount();
          amountToChange = amountToChange + startingAmount;
          await tokenlockSigner.changeAmount(amountToChange);
          const endingAmount = await tokenlock.getAmount();
          assert.equal(amountToChange, endingAmount);
        });
        it("changeInterval sets new Interval", async () => {
          let intervalToChange = 20;
          const startingInterval = await tokenlock.getInterval();
          intervalToChange = intervalToChange + startingInterval;
          await tokenlockSigner.changeInterval(intervalToChange);
          const endingInterval = await tokenlock.getInterval();
          assert.equal(intervalToChange, endingInterval);
        });
      });
    });
