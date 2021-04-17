const AETH = artifacts.require("AETH");

const {deployProxy} = require("@openzeppelin/truffle-upgrades");

module.exports = async (deployer) => {
    let operatorAddress;
    switch (deployer.network) {
        case 'smartchaintestnet':
        case 'test':
            operatorAddress = "0x256e78f10eE9897bda1c36C30471A2b3c8aE5186";
            break;
        case 'smartchain':
            operatorAddress = "0x4069D8A3dE3A72EcA86CA5e0a4B94619085E7362";
            break;
        default: {
            throw new Error(`Not supported network (${deployer.network}), Peg-ETH doesn't exist`)
        }
    }
    await deployProxy(AETH, [operatorAddress], {deployer});
};