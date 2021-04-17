// SPDX-License-Identifier: GPL-3.0-only
pragma solidity ^0.7.6;

import "@openzeppelin/contracts-upgradeable/math/SafeMathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/math/MathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

contract AnkrAVAX is OwnableUpgradeable, ERC20Upgradeable {

    using SafeMathUpgradeable for uint256;
    using MathUpgradeable for uint256;

    event RatioUpdate(uint256 newRatio);
    event LastConfirmedRatioUpdate(uint256 newRatio);

    address private _operator;
    address private _crossChainBridge;
    address private _avalanchePool;
    // ratio should be base on 1 AVAX, if ratio is 0.9, this variable should be 9e8
    uint256 private _ratio;
    uint256 private _lastConfirmedRatio;

    function initialize(address operator) public initializer {
        __Ownable_init();
        __ERC20_init("Ankr AVAX Reward Bearing Bond", "ankrAVAX");
        _operator = operator;
        _ratio = 1e18;
        _lastConfirmedRatio = 1e18;
    }

    function ratio() public view returns (uint256) {
        return _ratio;
    }

    function updateRatio(uint256 newRatio) public onlyOperator {
        _ratio = newRatio;
        emit RatioUpdate(_ratio);
    }

    function lastConfirmedRatio() public view returns (uint256) {
        return _lastConfirmedRatio;
    }

    function updateLastConfirmedRatio(uint256 newRatio) public onlyOperator {
        _lastConfirmedRatio = newRatio;
        emit LastConfirmedRatioUpdate(_lastConfirmedRatio);
    }

    function mint(address owner, uint256 amount) public onlyMinter {
        _mint(owner, amount);
    }

    function burn(address owner, uint256 amount) public onlyMinter {
        _burn(owner, amount);
    }

    modifier onlyOperator() {
        require(msg.sender == owner() || msg.sender == _operator, "Operator: not allowed");
        _;
    }

    modifier onlyMinter() {
        require(msg.sender == owner() || msg.sender == _crossChainBridge || msg.sender == _avalanchePool, "Minter: not allowed");
        _;
    }

    function changeOperator(address operator) public onlyOwner {
        _operator = operator;
    }

    function changeAvalanchePool(address avalanchePool) public onlyOwner {
        _avalanchePool = avalanchePool;
    }

    function changeCrossChainBridge(address crossChainBridge) public onlyOwner {
        _crossChainBridge = crossChainBridge;
    }
}