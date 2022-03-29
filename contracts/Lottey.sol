//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/CountersUpgradeable.sol";
import "./VRFv2SubscriptionManager.sol";

contract Lottery is OwnableUpgradeable {
    using CountersUpgradeable for CountersUpgradeable.Counter;
    CountersUpgradeable.Counter private _userId;
    VRFv2SubscriptionManager public vrfV2SubscriptionManager;

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

    function initialize(
        uint256 _incentivePoint,
        uint256 _minimumFee,
        uint256 _maxEntries,
        address _vrfV2SubscriptionManager
    ) public initializer {
        __Ownable_init();
        incentivePoint = _incentivePoint;
        minimumFee = _minimumFee;
        maxEntries = _maxEntries;
        vrfV2SubscriptionManager = VRFv2SubscriptionManager(
            _vrfV2SubscriptionManager
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
        uint256 requestId = vrfV2SubscriptionManager.requestRandomWords();
        emit RequestRandomness(requestId);
    }

    function transfer(address _to, uint256 _amount) internal {
        (bool sent, ) = _to.call{value: _amount}("");
        require(sent, "Failed to reward price");
    }

    function endLottery() external onlyOwner {
        require(
            vrfV2SubscriptionManager.s_randomWords(0) > 0,
            "The lottery is processing"
        );

        uint256 winnerId = vrfV2SubscriptionManager.s_randomWords(0) %
            totalParticipants;
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

    function fundWithLink(uint256 _amount) external onlyOwner {
        vrfV2SubscriptionManager.topUpSubscription(_amount);
    }
}
