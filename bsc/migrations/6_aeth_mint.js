const BinancePool = artifacts.require("BinancePool");
const BinancePool_R3 = artifacts.require("BinancePool_R3");

const AETH = artifacts.require("AETH");
const AETH_R1 = artifacts.require("AETH_R1");

const {upgradeProxy} = require("@openzeppelin/truffle-upgrades");

module.exports = async (deployer) => {
    const prevGlobalPool = await BinancePool.deployed();
    const globalPool = await upgradeProxy(prevGlobalPool.address, BinancePool_R3, {deployer});
    const prevAeth = await AETH.deployed();
    const aeth = await upgradeProxy(prevAeth.address, AETH_R1, {deployer});
    await globalPool.changeAethContract(prevAeth.address);
    await aeth.changeBinancePool(prevGlobalPool.address);
    /* check latest ratio here https://etherscan.io/address/0xE95A203B1a91a908F9B9CE46459d101078c2c3cb#readProxyContract */
    await aeth.updateRatio('989889597307327872');
};