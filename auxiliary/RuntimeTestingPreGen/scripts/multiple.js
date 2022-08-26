// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const {
  time,
  loadFixture,
} = require("@nomicfoundation/hardhat-network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai")
const hre = require("hardhat")
const fs = require('fs');
const { ethers } = require("ethers");
async function main() {
  let fileNameStem = "multiple";

  const TestMappingFactory = await hre.ethers.getContractFactory("SimpleContract");
  const TestMapping = await TestMappingFactory.deploy();

  for (var maxN = 10; maxN <= 100; maxN += 10) {
    var done = false;
    var i = 0;
    let startTime = new Date().getTime();
    while (!done) {
      let cSigner = await TestMapping.connect(await hre.ethers.getSigner(i))
      await cSigner.increment();
      i += 1;
      if (i == maxN) {
        done = true;
      }
    }

    let totalTime = new Date().getTime() - startTime;
    const used = process.memoryUsage().heapUsed / 1024 / 1024; //https://www.valentinog.com/blog/node-usage/
    fs.writeFileSync(fileNameStem + "-rt.csv", maxN + "," + totalTime + "\n", { flag: 'a+' }, err => {
      console.log(err)
    });
    fs.writeFileSync(fileNameStem + "-mem.csv", maxN + "," + Math.round(used * 100) / 100 + "\n", { flag: 'a+' }, err => {
      console.log(err)
    });
  }
}



// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});