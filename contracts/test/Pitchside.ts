import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("Pitchside AI Contract Suite", function () {
  let mockUSDT: any;
  let noLossVault: any;
  let playerShares: any;
  let playerDex: any;

  let owner: SignerWithAddress;
  let user: SignerWithAddress;
  let agent: SignerWithAddress;
  let attacker: SignerWithAddress;

  beforeEach(async function () {
    [owner, user, agent, attacker] = await ethers.getSigners();

    // 1. Deploy MockUSDT
    const MockUSDT = await ethers.getContractFactory("MockUSDT");
    mockUSDT = await MockUSDT.deploy();
    await mockUSDT.waitForDeployment();

    // 2. Deploy NoLossVault
    const NoLossVault = await ethers.getContractFactory("NoLossVault");
    noLossVault = await NoLossVault.deploy(await mockUSDT.getAddress());
    await noLossVault.waitForDeployment();

    // 3. Deploy PlayerShares
    const PlayerShares = await ethers.getContractFactory("PlayerShares");
    playerShares = await PlayerShares.deploy();
    await playerShares.waitForDeployment();

    // 4. Deploy PlayerDex
    const PlayerDex = await ethers.getContractFactory("PlayerDex");
    playerDex = await PlayerDex.deploy(
      await noLossVault.getAddress(),
      await playerShares.getAddress()
    );
    await playerDex.waitForDeployment();

    // 5. Authorizations
    await noLossVault.setAuthorizedSpender(await playerDex.getAddress(), true);
    await playerShares.setAuthorizedMinter(await playerDex.getAddress(), true);

    // Distribute USDT to user
    const mintAmount = ethers.parseEther("1000"); // 1000 USDT
    await mockUSDT.transfer(user.address, mintAmount);
    await mockUSDT.connect(user).approve(await noLossVault.getAddress(), mintAmount);
  });

  describe("NoLossVault", function () {
    it("should allow deposits and safely store stablecoins", async function () {
      const depositAmount = ethers.parseEther("100");
      await expect(noLossVault.connect(user).deposit(depositAmount))
        .to.emit(noLossVault, "Deposited")
        .withArgs(user.address, depositAmount);

      expect(await mockUSDT.balanceOf(await noLossVault.getAddress())).to.equal(depositAmount);
      expect(await mockUSDT.balanceOf(user.address)).to.equal(ethers.parseEther("900"));
      
      const userInfo = await noLossVault.users(user.address);
      expect(userInfo.balance).to.equal(depositAmount);
    });

    it("should accumulate virtual credits over time", async function () {
      const depositAmount = ethers.parseEther("100");
      await noLossVault.connect(user).deposit(depositAmount);

      // Fast forward time by 100 seconds
      await ethers.provider.send("evm_increaseTime", [100]);
      await ethers.provider.send("evm_mine", []);

      const credits = await noLossVault.getCredits(user.address);
      // APY is 5% approx: 15844 scaled by 1e12 per token per second.
      // Expected credits = 100 * 100 * 15844 / 1e12 * 1e18 (standard scaling) = ~1.5844 * 10^14 wei
      expect(credits).to.be.gt(0n);
    });

    it("should allow withdrawing deposits fully", async function () {
      const depositAmount = ethers.parseEther("100");
      await noLossVault.connect(user).deposit(depositAmount);
      
      await expect(noLossVault.connect(user).withdraw(depositAmount))
        .to.emit(noLossVault, "Withdrawn")
        .withArgs(user.address, depositAmount);

      expect(await mockUSDT.balanceOf(user.address)).to.equal(ethers.parseEther("1000"));
      const userInfo = await noLossVault.users(user.address);
      expect(userInfo.balance).to.equal(0n);
    });

    it("should allow user to delegate agent", async function () {
      await expect(noLossVault.connect(user).delegateAgent(agent.address))
        .to.emit(noLossVault, "AgentDelegated")
        .withArgs(user.address, agent.address);

      const userInfo = await noLossVault.users(user.address);
      expect(userInfo.delegatedAgent).to.equal(agent.address);
    });
  });

  describe("PlayerShares & PlayerDex", function () {
    beforeEach(async function () {
      // Deposit and delegate
      const depositAmount = ethers.parseEther("500");
      await noLossVault.connect(user).deposit(depositAmount);
      await noLossVault.connect(user).delegateAgent(agent.address);

      // Accumulate credits (wait 10,000 blocks/seconds for enough credits)
      await ethers.provider.send("evm_increaseTime", [100000]);
      await ethers.provider.send("evm_mine", []);
    });

    it("should fetch correct player share price based on rating", async function () {
      // Lionel Messi (ID: 1) has 90 rating
      const price = await playerDex.getSharePrice(1);
      expect(price).to.equal(ethers.parseEther("90"));
    });

    it("should allow user to buy shares directly", async function () {
      // User buys 1 share of Messi (cost = 90 credits)
      const buyAmount = ethers.parseEther("1");
      
      const balanceBefore = await playerShares.balanceOf(user.address, 1);
      expect(balanceBefore).to.equal(0n);

      await expect(playerDex.connect(user).buyShares(1, buyAmount))
        .to.emit(playerDex, "SharesBought");

      expect(await playerShares.balanceOf(user.address, 1)).to.equal(buyAmount);
    });

    it("should allow delegated agent to buy shares for user", async function () {
      const buyAmount = ethers.parseEther("1");
      
      await expect(playerDex.connect(agent).buySharesFor(user.address, 1, buyAmount))
        .to.emit(playerDex, "SharesBought")
        .withArgs(user.address, 1, buyAmount, ethers.parseEther("90"));

      expect(await playerShares.balanceOf(user.address, 1)).to.equal(buyAmount);
    });

    it("should block non-delegated agent from buying shares for user", async function () {
      const buyAmount = ethers.parseEther("1");
      
      await expect(playerDex.connect(attacker).buySharesFor(user.address, 1, buyAmount))
        .to.be.revertedWith("Unauthorized agent");
    });

    it("should allow delegated agent to sell shares for user", async function () {
      const buyAmount = ethers.parseEther("2");
      await playerDex.connect(agent).buySharesFor(user.address, 1, buyAmount);

      const sellAmount = ethers.parseEther("1");
      await expect(playerDex.connect(agent).sellSharesFor(user.address, 1, sellAmount))
        .to.emit(playerDex, "SharesSold");

      expect(await playerShares.balanceOf(user.address, 1)).to.equal(ethers.parseEther("1"));
    });
  });
});
