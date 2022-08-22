require("@nomiclabs/hardhat-waffle");
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
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {
      allowUnlimitedContractSize: true,
      gasPrice: 0,
      initialBaseFeePerGas: 0,
      gasMultiplier: 0,
      accounts: [{ privateKey: "f14ba714b8a52c457c68b5cfa7b083084cb770ad1aa9ca127986641e91b813e1", balance: "1000000000000000000000000000000000000000000000000000000" }]
    }
  },
  solidity: "0.8.4",
};
