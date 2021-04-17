const BinancePool = artifacts.require("BinancePool");

const {deployProxy} = require("@openzeppelin/truffle-upgrades");

module.exports = async (deployer) => {
    let pegEthContract,
        operatorAddress;
    switch (deployer.network) {
        case 'smartchaintestnet':
        case 'test':
            pegEthContract = "0xd66c6b4f0be8ce5b39d52e0fd1344c389929b378"
            operatorAddress = "0x256e78f10eE9897bda1c36C30471A2b3c8aE5186";
            break;
        case 'smartchain':
            pegEthContract = "0x2170ed0880ac9a755fd29b2688956bd959f933f8"
            operatorAddress = "0x4069D8A3dE3A72EcA86CA5e0a4B94619085E7362";
            break;
        default: {
            throw new Error(`Not supported network (${deployer.network}), Peg-ETH doesn't exist`)
        }
    }
    await deployProxy(BinancePool, [pegEthContract, operatorAddress], {deployer});
};