const hre = require("hardhat");
const ethers = hre.ethers;

const {
  developmentChains,
  VERIFICATION_BLOCK_CONFIRMATIONS,
  config,
} = require("../chainlink.config");
const networkName = hre.network.name;
const chainId = hre.network.config.chainId;
const { deployMock } = require("./deploy/deploy-mock");

const deployGeneral = async () => {
  let vrfCoordinatorV2MockAddress;
  let subIdCurrent;

  if (developmentChains.includes(networkName)) {
    // Deploy Mock
    const { vrfCoordinatorV2Mock, subId } = await deployMock();
    vrfCoordinatorV2MockAddress = vrfCoordinatorV2Mock.address;
    subIdCurrent = subId;
  } else {
    // Deploy Rinkeby Testnet
    vrfCoordinatorV2MockAddress = config[chainId].vrfCoordinator;
    subIdCurrent = config[chainId].subId;
    await fund_with_link(
      config[chainId].subId,
      config[chainId].linkToken,
      vrfCoordinatorV2MockAddress
    );
  }

  return { vrfCoordinatorV2MockAddress, subIdCurrent };
};

const givePermissionToLottery = async (
  vrfCoordinatorV2MockAddress,
  subIdCurrent,
  lottery
) => {
  if (!developmentChains.includes(networkName)) {
    const vrfCoordinatorV2 = await ethers.getContractAt(
      "VRFCoordinatorV2Interface",
      vrfCoordinatorV2MockAddress
    );
    const tx = await vrfCoordinatorV2.addConsumer(
      subIdCurrent,
      lottery.address
    );
    await tx.wait(1);
    console.log("Give permission to Lottery successfully");
  }
};

const startLottery = async (lottery) => {
  await lottery.startLottery();
  console.log("The lottery has been started!");
};

const fundLottery = async (lottery, _from, _amount) => {
  await lottery.connect(_from).FundLottery({ value: _amount });
  console.log(`The address ${_from.address} has funded ${_amount} wei`);
};

const requestRandomness = async (lottery, vrfCoordinatorV2MockAddress) => {
  const txrequestRandomWords = await lottery.requestRandomness();
  const rcRequestRandomWords = await txrequestRandomWords.wait(1);
  const eventrequestRandomWords = rcRequestRandomWords.events.find(
    (event) => event.event === "RequestRandomness"
  );
  const [_requestId] = eventrequestRandomWords.args;
  const requestIdCurrent = parseInt(_requestId.toString());

  console.log("Request has been sent which has requestId = ", requestIdCurrent);

  if (developmentChains.includes(networkName)) {
    const vrfCoordinatorV2Mock = await ethers.getContractAt(
      "VRFCoordinatorV2Mock",
      vrfCoordinatorV2MockAddress
    );
    const txFulfillRandomWords = await vrfCoordinatorV2Mock.fulfillRandomWords(
      requestIdCurrent,
      lottery.address
    );
    const rcFulfillRandomWords = await txFulfillRandomWords.wait(1);
    const eventFulfillRandomWords = rcFulfillRandomWords.events.find(
      (event) => event.event === "RandomWordsFulfilled"
    );
    const [, , payment, success] = eventFulfillRandomWords.args;
    if (success)
      console.log(
        "The random value has been proccessed successfully with the payment = ",
        payment.toString()
      );
  } else {
    console.log("Waiting for VRFCoordinator generate random value...");
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    await sleep(100000);
  }

  randomWords = (await lottery.s_randomWords(0)).toString();
  console.log("The random words is: ", randomWords);
  return randomWords;
};

const endLottery = async (lottery) => {
  const txEndLottery = await lottery.endLottery();
  const rcEndLottery = await txEndLottery.wait(1);
  const eventEndLottery = rcEndLottery.events.find(
    (event) => event.event === "RewardWinner"
  );
  const eventTransfer = rcEndLottery.events.find(
    (event) => event.event === "Transfer"
  );
  const [_winner, _totalReward] = eventEndLottery.args;
  console.log(
    `The winner of the lottery game is ${_winner.toString()} with total price is ${_totalReward.toString()}`
  );
  const [_to, _amount] = eventTransfer.args;
  console.log(
    `Transfer successfully price ${_amount.toString()} to the winner ${_to.toString()}`
  );
};

const resetLottery = async (lottery) => {
  const txResetLottery = await lottery.resetLottery();
  await txResetLottery.wait(1);
  console.log("The lottery has been reset");
};

const fund_with_link = async (
  subId,
  linkTokenAddress,
  vrfCoordinatorV2MockAddress
) => {
  const linkToken = await ethers.getContractAt(
    "LinkTokenInterface",
    linkTokenAddress
  );

  const abiCoder = ethers.utils.defaultAbiCoder;
  const encodeSubId = await abiCoder.encode(["uint"], [subId]);

  const tx = await linkToken.transferAndCall(
    vrfCoordinatorV2MockAddress,
    config[chainId].fundAmount,
    encodeSubId
  );
  await tx.wait(1);
  console.log(
    `Fund Successfully ${config[chainId].fundAmount} to Subcription Manager at ${subId}`
  );
};

module.exports = {
  fund_with_link,
  requestRandomness,
  fundLottery,
  givePermissionToLottery,
  deployGeneral,
  endLottery,
  resetLottery,
  startLottery,
};
