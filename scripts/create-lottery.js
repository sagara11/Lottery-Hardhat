const { ethers, upgrades } = require("hardhat");

async function main() {
  const Lottery = await ethers.getContractFactory("Lottery");
  console.log("Deploying Lottery...");
  const lottery = await upgrades.deployProxy(Lottery, [
    ethers.utils.parseEther("0.003"),
    ethers.utils.parseEther("0.001"),
    3,
  ]);
  await lottery.deployed();
  console.log("Lottery deployed to:", lottery.address);
}

main();
