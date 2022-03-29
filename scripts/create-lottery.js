const { ethers, upgrades } = require("hardhat");

async function main() {
  const VRFv2SubscriptionManager = await ethers.getContractFactory(
    "VRFv2SubscriptionManager"
  );
  console.log("Deploying VRFv2SubscriptionManager...", VRFv2SubscriptionManager);
  const vrfV2SubscriptionManager = await VRFv2SubscriptionManager.deploy();
  await vrfV2SubscriptionManager.deployed();
  console.log("VRFv2SubscriptionManager deployed to:", vrfV2SubscriptionManager.address);

//   const Lottery = await ethers.getContractFactory("Lottery");
//   console.log("Deploying Lottery...");
//   const lottery = await upgrades.deployProxy(Lottery, [
//     ethers.utils.parseEther("0.003"),
//     ethers.utils.parseEther("0.001"),
//     3,
//     vrfV2SubscriptionManager.address,
//   ]);
//   await lottery.deployed();
//   console.log("Lottery deployed to:", lottery.address);
}

main();
