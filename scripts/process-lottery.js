const hre = require("hardhat");
const ethers = hre.ethers;

const keyHash =
  "0x7c3699283bda56ad74f6b855546325b68d482e983852a7a82979cc4807b641f3";
const minimumRequestConfirmations = 3;
const callbackGasLimit = 100000;
const numWords = 2;
const consumer = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

async function main() {
  const [owner, addr1, addr2, adrr3] = await ethers.getSigners();
  const Lottery = await ethers.getContractFactory("Lottery");
  const lottery = await Lottery.attach(consumer);
  // Start the Lottery
  await startLottery(lottery);

  // 3 Participants take part in the lottery
  await fundLottery(lottery, addr1, ethers.utils.parseEther("0.0001"));
  await fundLottery(lottery, addr2, ethers.utils.parseEther("0.0002"));
  await fundLottery(lottery, adrr3, ethers.utils.parseEther("0.0003"));

  // Send request to get random number
  await requestRandomness(lottery);
}

const startLottery = async (lottery) => {
  await lottery.startLottery();
  console.log("The lottery has been started!");
};

const fundLottery = async (lottery, _from, _amount) => {
  await lottery.connect(_from).FundLottery({ value: _amount });
  console.log(`The address ${_from.adderss} has funded ${_amount} wei`);
};

const deployVRFCoordinatorV2Mock = async () => {
  const VRFCoordinatorV2Mock = await ethers.getContractFactory(
    "VRFCoordinatorV2Mock"
  );
  const vrfCoordinatorV2Mock = await VRFCoordinatorV2Mock.deploy(
    ethers.utils.parseEther("0.1"),
    ethers.utils.parseEther("0.000000001")
  );
  await vrfCoordinatorV2Mock.deployed();

  console.log(
    "VRFCoordinatorV2Mock deployed to:", 
    vrfCoordinatorV2Mock.address
  );
  return vrfCoordinatorV2Mock.address;
};

const requestRandomness = async (lottery) => {
  //Deploy VRFCoordinatorV2Mock
  const addressVRFCoordinatorV2Mock = await deployVRFCoordinatorV2Mock();
  const VRFCoordinatorV2Mock = await ethers.getContractFactory(
    "VRFCoordinatorV2Mock"
  );
  const vrfCoordinatorV2Mock = await VRFCoordinatorV2Mock.attach(
    addressVRFCoordinatorV2Mock
  );

  const txCreateSubscription = await vrfCoordinatorV2Mock.createSubscription();
  const rcCreateSubscription = await txCreateSubscription.wait(1);
  const eventCreateSubscription = rcCreateSubscription.events.find(
    (event) => event.event === "SubscriptionCreated"
  );
  const [subId, owner] = eventCreateSubscription.args;
  const subIdCurrent = parseInt(subId.toString());

  console.log("Create successfully Subcription which has subId = ", subIdCurrent);

  const txFundSubscription = await vrfCoordinatorV2Mock.fundSubscription(
    subIdCurrent,
    ethers.utils.parseEther("0.1")
  );
  const rcfundSubscription = await txFundSubscription.wait(1);
  const eventFundSubscription = rcfundSubscription.events.find(
    (event) => event.event === "SubscriptionFunded"
  );
  const [, oldBalance, newBalance] = eventFundSubscription.args;
  console.log(`Funded successfully from ${oldBalance} to ${newBalance} in Subcription which has subId = `, subIdCurrent);

  const txrequestRandomWords =
    await await vrfCoordinatorV2Mock.requestRandomWords(
      keyHash,
      subIdCurrent,
      minimumRequestConfirmations,
      callbackGasLimit,
      numWords
    );
  const rcRequestRandomWords = await txrequestRandomWords.wait(1);
  const eventrequestRandomWords = rcRequestRandomWords.events.find(
    (event) => event.event === "RandomWordsRequested"
  );
  const [, requestId, , , , , , ,] = eventrequestRandomWords.args;
  const requestIdCurrent = parseInt(requestId.toString());

  console.log("Request has been sent which has requestId = ", requestIdCurrent);

  const txFulfillRandomWords = await vrfCoordinatorV2Mock.fulfillRandomWords(requestIdCurrent, consumer);
  const rcFulfillRandomWords = await txFulfillRandomWords.wait(1);
  const eventFulfillRandomWords = rcFulfillRandomWords.events.find(
    (event) => event.event === "RandomWordsFulfilled"
  );
  const [, outputSeed, payment, success] = eventFulfillRandomWords.args;
  console.log(outputSeed, payment, success)

  randomWords = await lottery.s_randomWords(1)
  console.log("day roi", randomWords);
};

main();