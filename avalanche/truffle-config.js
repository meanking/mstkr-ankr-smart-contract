const Web3 = require('web3');
const protocol = "http";
const ip = "207.154.228.10";
const port = 9650;

module.exports = {

  networks: {
    fujitestnetcchain: {
      provider: function()
      {
       return new Web3.providers.HttpProvider(`${protocol}://${ip}:${port}/ext/bc/C/rpc`)
      },
      network_id: 1,
      gas: 5000000,
      gasPrice: 460000000000,
      timeoutBlocks: 60,
      skipDryRun: true,
      from: '0xaF769e24839761eD9422b8FfdE2dB006F0FaE165'
    },
    avalanchecchain: {
      provider: () => new HDWalletProvider({
        privateKeys: [
          '<<-- PUT YOUR PRIVATE KEY -->>',
        ],
        providerOrUrl: "https://bsc-dataseed.binance.org/"
      }),
      network_id: 56,
      gas: 8000000,
      confirmations: 1,
      gasPrice: 20000000000,
      timeoutBlocks: 50,
      skipDryRun: true,
      networkCheckTimeout: 10000000
    }
  },

  // Set default mocha options here, use special reporters etc.
  mocha: {
    // timeout: 100000
  },

  // Configure your compilers
  compilers: {
    solc: {
      version: "0.7.6",    // Fetch exact version from solc-bin (default: truffle's version)
      settings: {          // See the solidity docs for advice about optimization and evmVersion
       optimizer: {
         enabled: false,
         runs: 200
       },
      }
    }
  }
};
