// SPDX-License-Identifier: GPL-3.0-only
pragma solidity ^0.7.6;

import "@openzeppelin/contracts-upgradeable/math/SafeMathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/math/MathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

contract AETH is OwnableUpgradeable, ERC20Upgradeable {

    using SafeMathUpgradeable for uint256;
    using MathUpgradeable for uint256;

    address private _operator;

    function initialize(address operator) public initializer {
        __Ownable_init();
        __ERC20_init("Ankr Eth2 Reward Bearing Bond", "aETH");
        _operator = operator;
    }

    function mint(address owner, uint256 amount) public onlyOperator {
        _mint(owner, amount);
    }

    function burn(address owner, uint256 amount) public onlyOperator {
        _burn(owner, amount);
    }

    function changeOperator(address operator) public onlyOwner {
        _operator = operator;
    }

    modifier onlyOperator() {
        require(msg.sender == owner() || msg.sender == _operator, "Operator: not allowed");
        _;
    }
}