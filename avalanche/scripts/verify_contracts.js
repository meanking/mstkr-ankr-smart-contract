require("dotenv").config();
const { spawnSync } = require("child_process");

module.exports = async function(done) {
  try {
    const networkId = await web3.eth.net.getId()
    let implFile, networkName
    switch (networkId) {
      case 56: {
        implFile = require('./../.openzeppelin/unknown-56.json')
        networkName = 'goerli'
        break;
      }
      case 97: {
        implFile = require('./../.openzeppelin/unknown-97.json')
        networkName = 'mainnet'
        break;
      }
      default: {
        throw new Error(`Unknown network ${networkId}`)
      }
    }
    const impls = Object.keys(implFile.impls).reverse()
    for (const impl of impls) {
      const implObj = implFile.impls[impl]
      const storage = implObj.layout.storage

      // verify
      // truffle run verify SimpleStorage@0x61C9157A9EfCaf6022243fA65Ef4666ECc9FD3D7
      const contract = storage[storage.length - 1].contract
      const address = implObj.address

      try {
        const a = await spawnSync('npx', ['truffle', 'run', 'verify', `${contract}@${address}`,'--network', networkName])
        console.log(a.stdout.toString())
      }
      catch (e) {
        console.log(`Couldn't verify ${contract}`)
        done(e)
      }
    }
  }
  catch (e) {
    done(e)
  }
  done();
};