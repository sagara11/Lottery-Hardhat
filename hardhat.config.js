require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-ethers");
require("@nomiclabs/hardhat-etherscan");
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
      url: "https://speedy-nodes-nyc.moralis.io/7b7b771ec8da4cf1d3ef4985/eth/rinkeby",
      chainId: 4,
      gasPrice: 20000000000,
      accounts: [
        "f409697b940a5a46d7ecb8a3db71f4708d7b32975851978bb036b05a676cd3d0",
      ],
    },
  },
  etherscan: {
    apiKey: {
      rinkeby: "2RTSC4A1N2KT8UTNGQBJPX7GD9HS6PBVUH",
    }
  },
  solidity: {
    version: "0.8.4",
    optimizer: {
      enabled: true,
    },
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
