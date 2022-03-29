const { ethers, upgrades } = require('hardhat');

async function main () {
  const LotteryV2 = await ethers.getContractFactory('LotteryV2');
  console.log('Upgrading Lottery...');
  await upgrades.upgradeProxy('0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0', LotteryV2);
  console.log('Lottery upgraded');
}

main();