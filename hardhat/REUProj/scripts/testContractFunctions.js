// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const { hexZeroPad } = require("ethers/lib/utils");
const hre = require("hardhat");

async function generateRandomSigners(amount){
  let addressToSigner = {}
  for (let i = 0; i < amount; i++) {
    var wallet = await ethers.Wallet.createRandom();
    wallet = await wallet.connect(hre.ethers.provider);
    let whale = await hre.ethers.getSigner(0);
    await whale.sendTransaction({to: wallet.address, value: ethers.utils.parseEther("1")});
    addressToSigner[wallet.address] = wallet;
  }
  return addressToSigner
}



async function main() {
  // Hardhat always runs the compile task when running scripts with its command
  // line interface.
  //
  // If this script is run directly using `node` you may want to call compile
  // manually to make sure everything is compiled
  await hre.run('compile');

  //Main Network Setup
  const MainNetworkFactory = await hre.ethers.getContractFactory("Network");
  const MainNetwork = await MainNetworkFactory.deploy("TestNet");
  console.log("The network is now live");

  let addressToSigner = await generateRandomSigners(6);

  //Simulating a network request
  let provider = addressToSigner[Object.keys(addressToSigner)[0]]; //device owner's account
  let networkAsProvider = await MainNetwork.connect(provider);

  let thermometerDeviceAccount = addressToSigner[Object.keys(addressToSigner)[1]]; //device's account
  
  // //Accounts participating in a request
  let requestor = addressToSigner[Object.keys(addressToSigner)[2]];
  let validatorOne = addressToSigner[Object.keys(addressToSigner)[3]];
  let validatorTwo = addressToSigner[Object.keys(addressToSigner)[4]];
  let validatorThree = addressToSigner[Object.keys(addressToSigner)[5]];
  
  // //Device Registration
  console.log("Registering Device");
  let deviceTx = await networkAsProvider.createDevice(thermometerDeviceAccount.getAddress(), "Thermometer");
  const deviceTxRC = await deviceTx.wait();
  const newDeviceEvent = deviceTxRC.events.find(newDeviceEvent => newDeviceEvent.event == "NewDevice");
  let thermometerSC = await hre.ethers.getContractAt("Device",newDeviceEvent.args["deviceSC"]);
  console.log();

  // //Setting Minimum Reputation Score
  console.log("Setting minimum reputation score to access device to 50");
  let deviceSCAsProvider = thermometerSC.connect(provider);
  await deviceSCAsProvider.setMinReputationScore(50);
  console.log();

  console.log("Verifying that the minimim reputation score to access device is 50")
  console.log(await thermometerSC.getMinReputationScore());
  console.log();

  //Creating requests
  console.log("Creating a request");
  let networkAsRequestor = await MainNetwork.connect(requestor);
  let requestTx = await networkAsRequestor.createRequest(thermometerSC.address);
  const requestRC = await requestTx.wait();
  const newRequestEvent = requestRC.events.find(newRequestEvent => newRequestEvent.event == "NewRequest"); 
  console.log(newRequestEvent.args["requestSC"]);
  let lastRequest = await hre.ethers.getContractAt("Request",newRequestEvent.args["requestSC"]);

  // //Validators volunteering
  console.log("Waiting for validators to volunteer");

  let validators = [validatorOne, validatorTwo, validatorThree];
  let ratings = [false, true, true];
  for(var i = 0; i < validators.length; i++){
    let currentValidator = validators[i];
    let networkAsValidator = await MainNetwork.connect(currentValidator);
    await networkAsValidator.createOwnerSC();
    let requestAsValidator = await lastRequest.connect(currentValidator);

    let volunteerTx = await requestAsValidator.volunteerAsValidator();
    let volunteerTxRC = await volunteerTx.wait();
    let keyTx = await handleNewValidator(volunteerTxRC, addressToSigner);

    let requestContract = await hre.ethers.getContractAt("Request",keyTx.to);
    let newValidatorEvent = keyTx.events.find(newRequestEvent => newRequestEvent.event == "NewValidatorKeyPosted"); 
    console.log("Key: " +  await ethers.utils.parseBytes32String(newValidatorEvent.args["accessKey"]));
  
    let requestContractAsValidator = await requestContract.connect(addressToSigner[newValidatorEvent.args["validatorAddress"]]);
    let ratingTx = await requestContractAsValidator.postRating(ratings[i]);
    let ratingTxRC = await ratingTx.wait();
    await handleValidatorRating(ratingTxRC, addressToSigner);

  }

  console.log("Requestor Stats:");
  await ownerStatDump(MainNetwork, requestor.address);
  console.log("Provider Stats:");
  await ownerStatDump(MainNetwork, provider.address);
  console.log("Validator Stats:");
  await ownerStatDump(MainNetwork, validatorOne.address);
  await ownerStatDump(MainNetwork, validatorTwo.address);
  await ownerStatDump(MainNetwork, validatorThree.address);
  await networkStatDump(MainNetwork); 
  
}

async function ownerStatDump(MainNetwork, address){
  let ownerSC = await hre.ethers.getContractAt("Owner",await MainNetwork.getOwnerSC(address));
  console.log(address);
  console.log("Number of requests fulfilled: " + await ownerSC.getTotalRequestsFulfilled());
  console.log("Number of outgoing requests: " + await ownerSC.getTotalOutgoingRequests());
  console.log("Number of responses validated: " + await ownerSC.getTotalRequestsValidated());
  console.log("Reputation Score: " + await ownerSC.getReputationScore());
  console.log();
}

async function networkStatDump(MainNetwork){
  console.log("Network Stat Dump:");
  console.log("Total number of participants: " + await MainNetwork.getTotalParticipants());
  console.log("Total number of device responses: " + await MainNetwork.getTotalDeviceResponses());
  console.log("Total number of validator responses: " + await MainNetwork.getTotalValidatorResponses());
  console.log("Average device responses(scaled by 100): " + await MainNetwork.getAverageProviderScore());
  console.log("Average validator responses(scaled by 100): " + await MainNetwork.getAverageValidatorScore());
  console.log();
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
