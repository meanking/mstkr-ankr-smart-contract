// SPDX-License-Identifier: GPL-3.0-only
pragma solidity ^0.7.6;

import "@openzeppelin/contracts-upgradeable/math/SafeMathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/math/MathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

contract AETH_R1 is OwnableUpgradeable, ERC20Upgradeable {

    using SafeMathUpgradeable for uint256;
    using MathUpgradeable for uint256;

    event RatioUpdate(uint256 newRatio);

    address private _operator;
    address private _crossChainBridge;
    address private _binancePool;
    // ratio should be base on 1 ether, if ratio is 0.9, this variable should be 9e17
    uint256 private _ratio;

    function initialize(address operator) public initializer {
        __Ownable_init();
        __ERC20_init("Ankr Eth2 Reward Bearing Bond", "aETH");
        _operator = operator;
    }

    function ratio() public view returns (uint256) {
        return _ratio;
    }

    function updateRatio(uint256 newRatio) public onlyOperator {
        _ratio = newRatio;
        emit RatioUpdate(_ratio);
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
        require(msg.sender == owner() || msg.sender == _crossChainBridge || msg.sender == _binancePool, "Minter: not allowed");
        _;
    }

    function changeOperator(address operator) public onlyOwner {
        _operator = operator;
    }

    function changeCrossChainBridge(address crossChainBridge) public onlyOwner {
        _crossChainBridge = crossChainBridge;
    }

    function changeBinancePool(address binancePool) public onlyOwner {
        _binancePool = binancePool;
    }
}