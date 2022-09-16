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


  let fileNameStemMT = "multiSign-st";
  fs.writeFileSync(fileNameStemMT + "-rt.csv", new Date().toString() + "\n", { flag: 'a+' }, err => {
    console.log(err)
  });
  const TestMappingFactory = await hre.ethers.getContractFactory("SimpleContract");
  const TestMapping = await TestMappingFactory.deploy();


  for (var maxN = 10; maxN <= 50; maxN += 10) {
    let startTime = new Date().getTime();
    await performExperimentST(TestMapping, maxN)
    console.log(await TestMapping.getCount())
    let totalTime = new Date().getTime() - startTime;
    const used = process.memoryUsage().heapUsed / 1024 / 1024; //https://www.valentinog.com/blog/node-usage/

    fs.writeFileSync(fileNameStemMT + "-rt.csv", maxN + "," + totalTime + "\n", { flag: 'a+' }, err => {
      console.log(err)
    });
    fs.writeFileSync(fileNameStemMT + "-mem.csv", maxN + "," + Math.round(used * 100) / 100 + "\n", { flag: 'a+' }, err => {
      console.log(err)
    });
  }
}

async function performExperimentMT(TestMapping, maxN) {
  var done = false;
  var i = 0;
  while (!done) {
    for (var j = 0; j < 100; j++) {
      let cSigner = TestMapping.connect(await hre.ethers.getSigner(i));
      let secondSigner = TestMapping.connect(await hre.ethers.getSigner((i + j) % maxN));
      cSigner.increment().then(
        () => secondSigner.increment().then(
          () => cSigner.increment().then(
            () => secondSigner.increment().then(
              () => cSigner.increment()
            )
          )
        )
      )
    }
    i += 1;
    if (i > maxN) {
      done = true;
    }
  }
}

async function performExperimentST(TestMapping, maxN) {
  var done = false;
  var i = 0;
  while (!done) {
    for (var j = 0; j < 100; j++) {
      let cSigner = TestMapping.connect(await hre.ethers.getSigner(i));
      let secondSigner = TestMapping.connect(await hre.ethers.getSigner((i + j) % maxN));
      await cSigner.increment()
      await secondSigner.increment()
      await cSigner.increment()
      await secondSigner.increment()
      await cSigner.increment()
    }
    i += 1;
    if (i > maxN) {
      done = true;
    }
  }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});