//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "./Device.sol";
import "./Request.sol";
import "./Owner.sol";

contract Network {

    event NewDevice(address indexed deviceSC);
    event NewRequest(address indexed requestSC);

    bool private constant debug = false;

    //Storage
    string private identifier; //name of the network, set by whoever first deploys the contract
    mapping(address => Owner) private ownerWalletToSC; //maps wallet addresses to their storage/caching contracts
    
    //Used in tracking the network and calculating reputation scores
    int private totalParticipants = 0;
    int private totalDeviceResponses = 0;
    int private totalValidatorResponses = 0;

    constructor(string memory _identifier) {
        identifier = _identifier; //network name is required to deploy
    }

    //Getters
    function getIdentifier() public view returns (string memory){
        return identifier;
    }

    function getOwnerSC(address _ownerAddress) public view returns (Owner){
        return ownerWalletToSC[_ownerAddress];
    }

    function getReputationScore(address _ownerAddress) public view returns (int){
        return getOwnerSC(_ownerAddress).getReputationScore();
    }

    //called by Request contracts to find the reputation score before activity on the current request
    function getReputationScoreExcludingRequest(address _ownerAddress, Request _request) public view returns (int){
        return getOwnerSC(_ownerAddress).getReputationScoreWithExcludedRequest(_request);
    }

    //getters for network constants, used in reputation score calculation
    function getTotalParticipants() public view returns (int){
        return totalParticipants;
    }

    function getTotalDeviceResponses() public view returns (int){
        return totalDeviceResponses;
    }

    function getTotalValidatorResponses() public view returns (int){
        return totalValidatorResponses;
    }

    function getAverageProviderScore() public view returns (int){
        if(totalParticipants == 0){
            return 0;
        }
        return (totalDeviceResponses * 100) / totalParticipants;
    }

    function getAverageValidatorScore() public view returns (int) {
        if(totalParticipants == 0){
            return 0;
        }
        return (totalValidatorResponses * 100) / totalParticipants;
    }
    function isMalicious(address _node) public view returns (bool){
        return false; //to be updated based on experiments
    }

    //creates a new owner smart contract for a wallet address if one does not already exist 
    function createOwnerSC() public {
        if(address(getOwnerSC(msg.sender)) == address(0)){
            ownerWalletToSC[msg.sender] = new Owner(this);
            totalParticipants += 1;
        }
    }

    //creates a device contract and registers the device on the network
    function createDevice(address _deviceAddress, string memory _metadata) external{
        createOwnerSC(); //its possible a storage smart contract does not yet exist for the owner 
        Device newDevice = new Device(this, _deviceAddress, _metadata); //deploys a new device contract
        emit NewDevice(address(newDevice));
    }

    //First call a requestor makes to get metadata
    function createRequest(Device _device) external {
        createOwnerSC(); //its possible a storage smart contract does not yet exist for the owner
        require(_device.getOwnerAddress() != msg.sender, "Owner cannot put in request for their own device"); 
        //require(getOwnerSC(msg.sender).getReputationScore() >= _device.getMinReputationScore(), "Requestor's reputation score is too low to access device data"); 
        //will be activated when reputation scores are fixed
        
        Request newRequest = new Request(this,_device); //deploys a new request contract
        getOwnerSC(msg.sender).incrementTotalOutgoingRequests(); //updates the reputation score calculation
        
        if(debug){
            console.log("--------------------[Smart Contract State Change]--------------------");
            console.log("Created new request");
            console.log(_device.getMetadata());
            console.log(msg.sender);
            console.log("---------------------------------------------------------------------");
        }
        emit NewRequest(address(newRequest));
    }
    //simply tracks validator responses regardless of whether they are correct(in the majority) or not
    function incrementValidatorResponses(Request _request) external {
        require(_request.getNetwork() == this, "The request must be from this network");
        require(msg.sender == address(_request), "Only a request contract can call this function");
        require(_request.checkValidatorMembership(tx.origin), "The validator is not part of the request"); //the validator originated the transaction

        totalValidatorResponses += 1;
    }

    //simply tracks device responses regardless of whether they are valid or not
    function incrementDeviceResponses(Request _request) external {
        require(_request.getNetwork() == this, "The request must be from this network");
        require(msg.sender == address(_request), "Only a request contract can call this function");
        require(tx.origin == _request.getDevice().getDeviceAddress(), "The tx has to have originated from the device");
        totalDeviceResponses += 1;
    }
}

