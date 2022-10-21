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

      const usdcAddr = "0x07865c6E87B9F70255377e024ace6630C1Eaa37F";
      const wethAddr = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
      const daiAddr = "0x6B175474E89094C44Da98b954EedeAC495271d0F";
      const AMOUNT = ethers.utils.parseEther("1");

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
        weth = await ethers.getContractAt("IWETH", wethAddr);
        dai = await ethers.getContractAt("IERC20", daiAddr);
        usdc = await ethers.getContractAt("IERC20", usdcAddr);
        await weth.deposit({ value: AMOUNT });
      });

      describe("constructor", function () {
        it("initializes the raffle correctly", async () => {
          assert.equal(interval.toString(), "10");
          assert.equal(amount.toString(), ethers.utils.parseEther("0.01"));
        });
      });

      describe("Funds", function () {
        it("without depositFunds there is no timestamp", async () => {
          const lastTimeStamp = await tokenlock.getLastTimeStamp();
          assert.equal(0, lastTimeStamp);
        });

        it("sets the timestamp correctly", async () => {
          await weth.approve(tokenlock.address, AMOUNT);
          const tx = await tokenlock.depositFunds(wethAddr, AMOUNT);
          await tx.wait(1);
          const lastTimeStamp = await tokenlock.getLastTimeStamp();
          assert.isFalse(lastTimeStamp.toString() == "0");
        });

        it("deposits funds correctly", async () => {
          await weth.approve(tokenlock.address, AMOUNT);
          const depositFundsTx = await tokenlock.depositFunds(wethAddr, AMOUNT);
          await depositFundsTx.wait(1);

          assert.equal(
            (await tokenlock.getFunds()).toString(),
            AMOUNT.toString()
          );
        });
      });
      describe("Swap", function () {
        it("gets AmountOutMin", async () => {
          const amountOutMin = await tokenlock.getAmountOutMin(
            wethAddr,
            daiAddr,
            AMOUNT
          );
          assert(amountOutMin > 0);
        });
        it("Swaps Weth to Usdc", async () => {
          const tx_deposit = await tokenlock.depositFunds(wethAddr, AMOUNT);
          await tx_deposit.wait(1);
          const amountOutMin = await tokenlock.getAmountOutMin(
            wethAddr,
            daiAddr,
            AMOUNT
          );
          const tx_swap = await tokenlock.swap(wethAddr, daiAddr, AMOUNT, 0);
          await tx_swap.wait(1);

          console.log("DAI balance", await dai.balanceOf(signer.address));
        });
      });

      describe("checkUpkeep", function () {
        it("returns false if there is no balance and no timestamp", async () => {
          const { upkeepNeeded } = await tokenlock.callStatic.checkUpkeep("0x");
          assert(!upkeepNeeded);
        });
        it("returns true if timePassed and hasPlayers is true", async () => {
          await tokenlockSigner.depositFunds(wethAddr, AMOUNT);
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
          await tokenlock.depositFunds(wethAddr, AMOUNT);
          await network.provider.send("evm_increaseTime", [
            interval.toNumber() + 1,
          ]);
          await network.provider.request({ method: "evm_mine", params: [] });
          const tx = await tokenlock.performUpkeep("0x");
          assert(tx);
        });
        it("sets the lastTimeStamp new", async () => {
          await tokenlock.depositFunds(wethAddr, AMOUNT);
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
        /** 
        it("calls the withdraw function", async () => {
          await tokenlockSigner.depositFunds(wethAddr, AMOUNT);
          const firstBalance = await accounts[0].getBalance();
          await network.provider.send("evm_increaseTime", [
            interval.toNumber() + 1,
          ]);
          await network.provider.request({ method: "evm_mine", params: [] });
          await tokenlockSigner.performUpkeep("0x");
          const finalBalance = await accounts[0].getBalance();
          expect(firstBalance).to.below(finalBalance);
        });*/
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
