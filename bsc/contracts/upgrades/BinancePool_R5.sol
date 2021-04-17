// SPDX-License-Identifier: GPL-3.0-only
pragma solidity ^0.7.6;

import "@openzeppelin/contracts-upgradeable/math/SafeMathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/math/MathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";

interface IERC20Manageable is IERC20Upgradeable {

    function mint(address account, uint256 amount) external;

    function burn(address account, uint256 amount) external;
}

interface IAETH is IERC20Manageable {

    function ratio() external returns (uint256);
}

interface IGlobalPool {

    event StakePending(address indexed staker, uint256 amount);
    event StakeConfirmed(address indexed staker, uint256 amount);
    event RewardClaimed(address indexed staker, uint256 amount, bool isAETH);

    function stake(uint256 amount) external;

    function claimableAETHRewardOf(address staker) external view returns (uint256);

    function claimAETH() external;

    function claimableFETHRewardOf(address staker) external view returns (uint256);

    function claimFETH() external;
}

contract BinancePool_R5 is PausableUpgradeable, ReentrancyGuardUpgradeable, OwnableUpgradeable, IGlobalPool {

    using SafeMathUpgradeable for uint256;
    using MathUpgradeable for uint256;

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
    uint256 public REQUESTER_MINIMUM_POOL_STAKING;
    IERC20Manageable private _aEthContract;
    mapping(address => uint256) _aEthRewards;
    mapping(address => uint256) _fEthRewards;

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

    function getPendingStakes() public view returns (address[] memory, uint256[] memory) {
        address[] memory addresses = new address[](_pendingStakers.length);
        uint256[] memory amounts = new uint256[](_pendingStakers.length);
        for (uint256 i = 0; i < _pendingStakers.length; i++) {
            address staker = _pendingStakers[i];
            uint256 amount = _pendingUserStakes[staker];
            addresses[i] = staker;
            amounts[i] = amount;
        }
        return (addresses, amounts);
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
    function claimToIntermediary(address payable intermediary, uint256 networkFee, uint256 threshold) public onlyOperator payable {
        address[] memory stakers = new address[](_pendingStakers.length);
        uint64[] memory amounts = new uint64[](_pendingStakers.length);
        uint256 total = 0;
        uint256 j = 0;
        for (uint i = 0; i < _pendingStakers.length; i++) {
            address staker = _pendingStakers[i];
            uint256 amount = _pendingUserStakes[staker];
            /* if amount is zero then we possible have to remove staker from list */
            if (amount == 0) {
                delete _pendingStakers[i];
                continue;
            }
            /* if stake amount with current total exceeds threshold then split it */
            if (total + amount > threshold) {
                amount = threshold.sub(total);
            }
            stakers[j] = staker;
            amounts[j] = uint64(amount / 1e9);
            total = total.add(amount);
            j++;
            /* lets release pending stakes only if amount is zero */
            _pendingUserStakes[staker] = _pendingUserStakes[staker].sub(amount);
            if (_pendingUserStakes[staker] == 0) {
                delete _pendingStakers[i];
            }
            /* if total exceeds threshold then we can't proceed stakes anymore */
            if (total >= threshold) {
                break;
            }
        }
        require(_pegEthContract.transfer(intermediary, total.add(networkFee)), "Couldn't transfer ether");
        _collectedFee = _collectedFee.sub(networkFee);
        emit IntermediaryClaimed(stakers, amounts, intermediary, uint64(total / 1e9));
        /* yep, lets forward all msg value to intermediary address to feed address */
        intermediary.transfer(msg.value);
    }

    function stake(uint256 amount) override external nonReentrant {
        uint256 fee = amount.mod(REQUESTER_MINIMUM_POOL_STAKING);
        amount = amount.sub(fee);
        require(amount >= REQUESTER_MINIMUM_POOL_STAKING, "Value must be greater than zero");
        if (_pendingUserStakes[msg.sender] == 0) {
            _pendingStakers.push(msg.sender);
        }
        _pendingUserStakes[msg.sender] = _pendingUserStakes[msg.sender].add(amount);
        _collectedFee = _collectedFee.add(fee);
        require(_pegEthContract.transferFrom(msg.sender, address(this), amount.add(fee)), "Couldn't transfer Peg-ETH");
        /* increase aETH rewards */
        uint256 ratio = IAETH(address(_aEthContract)).ratio();
        uint256 reward = amount.mul(ratio).div(1e18);
        _aEthRewards[msg.sender] = _aEthRewards[msg.sender].add(reward);
        /* emit events */
        emit StakePending(msg.sender, amount);
        emit StakeConfirmed(msg.sender, amount);
    }

    function claimAETH() override external nonReentrant {
        require(_aEthRewards[msg.sender] > 0, "no aETH rewards for claim");
        uint256 rewards = _aEthRewards[msg.sender];
        _aEthRewards[msg.sender] = 0;
        _fEthRewards[msg.sender] = 0;
        _aEthContract.mint(msg.sender, rewards);
        emit RewardClaimed(msg.sender, rewards, true);
    }

    function claimFETH() override external nonReentrant {
        revert("not implemented");
    }

    function pendingStakesOf(address staker) public view returns (uint256) {
        return _pendingUserStakes[staker];
    }

    function claimableAETHRewardOf(address staker) override external view returns (uint256) {
        return _aEthRewards[staker];
    }

    function claimableFETHRewardOf(address staker) override external view returns (uint256) {
        return _fEthRewards[staker];
    }

    function claimFee(address recipient) public onlyOperator {
        require(_collectedFee > 0, "Nothing to claim");
        require(_pegEthContract.transfer(recipient, _collectedFee), "Couldn't transfer Peg-ETH");
        _collectedFee = 0;
    }

    function claimableFeeBalance() public view returns (uint256) {
        return _collectedFee;
    }

    function burnCollectedFee(uint256 burnAmount) public onlyOwner {
        require(burnAmount <= _collectedFee, "you can't burn more than possible");
        _collectedFee = _collectedFee.sub(burnAmount);
    }

    function confirmPendingStakes() public onlyOwner {
        for (uint256 i = 0; i < _pendingStakers.length; i++) {
            address staker = _pendingStakers[i];
            uint256 amount = _pendingUserStakes[staker];
            if (amount == 0) {
                continue;
            }
            /* increase aETH rewards */
            uint256 ratio = IAETH(address(_aEthContract)).ratio();
            uint256 reward = amount.mul(ratio).div(1e18);
            if (_aEthRewards[staker] > 0) {
                continue;
            }
            _aEthRewards[staker] = _aEthRewards[staker].add(reward);
            /* emit events */
            emit StakeConfirmed(staker, amount);
        }
    }

    function burnAethRewards(address staker, uint256 amount) public onlyOwner {
        _aEthRewards[staker] = _aEthRewards[staker].sub(amount);
    }

    function changeOperator(address operator) public onlyOwner {
        _operator = operator;
    }

    function changeAethContract(IAETH aEthContract) public onlyOwner {
        _aEthContract = aEthContract;
    }
}