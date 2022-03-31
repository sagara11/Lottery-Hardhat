const hre = require("hardhat");
const ethers = hre.ethers;

BASE_FEE = ethers.utils.parseEther("0.1");
GAS_PRICE_LINK = ethers.utils.parseEther("0.000000001");
FUND = ethers.utils.parseEther("1");

//Deploy VRFCoordinatorV2Mock
const deployVRFCoordinatorV2Mock = async () => {
  const VRFCoordinatorV2Mock = await ethers.getContractFactory(
    "VRFCoordinatorV2Mock"
  );
  const vrfCoordinatorV2Mock = await VRFCoordinatorV2Mock.deploy(
    BASE_FEE,
    GAS_PRICE_LINK
  );
  await vrfCoordinatorV2Mock.deployed();

  console.log(
    "VRFCoordinatorV2Mock deployed to:",
    vrfCoordinatorV2Mock.address
  );
  return vrfCoordinatorV2Mock.address;
};

const createSubscription = async (vrfCoordinatorV2Mock) => {
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

  return subIdCurrent;
};

const fundSubscription = async (vrfCoordinatorV2Mock, subIdCurrent) => {
  const txFundSubscription = await vrfCoordinatorV2Mock.fundSubscription(
    subIdCurrent,
    FUND
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
};

const deployMock = async () => {
  const addressVRFCoordinatorV2Mock = await deployVRFCoordinatorV2Mock();
  const VRFCoordinatorV2Mock = await ethers.getContractFactory(
    "VRFCoordinatorV2Mock"
  );
  const vrfCoordinatorV2Mock = await VRFCoordinatorV2Mock.attach(
    addressVRFCoordinatorV2Mock
  );

  // createSubscription
  const subIdCurrent = await createSubscription(vrfCoordinatorV2Mock);
  // fundSubscription
  await fundSubscription(vrfCoordinatorV2Mock, subIdCurrent);

  return { vrfCoordinatorV2Mock, subIdCurrent };
};

module.exports = {
  deployMock: deployMock,
};
