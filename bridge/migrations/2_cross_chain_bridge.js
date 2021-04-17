const CrossChainBridge = artifacts.require("CrossChainBridge");

const {deployProxy} = require("@openzeppelin/truffle-upgrades");

module.exports = async (deployer) => {
    const operatorByNetwork = {
        // BSC
        'smartchaintestnet': '0x256e78f10eE9897bda1c36C30471A2b3c8aE5186',
        'smartchain': '0x4069D8A3dE3A72EcA86CA5e0a4B94619085E7362',
        // ETH
        'goerli': '0x256e78f10eE9897bda1c36C30471A2b3c8aE5186',
        'mainnet': '0x4069D8A3dE3A72EcA86CA5e0a4B94619085E7362',
        // unit tests
        'test': '0x256e78f10eE9897bda1c36C30471A2b3c8aE5186',
    };
    const operatorAddress = operatorByNetwork[deployer.network]
    if (!operatorAddress) throw new Error(`Operator doesn't exist for network ${deployer.network}`)
    await deployProxy(CrossChainBridge, [operatorAddress], {deployer});
};