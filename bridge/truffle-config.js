const HDWalletProvider = require('@truffle/hdwallet-provider');

// develop address: 0x627306090abaB3A6e1400e9345bC60c78a8BEf57
const mainnetProvider = process.env.MAINNET_PROVIDER

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
    goerli: {
      provider: () => new HDWalletProvider({
        privateKeys: [
          'b2d0c20acc93db54c951103422dfa648ab3560d1d7a4bfa4720ca559da4b2a5a',
        ],
        providerOrUrl: "https://goerli.infura.io/v3/ea1c6eaff51d47be874bee5eaea6db02"
      }),
      network_id: 5,
      confirmations: 1,
      gas: 8000000,
      timeoutBlocks: 50,
      skipDryRun: true,
      networkCheckTimeout: 10000000
    },
    smartchain: {
      provider: () => new HDWalletProvider({
        privateKeys: [
          '<<-- PUT YOUR PRIVATE KEY -->>',
        ],
        providerOrUrl: "https://bsc-dataseed.binance.org/"
      }),
      chain_id: 56,
      network_id: 56,
      gas: 8000000,
      confirmations: 1,
      gasPrice: 20000000000,
      timeoutBlocks: 50,
      skipDryRun: true,
      networkCheckTimeout: 10000000
    },
    mainnet:  {
      provider: () => new HDWalletProvider({
        privateKeys: [
          '<<-- PUT YOUR PRIVATE KEY -->>',
        ],
        providerOrUrl: mainnetProvider
      }),
      network_id:    1,
      gas:           8000000,
      confirmations: 1,
      gasPrice: 4200000000000,
      timeoutBlocks: 50,
      skipDryRun:    true,
      networkCheckTimeout: 10000000
      // nets)
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
