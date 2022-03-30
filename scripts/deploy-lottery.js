const hre = require("hardhat");
const ethers = hre.ethers;

const deployLottery = async () => {
  const Lottery = await ethers.getContractFactory("Lottery");
  const lottery = await Lottery.deploy(
    ethers.utils.parseEther("0.00003"),
    ethers.utils.parseEther("0.00001"),
    10,
    2080
  );

  await lottery.deployed();

  console.log("Lottery deployed to:", lottery.address);
};

async function main() {
  deployLottery();
}

main();

module.exports = deployLottery;
