const hre = require("hardhat");
const ethers = hre.ethers;

INCENTIVE_POINT = ethers.utils.parseEther("0.00003");
MINIMUM_FEE = ethers.utils.parseEther("0.00001");
MAX_ENTRIES = 10;

const deployLottery = async (
  subIdCurrent,
  vrfCoordinatorV2Mock_address,
  keyHash
) => {
  const Lottery = await ethers.getContractFactory("Lottery");
  const lottery = await Lottery.deploy(
    INCENTIVE_POINT,
    MINIMUM_FEE,
    MAX_ENTRIES,
    subIdCurrent,
    vrfCoordinatorV2Mock_address,
    keyHash
  );

  await lottery.deployed();
  console.log("Lottery deployed to:", lottery.address);

  return lottery;
};

module.exports = {
  deployLottery: deployLottery,
};
