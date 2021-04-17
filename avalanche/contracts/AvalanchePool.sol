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

interface IANKRAVAX is IERC20Manageable {

    function ratio() external returns (uint256);
    function lastConfirmedRatio() external returns (uint256);
}

interface IGlobalPool {

    event StakePending(address indexed staker, uint256 amount);
    event RewardClaimed(address indexed staker, uint256 amount);

    function stake() external payable;

    function claimableAnkrAVAXRewardOf(address staker) external view returns (uint256);

    function claimAllAnkrAVAX() external;

    function claim(uint256 amount) external;

    function pendingAvaxClaimsOf(address claimer) external view returns (uint256) ;
}

contract AvalanchePool is PausableUpgradeable, ReentrancyGuardUpgradeable, OwnableUpgradeable, IGlobalPool {

    using SafeMathUpgradeable for uint256;
    using MathUpgradeable for uint256;

    event IntermediaryClaimed(
        address[] stakers,
        uint64[] amounts,
        address intermediary, /* intermediary address which handle these funds */
        uint64 total /* total ether sent to intermediary */
    );

    event AvaxClaimPending(address indexed claimer, uint256 amount);

    event ClaimsServed(
        address[] claimers,
        uint64[] amounts,
        uint64 missing /* total amount of claims still waiting to be served*/
    );

    mapping(address => uint256) private _pendingUserStakes;
    address[] private _pendingStakers;
    address private _operator;
    uint256 private _collectedFee;
    uint256 public requesterMinimumPoolStaking;
    uint256 public avaxMultiplier;
    IERC20Manageable private _ankrAvaxContract;
    mapping(address => uint256) _ankrAvaxPendingRewards;
    uint256 private _pendingGap;

    mapping(address => uint256) private _pendingUserClaims;
    address[] private _pendingClaimers;

    uint256 private _pendingAvaxClaimGap;

    modifier onlyOperator() {
        require(msg.sender == owner() || msg.sender == _operator, "Operator: not allowed");
        _;
    }

    function initialize(address operator) public initializer {
        __Pausable_init();
        __ReentrancyGuard_init();
        __Ownable_init();

        _operator = operator;

        avaxMultiplier = 1e18;
        requesterMinimumPoolStaking = 1e15;
    }

    function stake() override external nonReentrant payable {
        require(msg.value >= requesterMinimumPoolStaking, "Value must be greater than min amount");
        require(msg.value % requesterMinimumPoolStaking == 0, "Value must be multiple of minimum staking amount");
        if (_pendingUserStakes[msg.sender] == 0) {
            _pendingStakers.push(msg.sender);
        }
        _pendingUserStakes[msg.sender] = _pendingUserStakes[msg.sender].add(msg.value);
        /* increase aETH rewards */
        uint256 ratio = IANKRAVAX(address(_ankrAvaxContract)).ratio();
        uint256 reward = msg.value.mul(ratio).div(avaxMultiplier);
        _ankrAvaxPendingRewards[msg.sender] = _ankrAvaxPendingRewards[msg.sender].add(reward);
        /* emit events */
        emit StakePending(msg.sender, msg.value);
    }

    function getPendingStakes() public onlyOperator view returns (address[] memory, uint256[] memory) {
        address[] memory addresses = new address[](_pendingStakers.length);
        uint256[] memory amounts = new uint256[](_pendingStakers.length);
        for (uint256 i = 0; i < _pendingStakers.length; i++) {
            address staker = _pendingStakers[i];
            uint256 amount = _pendingUserStakes[staker];
            if (staker != address(0)) {
                addresses[i] = staker;
                amounts[i] = amount;
            }
        }
        return (addresses, amounts);
    }

    function claimAllAnkrAVAX() override external nonReentrant {
        require(_ankrAvaxPendingRewards[msg.sender] > 0, "No AnkrAVAX rewards for claim");
        uint256 rewards = _ankrAvaxPendingRewards[msg.sender];
        _ankrAvaxPendingRewards[msg.sender] = 0;
        _ankrAvaxContract.mint(msg.sender, rewards);
        emit RewardClaimed(msg.sender, rewards);
    }

    function claimAnkrAVAX(uint256 amount) public nonReentrant {
        require(_ankrAvaxPendingRewards[msg.sender] >= amount, "No AnkrAVAX enough rewards for claim");
        _ankrAvaxPendingRewards[msg.sender] = _ankrAvaxPendingRewards[msg.sender].sub(amount);
        _ankrAvaxContract.mint(msg.sender, amount);
        emit RewardClaimed(msg.sender, amount);
    }

    function claimableAnkrAVAXRewardOf(address staker) override external view returns (uint256) {
        return _ankrAvaxPendingRewards[staker];
    }

    function claimToIntermediary(address payable intermediary, uint256 threshold) public onlyOperator payable {
        address[] memory stakers = new address[](_pendingStakers.length.sub(_pendingGap));
        uint64[] memory amounts = new uint64[](_pendingStakers.length.sub(_pendingGap));
        uint256 total = 0;
        uint256 j = 0;
        uint256 gaps = 0;
        uint256 i = 0;
        for (i = _pendingGap; i < _pendingStakers.length; i++) {
            /* if total exceeds threshold then we can't proceed stakes anymore (don't move this check to the end of scope) */
            if (total >= threshold) {
                break;
            }
            address staker = _pendingStakers[i];
            uint256 amount = _pendingUserStakes[staker];
            /* we might have gaps lets just skip them (we shrink them on full claim) */
            if (staker == address(0) || amount == 0) {
                gaps++;
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
                /* when we delete items from array we generate new gap, lets remember how many gaps we did to skip them in next claim */
                gaps++;
            }
        }
        _pendingGap = _pendingGap.add(gaps);
        /* lets shrink array only after full claim */
        if (_pendingGap >= _pendingStakers.length) {
            delete _pendingStakers;
            /* if queue is empty we can reset pending gap since we don't have gaps anymore */
            _pendingGap = 0;
        }
        /* claim funds to intermediary */
        intermediary.transfer(total.add(msg.value));
        emit IntermediaryClaimed(stakers, amounts, intermediary, uint64(total / avaxMultiplier));
    }

    function pendingStakesOf(address staker) public view returns (uint256) {
        return _pendingUserStakes[staker];
    }

    function pendingGap() public view returns (uint256) {
        return _pendingGap;
    }

    function calcPendingGap() public onlyOwner {
        uint256 gaps = 0;
        for (uint256 i = 0; i < _pendingStakers.length; i++) {
            address staker = _pendingStakers[i];
            if (staker != address(0)) {
                break;
            }
            gaps++;
        }
        _pendingGap = gaps;
    }

    function resetPendingGap() public onlyOwner {
        _pendingGap = 0;
    }

    function burnAnkrAvaxRewards(address staker, uint256 amount) public onlyOwner {
        _ankrAvaxPendingRewards[staker] = _ankrAvaxPendingRewards[staker].sub(amount);
    }

    function changeOperator(address operator) public onlyOwner {
        _operator = operator;
    }

    function changeAnkrAvaxContract(IANKRAVAX ankrAvaxContract) public onlyOwner {
        _ankrAvaxContract = ankrAvaxContract;
    }

    function claim(uint256 amount) override external nonReentrant {
        require(_ankrAvaxContract.balanceOf(msg.sender) >= amount, "Cannot claim more than have on address");
        if (_pendingUserClaims[msg.sender] == 0) {
            _pendingClaimers.push(msg.sender);
        }
        _pendingUserClaims[msg.sender] = _pendingUserClaims[msg.sender].add(amount);
        _ankrAvaxContract.burn(msg.sender, amount);
        emit AvaxClaimPending(msg.sender, amount);
    }

    function pendingAvaxClaimsOf(address claimer) override external view returns (uint256) {
        return _pendingUserClaims[claimer];
    }

    function getPendingClaims() public onlyOperator view returns (address[] memory, uint256[] memory) {
        address[] memory addresses = new address[](_pendingClaimers.length);
        uint256[] memory amounts = new uint256[](_pendingClaimers.length);
        for (uint256 i = 0; i < _pendingClaimers.length; i++) {
            address claimer = _pendingClaimers[i];
            uint256 amount = _pendingUserClaims[claimer];
            if (claimer != address(0)) {
                addresses[i] = claimer;
                amounts[i] = amount;
            }
        }
        return (addresses, amounts);
    }

    function serveClaims(address payable residueAddress, uint256 threshold) public onlyOperator payable {
        address[] memory claimers = new address[](_pendingClaimers.length.sub(_pendingAvaxClaimGap));
        uint64[] memory amounts = new uint64[](_pendingClaimers.length.sub(_pendingAvaxClaimGap));
        uint256 availableAmount = msg.value;
        uint256 j = 0;
        uint256 gaps = 0;
        uint256 i = 0;
        uint256 ratio = IANKRAVAX(address(_ankrAvaxContract)).lastConfirmedRatio();
        for (i = _pendingAvaxClaimGap; i < _pendingClaimers.length; i++) {
            /* if the number of tokens left is less than threshold do not try to serve the claims */
            if (availableAmount < threshold) {
                break;
            }
            address claimer = _pendingClaimers[i];
            uint256 amount = _pendingUserClaims[claimer];
            /* we might have gaps lets just skip them (we shrink them on full claim) */
            if (claimer == address(0) || amount == 0) {
                gaps++;
                continue;
            }
            amount = amount.mul(avaxMultiplier).div(ratio);
            if (availableAmount < amount) {
                break;
            }
            claimers[j] = claimer;
            amounts[j] = uint64(amount / 1e9);
            address payable wallet = payable(address(claimer));
            wallet.transfer(amount);
            availableAmount = availableAmount.sub(amount);
            j++;
            _pendingUserClaims[claimer] = 0;
            delete _pendingClaimers[i];
            /* when we delete items from array we generate new gap, lets remember how many gaps we did to skip them in next claim */
            gaps++;
        }
        _pendingAvaxClaimGap = _pendingAvaxClaimGap.add(gaps);
        /* lets shrink array only after full claim */
        if (_pendingAvaxClaimGap >= _pendingClaimers.length) {
            delete _pendingClaimers;
            /* if queue is empty we can reset pending gap since we don't have gaps anymore */
            _pendingAvaxClaimGap = 0;
        }
        uint256 missing = 0;
        for (i = _pendingAvaxClaimGap; i < _pendingClaimers.length; i++) {
            missing = missing.add(_pendingUserClaims[_pendingClaimers[i]].mul(avaxMultiplier).div(ratio));
        }
        /* Send event with results */
        emit ClaimsServed(claimers, amounts, uint64(missing / avaxMultiplier));
        if (availableAmount > 0) {
            residueAddress.transfer(availableAmount);
        }
    }

    function pendingClaimGap() public view returns (uint256) {
        return _pendingAvaxClaimGap;
    }

    function calcPendingClaimGap() public onlyOwner {
        uint256 gaps = 0;
        for (uint256 i = 0; i < _pendingClaimers.length; i++) {
            address staker = _pendingClaimers[i];
            if (staker != address(0)) {
                break;
            }
            gaps++;
        }
        _pendingAvaxClaimGap = gaps;
    }

    function resetPendingClaimGap() public onlyOwner {
        _pendingAvaxClaimGap = 0;
    }
}