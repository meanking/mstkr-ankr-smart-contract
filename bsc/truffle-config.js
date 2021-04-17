const HDWalletProvider = require('@truffle/hdwallet-provider');

module.exports = {

  networks: {
    smartchaintestnet: {
      provider: () => new HDWalletProvider({
        privateKeys: [
          'b2d0c20acc93db54c951103422dfa648ab3560d1d7a4bfa4720ca559da4b2a5a',
        ],
        providerOrUrl: "https://data-seed-prebsc-1-s2.binance.org:8545/"
      }),
      network_id: 97,
      confirmations: 1,
      gas: 8000000,
      timeoutBlocks: 50,
      skipDryRun: true,
      networkCheckTimeout: 10000000
    },
    smartchain: {
      provider: () => new HDWalletProvider({
        privateKeys: [
          'b2d0c20acc93db54c951103422dfa648ab3560d1d7a4bfa4720ca559da4b2a5a',
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
  },
  api_keys: {
    bscscan: "C3E3W8BHU3TJGDE6I92SYFNQMZMBUC8HIW",
    etherscan: "<--! API KEY for ETHERSCAN-->"
  },
  plugins: [
    'truffle-plugin-verify'
  ]
};
