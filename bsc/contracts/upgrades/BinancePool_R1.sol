// SPDX-License-Identifier: GPL-3.0-only
pragma solidity ^0.7.6;

import "@openzeppelin/contracts-upgradeable/math/SafeMathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/math/MathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";

contract BinancePool_R1 is PausableUpgradeable, ReentrancyGuardUpgradeable, OwnableUpgradeable {

    using SafeMathUpgradeable for uint256;
    using MathUpgradeable for uint256;

    /* staker events */
    event StakePending(address indexed staker, uint256 amount);
    event StakeConfirmed(address indexed staker, uint256 amount);
    event StakeRemoved(address indexed staker, uint256 amount);

    event IntermediaryClaimed(
        address[] stakers, /* map from stakes to amount in gwei */
        uint64[] amounts,
        address intermediary, /* intermediary address which handle these funds */
        uint64 total /* total ether sent to intermediary */
    );

    mapping(address => uint256) private _pendingUserStakes;
    address[] private _pendingStakers;
    address private _operator;
    IERC20Upgradeable private _pegEthContract;
    uint256 private _collectedFee;

    modifier onlyOperator() {
        require(msg.sender == owner() || msg.sender == _operator, "Operator: not allowed");
        _;
    }

    function initialize(IERC20Upgradeable pegEthContract, address operator) public initializer {
        __Pausable_init();
        __ReentrancyGuard_init();
        __Ownable_init();

        _pegEthContract = pegEthContract;
        _operator = operator;

        REQUESTER_MINIMUM_POOL_STAKING = 0.1 ether;
    }

    /*
     * Gas Cost:
     *
     * Lets assume that min amount is 0.1 ether and max possible
     * claimable amount is 32 ether.
     *
     * Worst case (32/0.1=320):
     * - emit event: 375+8*(20*320+8*320+20+8)=72'279
     * - release storage: 320*10'000=320'000
     * - other spends: ?
     *
     * Best case (32/32=1):
     * - emit event: 375+8*(20*1+8*1+20+8)=823
     * - release storage: 1*10'000=10'000
     * - other spends: ?
     *
     * So this tx should be almost free, will do more tests later.
     */
    function claimToIntermediary(address payable intermediary, uint256 networkFee) public onlyOperator payable {
        address[] memory stakers = new address[](_pendingStakers.length);
        uint64[] memory amounts = new uint64[](_pendingStakers.length);
        uint256 total = 0;
        for (uint i = 0; i < _pendingStakers.length; i++) {
            address staker = _pendingStakers[i];
            uint256 amount = _pendingUserStakes[staker];
            stakers[i] = staker;
            amounts[i] = uint64(amount / 1e9);
            total = total.add(amount);
            _pendingUserStakes[staker] = 0;
            delete _pendingStakers[i];
        }
        delete _pendingStakers;
        require(_pegEthContract.transfer(intermediary, total.add(networkFee)), "Couldn't transfer ether");
        emit IntermediaryClaimed(stakers, amounts, intermediary, uint64(total / 1e9));
        _collectedFee = _collectedFee.sub(networkFee);
        /* yep, lets forward all msg value to intermediary address to feed address */
        intermediary.transfer(msg.value);
    }

    uint256 public REQUESTER_MINIMUM_POOL_STAKING;

    function stake(uint256 amount) public nonReentrant {
        uint256 fee = amount.mod(REQUESTER_MINIMUM_POOL_STAKING);
        amount = amount.sub(fee);
        require(amount >= REQUESTER_MINIMUM_POOL_STAKING, "Value must be greater than zero");
        if (_pendingUserStakes[msg.sender] == 0) {
            _pendingStakers.push(msg.sender);
        }
        _pendingUserStakes[msg.sender] = _pendingUserStakes[msg.sender].add(amount);
        _collectedFee = _collectedFee.add(fee);
        require(_pegEthContract.transferFrom(msg.sender, address(this), amount.add(fee)), "Couldn't transfer Peg-ETH");
        emit StakePending(msg.sender, amount);
    }

    function unstake() public nonReentrant {
        uint256 pendingStakes = pendingStakesOf(msg.sender);
        require(pendingStakes > 0, "No pending stakes");
        _pendingUserStakes[msg.sender] = 0;
        require(_pegEthContract.transfer(msg.sender, pendingStakes), "Couldn't transfer Peg-ETH");
        emit StakeRemoved(msg.sender, pendingStakes);
    }

    function pendingStakesOf(address staker) public view returns (uint256) {
        return _pendingUserStakes[staker];
    }

    function claimFee(address recipient) public onlyOperator {
        require(_collectedFee > 0, "Nothing to claim");
        require(_pegEthContract.transfer(recipient, _collectedFee), "Couldn't transfer Peg-ETH");
        _collectedFee = 0;
    }

    function claimableFeeBalance() public view returns (uint256) {
        return _collectedFee;
    }

    function changeOperator(address operator) public onlyOwner {
        _operator = operator;
    }
}