const hre = require("hardhat");
const ethers = hre.ethers;

const { deployMock } = require("./deploy/deploy-mock");
const { deployLottery } = require("./deploy/deploy-lottery");
const {
  developmentChains,
  VERIFICATION_BLOCK_CONFIRMATIONS,
  config,
} = require("../chainlink.config");
const keyHash =
  "0xd89b2bf150e3b9e13446986e571fb9cab24b13cea0a43ea20a6049a85cc807cc";

async function main() {
  const networkName = hre.network.name;
  const chainId = hre.network.config.chainId;
  const [, addr1, addr2, adrr3] = await ethers.getSigners();
  let vrfCoordinatorV2MockAddress;
  let subIdCurrent;
  const keyHash = config[chainId].keyHash;

  if (networkName in developmentChains) {
    // Deploy Mock
    const { vrfCoordinatorV2Mock, subIdCurrent } = await deployMock();
    vrfCoordinatorV2MockAddress = vrfCoordinatorV2Mock.address;
    subIdCurrent = subIdCurrent;
  } else {
    vrfCoordinatorV2MockAddress = config[chainId].vrfCoordinator;
    subIdCurrent = config[chainId].subId;
  }

  // Deploy Lottery
  const lottery = await deployLottery(
    subIdCurrent,
    vrfCoordinatorV2Mock.address,
    keyHash
  );

  // Start the Lottery
  await startLottery(lottery);

  // 3 Participants take part in the lottery
  await fundLottery(lottery, addr1, ethers.utils.parseEther("0.0001"));
  await fundLottery(lottery, addr2, ethers.utils.parseEther("0.0002"));
  await fundLottery(lottery, adrr3, ethers.utils.parseEther("0.0003"));

  // Send request to get random number
  const randomWord = await requestRandomness(lottery, vrfCoordinatorV2Mock);

  // End Lottery - Reward the winner
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

  // Reset Lottery for new Lottery
  const txResetLottery = await lottery.resetLottery();
  await txResetLottery.wait(1);
  console.log("The lottery has been reset");
}

const startLottery = async (lottery) => {
  await lottery.startLottery();
  console.log("The lottery has been started!");
};

const fundLottery = async (lottery, _from, _amount) => {
  await lottery.connect(_from).FundLottery({ value: _amount });
  console.log(`The address ${_from.adderss} has funded ${_amount} wei`);
};

const requestRandomness = async (lottery, vrfCoordinatorV2Mock) => {
  const txrequestRandomWords = await lottery.requestRandomness();
  const rcRequestRandomWords = await txrequestRandomWords.wait(1);
  const eventrequestRandomWords = rcRequestRandomWords.events.find(
    (event) => event.event === "RequestRandomness"
  );
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
  const [, , payment, success] = eventFulfillRandomWords.args;
  if (success)
    console.log(
      "The random value has been proccessed successfully with the payment = ",
      payment.toString()
    );

  randomWords = (await lottery.s_randomWords(0)).toString();
  console.log("The random words is: ", randomWords);
  return randomWords;
};

main();
