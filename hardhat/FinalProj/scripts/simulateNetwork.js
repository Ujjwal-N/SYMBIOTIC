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
// const { ethers } = require("ethers");
class Node {
    static network;

    static async networkStatDump() {
        let networkStats = [];
        networkStats.push(await Node.network.getTotalParticipants());
        networkStats.push(await Node.network.getTotalDeviceResponses());
        networkStats.push(await Node.network.getTotalValidatorResponses());
        networkStats.push(await Node.network.getAverageProviderScore());
        networkStats.push(await Node.network.getAverageValidatorScore());
        return networkStats;
    }

    static async getAverageValidatorScore() {
        return await Node.network.getAverageValidatorScore();
    }

    constructor(signer, behavior) {
        this.signer = signer;
        this.behavior = behavior;

        this.deviceWallet = null;
        this.deviceSC = null;
    }

    async createSC(_networkAsNode) {
        await _networkAsNode.createOwnerSC();
    }

    async registerDevice(_deviceWallet, _networkAsNode) {
        if (this.deviceWallet != null) {
            return;
        }
        this.deviceWallet = _deviceWallet;

        const tx = await _networkAsNode.createDevice(this.deviceWallet.getAddress(), "");
        const rc = await tx.wait();
        const event = rc.events.find(event => event.event == "NewDevice");
        this.deviceSC = await hre.ethers.getContractAt("Device", event.args["deviceSC"]);
    }
    async createRequest(_otherNode, _networkAsNode) {

        const tx = await _networkAsNode.createRequest(_otherNode.deviceSC.address);
        const rc = await tx.wait();
        const event = rc.events.find(event => event.event == "NewRequest");
        return await hre.ethers.getContractAt("Request", event.args["requestSC"]);
    }

    async isMalicious(_networkAsNode) {
        return await _networkAsNode.isMalicious(this.signer.address);
    }


    async getReputationScore() {
        let nodeSC = await hre.ethers.getContractAt("Owner", await Node.network.getOwnerSC(this.signer.address));
        return await nodeSC.getReputationScore();
    }

    async statDump() {
        let nodeSC = await hre.ethers.getContractAt("Owner", await Node.network.getOwnerSC(this.signer.address));
        let nodeSCAsNode = await nodeSC.connect(this.signer);
        console.log(await this.signer.getAddress());
        console.log("Number of requests fulfilled: " + await nodeSCAsNode.getTotalRequestsFulfilled());
        console.log("Number of outgoing requests: " + await nodeSCAsNode.getTotalOutgoingRequests());
        console.log("Number of responses validated: " + await nodeSCAsNode.getTotalRequestsValidated());
        console.log("Behavior: " + this.behavior);
        console.log("Reputation Score: " + await nodeSCAsNode.getReputationScore());
        console.log();
    }

    toString() {
        return this.signer.address;
    }

}



async function generateRandomSigners(amount) {
    let retVar = []
    for (let i = 0; i < amount; i++) {
        retVar.push(await hre.ethers.getSigner(i));
    }
    return retVar
}


async function handleNewValidator(tx, addressToNode) { //request sign up and device posting key for new validator
    let requestContract = await hre.ethers.getContractAt("Request", tx.to);
    let newValidatorEvent = tx.events.find(newRequestEvent => newRequestEvent.event == "NewValidator");
    let requestContractAsValidator = await requestContract.connect(addressToNode[newValidatorEvent.args["deviceAddress"]]);
    let ownerNode = addressToNode[newValidatorEvent.args["ownerAddress"]];
    var key = "1";
    if (ownerNode.rating == 0) {
        key = "-1";
    }
    let newKeyTx = await requestContractAsValidator.postValidatorDataKey(tx.from, hre.ethers.utils.formatBytes32String(key));
    return await newKeyTx.wait();
}


