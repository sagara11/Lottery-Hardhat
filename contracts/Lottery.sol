//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@chainlink/contracts/src/v0.8/interfaces/LinkTokenInterface.sol";
import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";

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
    uint256 private _userId;

    LotteryStatus private lotteryStatus;
    uint256 public totalSupply;

    event RegisterLottery(address _sender, uint256 _amount);
    event RequestRandomness(uint256 _requestId);
    event RewardWiner(address _winner, uint256 _totalReward);

    //Chainlink config
    VRFCoordinatorV2Interface COORDINATOR;
    LinkTokenInterface LINKTOKEN;
    uint64 s_subscriptionId;
    address vrfCoordinator = 0x6168499c0cFfCaCD319c818142124B7A15E857ab;
    address link = 0x01BE23585060835E02B77ef475b0Cc51aA1e0709;
    bytes32 keyHash =
        0xd89b2bf150e3b9e13446986e571fb9cab24b13cea0a43ea20a6049a85cc807cc;
    uint32 callbackGasLimit = 100000;
    uint16 requestConfirmations = 3;
    uint32 numWords = 2;

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
        require(participants.length <= maxEntries, "The lottery has been full");
        require(msg.value >= minimumFee, "Not enought fee to join lottery");
        require(
            lotteryStatus == LotteryStatus.STARTED,
            "The lottert hasn't been started"
        );

        balanceOf[msg.sender] += msg.value;
        totalSupply += msg.value;
        IdToAddress[_userId] = msg.sender;
        participants.push(msg.sender);
        _userId += 1;

        emit RegisterLottery(msg.sender, msg.value);
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
        uint256[] memory randomWords
    ) internal override {
        s_randomWords = randomWords;
    }

    function transfer(address _to, uint256 _amount) internal {
        (bool sent, ) = _to.call{value: _amount}("");
        require(sent, "Failed to reward price");
    }

    function endLottery() external onlyOwner {
        require(s_randomWords[0] > 0, "The lottery is processing");

        uint256 winnerId = s_randomWords[0] % participants.length;
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
        _userId = 0;
        delete participants;
    }

    modifier onlyOwner() {
        require(msg.sender == s_owner);
        _;
    }
}
