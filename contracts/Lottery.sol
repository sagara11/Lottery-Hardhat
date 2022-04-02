//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@chainlink/contracts/src/v0.8/interfaces/LinkTokenInterface.sol";
import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

error Unauthorized();
error InvalidAmount();
error LotteryFullSlot();
error NotEnoughFeeToJoin();
error LotteryNotStarted();
error RewardFailed();
error RequestIsProccessing();
error LotteryNotClosed();
error InvalidBalance();

contract Lottery is VRFConsumerBaseV2 {
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
    using Counters for Counters.Counter;
    Counters.Counter private _userId;

    LotteryStatus private lotteryStatus;
    uint256 public totalSupply;

    event RegisterLottery(address _sender, uint256 _amount);
    event RequestRandomness(uint256 _requestId);
    event RewardWinner(address _winner, uint256 _totalReward);
    event Transfer(address _to, uint256 _amount);

    //Chainlink config
    VRFCoordinatorV2Interface COORDINATOR;
    LinkTokenInterface LINKTOKEN;
    uint32 constant callbackGasLimit = 100000;
    uint16 constant requestConfirmations = 3;
    uint32 constant numWords = 2;
    uint64 s_subscriptionId;
    address vrfCoordinator;
    address link;
    bytes32 keyHash;

    uint256[] public s_randomWords;
    uint256 public s_requestId;
    address s_owner;

    constructor(
        uint256 _incentivePoint,
        uint256 _minimumFee,
        uint256 _maxEntries,
        uint64 _subscriptionId,
        address _vrfCoordinator,
        bytes32 _keyhash
    ) VRFConsumerBaseV2(_vrfCoordinator) {
        COORDINATOR = VRFCoordinatorV2Interface(_vrfCoordinator);
        LINKTOKEN = LinkTokenInterface(link);
        s_owner = msg.sender;
        s_subscriptionId = _subscriptionId;
        incentivePoint = _incentivePoint;
        minimumFee = _minimumFee;
        maxEntries = _maxEntries;
        keyHash = _keyhash;
    }

    function SetFactorLottery(uint256 _amount, LotteryFactor _factor)
        external
        onlyOwner
        returns (bool)
    {
        if (_amount <= 0) revert InvalidAmount();

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
        if (participants.length > maxEntries) revert LotteryFullSlot();
        if (msg.value < minimumFee) revert NotEnoughFeeToJoin();
        if (lotteryStatus != LotteryStatus.STARTED) revert LotteryNotStarted();

        balanceOf[msg.sender] += msg.value;
        totalSupply += msg.value;
        IdToAddress[_userId.current()] = msg.sender;
        participants.push(msg.sender);
        _userId.increment();

        emit RegisterLottery(msg.sender, msg.value);
    }

    function startLottery() external onlyOwner returns (bool) {
        lotteryStatus = LotteryStatus.STARTED;
        return true;
    }

    function requestRandomness() external onlyOwner {
        if (lotteryStatus != LotteryStatus.STARTED) revert LotteryNotStarted();

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
        uint256[] memory randomWords
    ) internal override {
        s_randomWords = randomWords;
    }

    function transfer(address payable _to, uint256 _amount) internal {
        if (balanceOf[_to] <= 0) revert InvalidBalance();
        if (balanceOf[_to] > _amount) revert InvalidBalance();

        balanceOf[_to] = 0;
        balanceOf[_to] += _amount;
        (bool sent, ) = _to.call{value: _amount}("");
        if (!sent) revert RewardFailed();

        emit Transfer(_to, _amount);
    }

    function endLottery() external onlyOwner {
        if (s_randomWords[0] < 0) revert RequestIsProccessing();

        uint256 winnerId = s_randomWords[0] % participants.length;
        transfer(payable(IdToAddress[winnerId]), totalSupply);
        lotteryStatus = LotteryStatus.CLOSED;
        emit RewardWinner(IdToAddress[winnerId], totalSupply);
    }

    function resetLottery() external onlyOwner {
        if (lotteryStatus != LotteryStatus.CLOSED) revert LotteryNotClosed();

        for (uint256 i = 0; i < participants.length; i++) {
            balanceOf[participants[i]] = 0;
            IdToAddress[i] = address(0);
        }
        _userId.reset();
        delete participants;
    }

    function addConsumer(address consumerAddress) external onlyOwner {
        // Add a consumer contract to the subscription.
        COORDINATOR.addConsumer(s_subscriptionId, consumerAddress);
    }

    modifier onlyOwner() {
        if (msg.sender != s_owner) revert Unauthorized();
        _;
    }
}