async function handleValidatorRating(tx, addressToNode) {//post key for requestor if all validators have responded to request
    let requestContract = await hre.ethers.getContractAt("Request", tx.to);
    let newValidatorEvent = tx.events.find(newRequestEvent => newRequestEvent.event == "RequestValidated");
    if (newValidatorEvent.args["complete"] == true) {
        if (newValidatorEvent.args["validity"] == true) {
            let requestContractAsValidator = await requestContract.connect(addressToNode[newValidatorEvent.args["deviceAddress"]]);
            await requestContractAsValidator.postRequestorDataKey(hre.ethers.utils.formatBytes32String("10" + tx.from.substring(3, 5)));
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
    Node.network = MainNetwork;
    let maxRequestsInBuffer = networkParticipants * networkParticipants;
    let totalActions = networkParticipants * 30;

    //Number of requests validated and outgoing requests made by parisitic, average, altruistic nodes
    let numValidateRequests = [5, 5, 5];
    let numRequestsMade = [3, 2, 1];

    let averageNodePercentage = 100 - maliciousPercentage - 15;
    let weights = [maliciousPercentage / 100, averageNodePercentage / 100, 0.15];
    let nums = [0, 1, 2];

    let signers = await generateRandomSigners(2 * networkParticipants);
    console.log(signers.length);
    let behaviorOfNodes = [0, 0, 0];
    let reputationOfNodes = [0, 0, 0];
    let actionOfNodes = [];
    let addressToNode = [];

    //Each node initially joins the network
    for (var signerNum = 0; signerNum < signers.length; signerNum++) {
        if (signerNum >= networkParticipants) {
            addressToNode[signers[signerNum].address] = signers[signerNum];
        } else {
            let behavior = getRandom(weights, nums);
            let newNode = new Node(signers[signerNum], behavior);
            let connected = MainNetwork.connect(signers[signerNum]);
            await newNode.createSC(connected);
            await newNode.registerDevice(signers[signerNum + networkParticipants], connected);
            addressToNode[signers[signerNum].address] = newNode;
            behaviorOfNodes[behavior] += 1;
            actionOfNodes.push(0);
        }
    }
    var actions = 0;

    var openRequests = [];

    let addressesArray = Object.keys(addressToNode);

    while (actions <= totalActions) {
        let startTime = new Date().getTime();
        let randIndex = Math.floor(Math.random() * networkParticipants)

        let currentNode = addressToNode[addressesArray[randIndex]]; //picks a random node
        actionOfNodes[randIndex] += 1;

        var maxIter = numValidateRequests[currentNode.behavior]; //gets the number of requests to validate based on the current node's behavior
        if (openRequests.length < maxIter) {
            maxIter = openRequests.length;
        }
        let connected = MainNetwork.connect(currentNode.signer);
        //Start of Vaidation Process
        for (var requestNum = maxIter - 1; requestNum >= 0; requestNum--) {
            let currentRequest = openRequests[requestNum];
            let requestAsNode = await currentRequest.connect(currentNode.signer);

            if (!(await currentRequest.checkValidatorEligibility(currentNode.signer.address))) {
                continue;
            }

            let isMalicious = await currentNode.isMalicious(connected);
            if (!isMalicious) {

                let volunteerTx = await requestAsNode.volunteerAsValidator();
                let volunteerTxRC = await volunteerTx.wait(); //volunteers for request
                let keyTx = await handleNewValidator(volunteerTxRC, addressToNode); //waits until device posts access key
                let newValidatorEvent = keyTx.events.find(newRequestEvent => newRequestEvent.event == "NewValidatorKeyPosted");
                let key = await hre.ethers.utils.parseBytes32String(newValidatorEvent.args["accessKey"]); //reads access key

                var rating = true;
                if (key == "-1" && currentNode.behavior != 0) { //behavior == 0 indicates a malicious node, -1 as a key indicates malicious data, 1 as a key indicates correct data
                    rating = false;
                }
                if (key == "1" && currentNode.behavior == 0) {
                    rating = false;
                }

                let ratingTx = await requestAsNode.postRating(rating);
                let ratingTxRC = await ratingTx.wait();
                let status = await handleValidatorRating(ratingTxRC, addressToNode);
                if (status != 0) {
                    openRequests.splice(requestNum, 1); //request is no longer open
                }
            }
        }

        if (openRequests.length < maxRequestsInBuffer) { //similar process for making outgoing requests
            for (var outgoingRequestNum = 0; outgoingRequestNum < numRequestsMade[currentNode.behavior]; outgoingRequestNum++) {
                let randProviderIndex = Math.floor(Math.random() * networkParticipants);
                let randProvider = addressToNode[addressesArray[randProviderIndex]]; //picks a random provider node
                let isMalicious = await currentNode.isMalicious(connected);
                if (randProvider == currentNode) {
                    continue;
                }
                if (isMalicious) {
                    break;
                }
                let newRequest = await currentNode.createRequest(randProvider, connected);
                openRequests.push(newRequest);
            }
        }
        //logging
        fs.writeFileSync('./experiments/' + maliciousPercentage + "/" + networkParticipants + '-' + simNum + '-timestamps.csv', ((new Date().getTime() - startTime) + "\n")
            , { flag: 'a+' }, err => {
                console.log(err);
            });
        if (actions % (5 * networkParticipants) == 0) {
            for (var networkParticipantNum = 0; networkParticipantNum < networkParticipants; networkParticipantNum++) {
                let currentNode = addressToNode[addressesArray[networkParticipantNum]]; //picks a random node
                reputationOfNodes[currentNode.behavior] += parseInt(await currentNode.getReputationScore());
            }
            let avgRepScores = [0, 0, 0]
            for (var behaviorNum = 0; behaviorNum < behaviorOfNodes.length; behaviorNum++) {
                let avg = reputationOfNodes[behaviorNum] / behaviorOfNodes[behaviorNum];
                avgRepScores[behaviorNum] = avg;
            }
            let content = "" + (actions / (5 * networkParticipants)) + "," + avgRepScores.join() + ",";
            content += (await Node.getAverageValidatorScore()) + "\n";
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
