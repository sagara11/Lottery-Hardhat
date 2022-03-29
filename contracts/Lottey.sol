//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/CountersUpgradeable.sol";
import "@chainlink/contracts/src/v0.8/interfaces/LinkTokenInterface.sol";
import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";

contract Lottery is VRFConsumerBaseV2, OwnableUpgradeable {
    using CountersUpgradeable for CountersUpgradeable.Counter;
    CountersUpgradeable.Counter private _userId;
    enum LotteryStatus {
        CLOSED,
        CALCULATING,
        STARTED
    }

    enum LotteryFactor {
        INCENTIVE_POINT,
        MINIMUM_FEE,
        MAX_ENTRIES
    }

    mapping(address => uint256) public balanceOf;
    mapping(uint256 => address) public IdToAddress;
    address[] public participants;
    uint256 public incentivePoint;
    uint256 public minimumFee;
    uint256 public maxEntries;

    LotteryStatus private lotteryStatus;
    uint256 public totalSupply;
    uint256 public totalParticipants;

    event RegisterLottery(address _sender, uint256 _amount);
    event RequestRandomness(uint256 _requestId);
    event RewardWiner(address _winner, uint256 _totalReward);

    //Config Chainlink VRFv2SubscriptionManager
    VRFCoordinatorV2Interface COORDINATOR;
    LinkTokenInterface LINKTOKEN;

    address constant vrfCoordinator =
        0x6168499c0cFfCaCD319c818142124B7A15E857ab;
    address constant link_token_contract =
        0x01BE23585060835E02B77ef475b0Cc51aA1e0709;
    bytes32 constant keyHash =
        0xd89b2bf150e3b9e13446986e571fb9cab24b13cea0a43ea20a6049a85cc807cc;
    uint32 constant callbackGasLimit = 100000;
    uint16 constant requestConfirmations = 3;
    uint32 constant numWords = 1;

    // Storage parameters
    uint256 public s_randomWords;
    uint256 public s_requestId;
    uint64 public s_subscriptionId;

    function initialize(
        uint256 _incentivePoint,
        uint256 _minimumFee,
        uint256 _maxEntries
    ) public initializer {
        __Ownable_init();
        VRFConsumerBaseV2(vrfCoordinator);
        incentivePoint = _incentivePoint;
        minimumFee = _minimumFee;
        maxEntries = _maxEntries;
        COORDINATOR = VRFCoordinatorV2Interface(vrfCoordinator);
        LINKTOKEN = LinkTokenInterface(link_token_contract);
        createNewSubscription();
    }

    function createNewSubscription() private onlyOwner {
        // Create a subscription with a new subscription ID.
        address[] memory consumers = new address[](1);
        consumers[0] = address(this);
        s_subscriptionId = COORDINATOR.createSubscription();
        // Add this contract as a consumer of its own subscription.
        COORDINATOR.addConsumer(s_subscriptionId, consumers[0]);
    }

    // Assumes this contract owns link.
    // 1000000000000000000 = 1 LINK
    function topUpSubscription(uint256 amount) external {
        LINKTOKEN.transferAndCall(
            address(COORDINATOR),
            amount,
            abi.encode(s_subscriptionId)
        );
    }

    function SetFactorLottery(uint256 _amount, LotteryFactor _factor)
        external
        onlyOwner
        returns (bool)
    {
        require(_amount > 0, "Invalid valid amount");

        if (_factor == LotteryFactor.INCENTIVE_POINT) {
            incentivePoint = _amount;
        }
        if (_factor == LotteryFactor.MINIMUM_FEE) {
            minimumFee = _amount;
        }
        if (_factor == LotteryFactor.MAX_ENTRIES) {
            maxEntries = _amount;
        }

        return true;
    }

    function FundLottery() external payable {
        require(totalParticipants <= maxEntries, "The lottery has been full");
        require(msg.value >= minimumFee, "Not enought fee to join lottery");
        require(
            lotteryStatus == LotteryStatus.STARTED,
            "The lottert hasn't been started"
        );

        balanceOf[_msgSender()] += msg.value;
        IdToAddress[_userId.current()] = _msgSender();
        participants.push(_msgSender());
        _userId.increment();

        emit RegisterLottery(_msgSender(), msg.value);
    }

    function startLottery() external onlyOwner returns (bool) {
        lotteryStatus = LotteryStatus.STARTED;
        return true;
    }

    function requestRandomness() external onlyOwner {
        require(
            lotteryStatus == LotteryStatus.STARTED,
            "The lottert hasn't been started"
        );

        lotteryStatus = LotteryStatus.CALCULATING;
        s_requestId = COORDINATOR.requestRandomWords(
            keyHash,
            s_subscriptionId,
            requestConfirmations,
            callbackGasLimit,
            numWords
        );
        emit RequestRandomness(s_requestId);
    }

    function fulfillRandomWords(
        uint256, /* requestId */
        uint256 randomWords
    ) internal {
        s_randomWords = randomWords;
    }

    function transfer(address _to, uint256 _amount) internal {
        (bool sent, ) = _to.call{value: _amount}("");
        require(sent, "Failed to reward price");
    }

    function endLottery() external onlyOwner {
        require(s_randomWords > 0, "The lottery is processing");

        uint256 winnerId = s_randomWords % totalParticipants;
        transfer(IdToAddress[winnerId], totalSupply);

        emit RewardWiner(IdToAddress[winnerId], totalSupply);

        resetLottery();
        lotteryStatus = LotteryStatus.CLOSED;
    }

    function resetLottery() internal onlyOwner {
        totalSupply = 0;
        for (uint256 i = 0; i < participants.length; i++) {
            balanceOf[participants[i]] = 0;
            IdToAddress[i] = address(0);
        }
        _userId.reset();
        delete participants;
    }
}
