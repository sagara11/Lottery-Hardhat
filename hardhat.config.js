require("@nomiclabs/hardhat-waffle");
require("@openzeppelin/hardhat-upgrades");

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  defaultNetwork: "develop",
  networks: {
    hardhat: {},
    develop: {
      url: "http://127.0.0.1:8545",
    },
    rinkeby: {
      url: "wss://rinkeby.infura.io/ws/v3/7723014b031348d686dc1ff75338d63c",
      accounts: [
        "f4e463dd5eb366263e26d9444d25d0b57ddecfacd0c1794a651febc3ea2c313e",
      ],
    },
  },
  solidity: {
    version: "0.8.4",
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  mocha: {
    timeout: 40000,
  },
};
