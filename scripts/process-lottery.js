const hre = require("hardhat");
const ethers = hre.ethers;

const { deployLottery } = require("./deploy/deploy-lottery");
const {
  requestRandomness,
  fundLottery,
  givePermissionToLottery,
  deployGeneral,
  endLottery,
  resetLottery,
  startLottery,
} = require("./helpful-methods");

const { config } = require("../chainlink.config");
const chainId = hre.network.config.chainId;

async function main() {
  const [, addr1, addr2, addr3] = await ethers.getSigners();
  const keyHash = config[chainId].keyHash;

  // Deploy General
  const { vrfCoordinatorV2MockAddress, subIdCurrent } = await deployGeneral();
  // Deploy Lottery
  const lottery = await deployLottery(
    subIdCurrent,
    vrfCoordinatorV2MockAddress,
    keyHash
  );
  // Give permission to lottery to use service in Subscription Manager
  await givePermissionToLottery(
    vrfCoordinatorV2MockAddress,
    subIdCurrent,
    lottery
  );
  // Start the Lottery
  await startLottery(lottery);

  // 3 Participants take part in the lottery
  await fundLottery(lottery, addr1, ethers.utils.parseEther("0.0001"));
  await fundLottery(lottery, addr2, ethers.utils.parseEther("0.0002"));
  await fundLottery(lottery, addr3, ethers.utils.parseEther("0.0003"));
  // Send request to get random number
  await requestRandomness(lottery, vrfCoordinatorV2MockAddress);

  // End Lottery - Reward the winner
  await endLottery(lottery);

  // Reset Lottery for new Lottery
  await resetLottery(lottery);
}

main();
