// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
// const {
//     time,
//     loadFixture,
// } = require("@nomicfoundation/hardhat-network-helpers");
// const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
// const { expect } = require("chai")
const hre = require("hardhat")
const fs = require('fs');

async function handleNewValidator(tx, addressToIndex, addressToBehavior) { //request sign up and device posting key for new validator
    let requestContract = await hre.ethers.getContractAt("Request", tx.to);
    let newValidatorEvent = tx.events.find(newRequestEvent => newRequestEvent.event == "NewValidator");
    let deviceSigner = await hre.ethers.getSigner(addressToIndex[newValidatorEvent.args["deviceAddress"]])
    let requestContractAsDeviceSigner = await requestContract.connect(deviceSigner);
    let ownerNodeBehavior = addressToBehavior[newValidatorEvent.args["ownerAddress"]];
    var key = "1";
    if (ownerNodeBehavior == 0) {
        key = "-1";
    }
    let newKeyTx = await requestContractAsDeviceSigner.postValidatorDataKey(tx.from, hre.ethers.utils.formatBytes32String(key));
    return await newKeyTx.wait();
}


async function handleValidatorRating(tx, addressToIndex) {//post key for requestor if all validators have responded to request
    let requestContract = await hre.ethers.getContractAt("Request", tx.to);
    let newValidatorEvent = tx.events.find(newRequestEvent => newRequestEvent.event == "RequestValidated");
    if (newValidatorEvent.args["complete"] == true) {
        if (newValidatorEvent.args["validity"] == true) {
            let requestContractAsValidator = await requestContract.connect(await hre.ethers.getSigner(addressToIndex[newValidatorEvent.args["deviceAddress"]]));
            requestContractAsValidator.postRequestorDataKey(hre.ethers.utils.formatBytes32String("10" + tx.from.substring(3, 5)));
            return 1;
        }
        return -1;
    }
    return 0;
}
async function main() {
    await hre.run('compile');

    //Experiment Setup
    const args = process.argv.slice(2);
    let simNum = parseInt(args[0]);
    let maliciousPercentage = parseInt(args[1]);
    let networkParticipants = parseInt(args[2]);
    const MainNetworkFactory = await hre.ethers.getContractFactory("Network");
    const MainNetwork = await MainNetworkFactory.deploy("TestNet");
    let maxRequestsInBuffer = networkParticipants * networkParticipants;
    let totalActions = networkParticipants * 30;

    //Number of requests validated and outgoing requests made by parisitic, average, altruistic nodes
    let numValidateRequests = [5, 5, 5];
    let numRequestsMade = [3, 2, 1];

    let averageNodePercentage = 100 - maliciousPercentage - 15;
    let weights = [maliciousPercentage / 100, averageNodePercentage / 100, 0.15];
    let nums = [0, 1, 2];

    let behaviorOfNodes = [0, 0, 0];
    let reputationOfNodes = [0, 0, 0];
    let actionOfNodes = [];
    let addressToIndex = {};
    let addressToBehavior = {};
    let addressToDeviceSC = {};

    //Each node initially joins the network
    for (var signerNum = 0; signerNum < networkParticipants; signerNum++) {
        let currentSigner = await hre.ethers.getSigner(signerNum);
        let behavior = getRandom(weights, nums);

        let connected = await MainNetwork.connect(currentSigner);
        await connected.createOwnerSC();

        const tx = await connected.createDevice((await hre.ethers.getSigner(signerNum + networkParticipants)).address, "");
        const rc = await tx.wait();
        const event = rc.events.find(event => event.event == "NewDevice");
        addressToIndex[currentSigner.address] = signerNum;
        addressToIndex[(await hre.ethers.getSigner(signerNum + networkParticipants)).address] = signerNum + networkParticipants;
        addressToBehavior[currentSigner.address] = behavior;
        addressToDeviceSC[currentSigner.address] = event.args["deviceSC"];
        behaviorOfNodes[behavior] += 1;
        actionOfNodes.push(0);

    }
    var actions = 0;

    var openRequests = [];

    while (actions <= totalActions) {
        let startTime = new Date().getTime();
        let randIndex = Math.floor(Math.random() * networkParticipants)

        let currentNode = await hre.ethers.getSigner(randIndex); //picks a random node
        actionOfNodes[randIndex] += 1;

        var maxIter = numValidateRequests[addressToBehavior[currentNode.address]]; //gets the number of requests to validate based on the current node's behavior
        if (openRequests.length < maxIter) {
            maxIter = openRequests.length;
        }
        let connected = await MainNetwork.connect(currentNode);

        //Start of Vaidation Process
        for (var requestNum = maxIter - 1; requestNum >= 0; requestNum--) {
            let currentRequest = await hre.ethers.getContractAt("Request", openRequests[requestNum]);
            let requestAsNode = await currentRequest.connect(currentNode);

            if (!(await currentRequest.checkValidatorEligibility(currentNode.address))) {
                continue;
            }

            let isMalicious = await connected.isMalicious(currentNode.address);
            if (!isMalicious) {

                let volunteerTx = await requestAsNode.volunteerAsValidator();
                let volunteerTxRC = await volunteerTx.wait(); //volunteers for request
                let keyTx = await handleNewValidator(volunteerTxRC, addressToIndex, addressToBehavior); //waits until device posts access key
                let newValidatorEvent = keyTx.events.find(newRequestEvent => newRequestEvent.event == "NewValidatorKeyPosted");
                let key = await hre.ethers.utils.parseBytes32String(newValidatorEvent.args["accessKey"]); //reads access key

                var rating = true;
                if (key == "-1" && addressToBehavior[currentNode.address] != 0) { //behavior == 0 indicates a malicious node, -1 as a key indicates malicious data, 1 as a key indicates correct data
                    rating = false;
                }
                if (key == "1" && addressToBehavior[currentNode.address] == 0) {
                    rating = false;
                }

                let ratingTx = await requestAsNode.postRating(rating);
                let ratingTxRC = await ratingTx.wait();
                let status = await handleValidatorRating(ratingTxRC, addressToIndex);
                if (status != 0) {
                    openRequests.splice(requestNum, 1); //request is no longer open
                }
            }
        }

        if (openRequests.length < maxRequestsInBuffer) { //similar process for making outgoing requests
            for (var outgoingRequestNum = 0; outgoingRequestNum < numRequestsMade[addressToBehavior[currentNode.address]]; outgoingRequestNum++) {
                let randProviderIndex = Math.floor(Math.random() * networkParticipants);
                let isMalicious = await connected.isMalicious((await hre.ethers.getSigner(randIndex)).address);;
                if (randProviderIndex == randIndex) {
                    continue;
                }
                if (isMalicious) {
                    break;
                }

                //console.log(await connected.createRequest());
                let deviceAddr = addressToDeviceSC[(await hre.ethers.getSigner(randProviderIndex)).address];
                const tx = await connected.createRequest(deviceAddr);
                const rc = await tx.wait();
                const event = rc.events.find(event => event.event == "NewRequest");
                openRequests.push(event.args["requestSC"]);
            }
        }
        //logging
        fs.writeFileSync('./experiments/' + maliciousPercentage + "/" + networkParticipants + '-' + simNum + '-timestamps.csv', ((new Date().getTime() - startTime) + "\n")
            , { flag: 'a+' }, err => {
                console.log(err);
            });
        if (actions % (5 * networkParticipants) == 0) {
            for (var networkParticipantNum = 0; networkParticipantNum < networkParticipants; networkParticipantNum++) {
                let nodeSC = await hre.ethers.getContractAt("Owner", await MainNetwork.getOwnerSC((await hre.ethers.getSigner(networkParticipantNum)).address));
                reputationOfNodes[addressToBehavior[(await hre.ethers.getSigner(networkParticipantNum)).address]] += parseInt(await nodeSC.getReputationScore());
            }
            let avgRepScores = [0, 0, 0]
            for (var behaviorNum = 0; behaviorNum < behaviorOfNodes.length; behaviorNum++) {
                let avg = reputationOfNodes[behaviorNum] / behaviorOfNodes[behaviorNum];
                avgRepScores[behaviorNum] = avg;
            }
            let content = "" + (actions / (5 * networkParticipants)) + "," + avgRepScores.join() + ",";

            fs.writeFileSync('./experiments/' + maliciousPercentage + "/" + networkParticipants + '-' + simNum + '-repScores.csv', content, { flag: 'a+' }, err => {
                console.log(err)
            });

        }
        actions += 1;

    }
    fs.writeFileSync('./experiments/' + maliciousPercentage + "/" + networkParticipants + '-' + simNum + '-actionDistribution.csv', actionOfNodes.join("\n") + "\n", { flag: 'a+' }, err => {
        console.log(err)
    });


}

function getRandom(weights, results) {
    var num = Math.random(),
        s = 0,
        lastIndex = weights.length - 1;

    for (var i = 0; i < lastIndex; ++i) {
        s += weights[i];
        if (num < s) {
            return results[i];
        }
    }

    return results[lastIndex];
};

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
