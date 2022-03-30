const hre = require("hardhat");
const ethers = hre.ethers;

const keyHash =
  "0xd89b2bf150e3b9e13446986e571fb9cab24b13cea0a43ea20a6049a85cc807cc";

async function main({ getChainId }) {
  const chainId = await getChainId();
  console.log(chainId);
  const [owner, addr1, addr2, adrr3] = await ethers.getSigners();
  //Deploy VRFCoordinatorV2Mock
  const addressVRFCoordinatorV2Mock = await deployVRFCoordinatorV2Mock();
  const VRFCoordinatorV2Mock = await ethers.getContractFactory(
    "VRFCoordinatorV2Mock"
  );
  const vrfCoordinatorV2Mock = await VRFCoordinatorV2Mock.attach(
    addressVRFCoordinatorV2Mock
  );
  // createSubscription
  const txCreateSubscription = await vrfCoordinatorV2Mock.createSubscription();
  const rcCreateSubscription = await txCreateSubscription.wait(1);
  const eventCreateSubscription = rcCreateSubscription.events.find(
    (event) => event.event === "SubscriptionCreated"
  );
  const [subId] = eventCreateSubscription.args;
  const subIdCurrent = parseInt(subId.toString());

  console.log(
    "Create successfully Subcription which has subId = ",
    subIdCurrent
  );

  // fundSubscription
  const txFundSubscription = await vrfCoordinatorV2Mock.fundSubscription(
    subIdCurrent,
    ethers.utils.parseEther("1")
  );
  const rcfundSubscription = await txFundSubscription.wait(1);
  const eventFundSubscription = rcfundSubscription.events.find(
    (event) => event.event === "SubscriptionFunded"
  );
  const [, oldBalance, newBalance] = eventFundSubscription.args;
  console.log(
    `Funded successfully from ${oldBalance} to ${newBalance} in Subcription which has subId = `,
    subIdCurrent
  );

  // Deploy Lottery
  const Lottery = await ethers.getContractFactory("Lottery");
  const lottery = await Lottery.deploy(
    ethers.utils.parseEther("0.00003"),
    ethers.utils.parseEther("0.00001"),
    10,
    subIdCurrent,
    vrfCoordinatorV2Mock.address,
    keyHash
  );

  await lottery.deployed();
  console.log("Lottery deployed to:", lottery.address);

  // Start the Lottery
  await startLottery(lottery);

  // 3 Participants take part in the lottery
  await fundLottery(lottery, addr1, ethers.utils.parseEther("0.0001"));
  await fundLottery(lottery, addr2, ethers.utils.parseEther("0.0002"));
  await fundLottery(lottery, adrr3, ethers.utils.parseEther("0.0003"));

  // Send request to get random number
  randomWord = await requestRandomness(lottery, vrfCoordinatorV2Mock);
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

const requestRandomness = async (lottery, vrfCoordinatorV2Mock) => {
  const txrequestRandomWords = await lottery.requestRandomness();
  const rcRequestRandomWords = await txrequestRandomWords.wait(1);
  const eventrequestRandomWords = rcRequestRandomWords.events.find(
    (event) => event.event === "RequestRandomness"
  );
  console.log(rcRequestRandomWords.events);
  const [_requestId] = eventrequestRandomWords.args;
  const requestIdCurrent = parseInt(_requestId.toString());

  console.log("Request has been sent which has requestId = ", requestIdCurrent);

  const txFulfillRandomWords = await vrfCoordinatorV2Mock.fulfillRandomWords(
    requestIdCurrent,
    lottery.address
  );
  const rcFulfillRandomWords = await txFulfillRandomWords.wait(1);
  const eventFulfillRandomWords = rcFulfillRandomWords.events.find(
    (event) => event.event === "RandomWordsFulfilled"
  );
  const [, outputSeed, payment, success] = eventFulfillRandomWords.args;
  console.log(outputSeed, payment, success);

  randomWords = await lottery.s_randomWords(1);
  console.log("The random words is: ", randomWords);
  return randomWords;
};

main();
