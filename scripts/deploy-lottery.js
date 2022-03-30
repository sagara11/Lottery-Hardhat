const hre = require("hardhat");
const ethers = hre.ethers;

async function main() {
  const Lottery = await ethers.getContractFactory("Lottery");
  const lottery = await Lottery.deploy(
    ethers.utils.parseEther("0.00003"),
    ethers.utils.parseEther("0.00001"),
    10,
    2080
  );

  await lottery.deployed();

  console.log("Lottery deployed to:", lottery.address);
}

main();
