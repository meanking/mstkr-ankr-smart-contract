const CrossChainBridge = artifacts.require("CrossChainBridge");

const {deployProxy} = require("@openzeppelin/truffle-upgrades");

const MINTABLE_BRIDGE = '0';
const LOCKABLE_BRIDGE = '1';

module.exports = async (deployer) => {
    const aEthContractAddress = {
        'goerli': '0x63dC5749fa134fF3B752813388a7215460a8aB01',
        'smartchaintestnet': '0x81f151c7104AC815e5F66bAAae91b0F85634Bb04',
        'test': '0x63dC5749fa134fF3B752813388a7215460a8aB01',
        'mainnet': '0xE95A203B1a91a908F9B9CE46459d101078c2c3cb',
        'smartchain': '0x973616ff3b9d8F88411C5b4E6F928EE541e4d01f',
    };
    const chainNetwork = {
        'goerli': '5',
        'smartchaintestnet': '97',
        'mainnet': '1',
        'smartchain': '57',
    };
    const crossChainBridge = await CrossChainBridge.deployed();
    if (deployer.network === 'goerli') {
        await crossChainBridge.registerBridge(MINTABLE_BRIDGE, aEthContractAddress['goerli'], aEthContractAddress['smartchaintestnet'], web3.utils.numberToHex(chainNetwork['smartchaintestnet']));
    } else if (deployer.network === 'smartchaintestnet') {
        await crossChainBridge.registerBridge(MINTABLE_BRIDGE, aEthContractAddress['smartchaintestnet'], aEthContractAddress['goerli'], web3.utils.numberToHex(chainNetwork['goerli']));
    } else if (deployer.network === 'test') {
        await crossChainBridge.registerBridge(MINTABLE_BRIDGE, aEthContractAddress['test'], aEthContractAddress['smartchaintestnet'], web3.utils.numberToHex(chainNetwork['smartchaintestnet']));
    } else if (deployer.network === 'mainnet') {
        await crossChainBridge.registerBridge(MINTABLE_BRIDGE, aEthContractAddress['mainnet'], aEthContractAddress['smartchain'], web3.utils.numberToHex(chainNetwork['smartchain']));
    } else if (deployer.network === 'smartchain') {
        await crossChainBridge.registerBridge(MINTABLE_BRIDGE, aEthContractAddress['smartchain'], aEthContractAddress['mainnet'], web3.utils.numberToHex(chainNetwork['mainnet']));
    } else {
        throw new Error(`Not supported chain yet`);
    }
    const bridges = await crossChainBridge.getAllBridges();
    console.log(`All Bridges: ${JSON.stringify(bridges, null, 2)}`);
};