//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "./Network.sol";
import "./Device.sol";

contract Request{

    event NewValidator(address indexed validatorAddress, address indexed deviceAddress, address indexed ownerAddress);
    event NewValidatorKeyPosted(address indexed validatorAddress, bytes32 accessKey, address indexed deviceAddress, address indexed ownerAddress);
    event RequestValidated(bool validity, bool complete, address indexed deviceAddress, address indexed ownerAddress);

    bool private constant debug = false;
    bytes32 private constant empty = 0; //bytes32 is the most fitting datatype for a data access key, this variable is simply used to check if a key is empty
    uint private constant numValidatorsAllowed = 5; //calculated based on a hypergeometric distribution. see paper for full reasoning

    struct ValidatorInfo{
        address validator; //set when a validator volunteers themselves
        bytes32 dataKey; //provided by the device so the validator can view the data and psot a rating
        int8 rating; //set when the validator view's a device's data and provides a rating
    }

    //Storage
    Network private network;
    Device private device;
    address private requestor;
    bytes32 private requestorDataKey;
    uint numValidatorsSignedUp = 0;
    uint numValidatorsResponded = 0;

    ValidatorInfo[numValidatorsAllowed] private ratings;

    constructor(Network _network, Device _device) {
        network = _network;
        device = _device;
        requestor = tx.origin;
    }

    //Getters
    function getNetwork() public view returns (Network){
        return network;
    }

    function getDevice() public view returns (Device){
        return device;
    }

    function getRequestor() public view returns (address){
        return requestor;
    }

    function getValidators() public view returns (address[] memory){
        address[] memory retVar = new address[](numValidatorsSignedUp);
        for(uint i = 0; i < numValidatorsSignedUp; i++){
            retVar[i] = ratings[i].validator;
        }
        return retVar;
    }

    function getValidatorIndex(address _validator) public view returns (uint){
        uint structIndex = numValidatorsAllowed;
        for(uint i = 0; i < numValidatorsSignedUp; i++){
            if(ratings[i].validator == _validator){
                structIndex = i;
                break;
            }
        }
        return structIndex;
    }

    //checks if an address is acting as a validator on this request
    function checkValidatorMembership(address _validator) public view returns (bool){
        return getValidatorIndex(_validator) != numValidatorsAllowed;
    }

    function validatorHasKey(address _validator) public view returns (bool){
        uint index = getValidatorIndex(_validator);
        return ratings[index].dataKey != empty;
    }

    function getValidated() public view returns (bool){
        return numValidatorsResponded == numValidatorsAllowed;
    }

    function complete() public view returns(bool){
        return requestorDataKey != empty;
    }

    //deconstructs the structs and only returns their int8 ratings
    function getRatings() public view returns (int8[] memory){
        int8[] memory retVar = new int8[](numValidatorsSignedUp);
        for(uint i = 0; i < numValidatorsSignedUp; i++){
            retVar[i] = ratings[i].rating;
        }
        return retVar;
    }

    function getRating(address _validator) public view returns (int8){
        uint index = getValidatorIndex(_validator);
        require(index != numValidatorsAllowed, "The address is not part of the request");
        return ratings[index].rating;
    }

    //returns the dataKey depending on the person who sent the transaction
    function getDataKey() public view returns (bytes32){
        if(msg.sender == requestor){
            return requestorDataKey;
        }
        uint index = getValidatorIndex(msg.sender);
        require(index != numValidatorsAllowed, "The address is not part of the request");
        return ratings[index].dataKey;
    }

    //Calculates whether the data provided was valid or invalid based on the responses of the validators
    function getMajorityOpinion() public view returns (int8){

        int repSum = 0;
        address[] memory validators = getValidators();
        for(uint i = 0; i < validators.length; i++){
            repSum += ratings[i].rating * network.getReputationScoreExcludingRequest(validators[i],this);
            //repSum += ratings[i].rating;
            /**
             A reputation score is multiplied by 1(if they said data was valid) or -1(if they said the data was invalid)
             The above value is then summed for all validators 
             */
            /**
             There isn't enough information to make an accurate reputation score change on the current request because it is possible everyone has not voted yet.
             Therefore the reputation score is recalculated without the current request with the function getReputationScoreExcludingRequest.

             The edge case that inspired this change:             
             It is possible that a validator votes first with an opinion that will eventually be in the minority. 
             Since there is only 1 vote, the opinion is initially considered as a majority opinion, raising their reputation score and lowering the reputation scores of the other validators. 
             When the other validators vote, their vote counts for less because their reputation score is has been lowered before there was enough information to make that decision. 
             Therefore, this function only looks at the reputation score of a validator before the current request.
             */ 
        }

        //Repsum is normalized to either -1(invalid), 0(inconclusive) or 1(valid)
        if(repSum > 0){
            return 1;
        }else if(repSum < 0){
            return -1;
        }
        return 0;

    }


    function checkValidatorEligibility(address _potentialValidator) public view returns (bool){
        bool isAThirdParty = (_potentialValidator != requestor) && (_potentialValidator != device.getOwnerAddress()); //"Requestor or provider cannot be validator"
        return isAThirdParty && (numValidatorsSignedUp < numValidatorsAllowed) && !checkValidatorMembership(_potentialValidator);
    }
    //Setters

    //Called by any EOA volunteering as a validator
    //This implementation is slightly inaccurate as there is no randomness to this process. 
    //In a full implementation, there needs to be randomness added to prevent collusion.
    function volunteerAsValidator() external {
        require(!complete(), "Request has been completed");
        require(checkValidatorEligibility(msg.sender), "Validator is not eligible");
        require(!network.isMalicious(msg.sender), "The validator is assumed to be malicious"); //Network considers reputation scores of below 0 to be malicious

        ratings[numValidatorsSignedUp] = ValidatorInfo(msg.sender, empty,0);
        numValidatorsSignedUp += 1;
        emit NewValidator(msg.sender, device.getDeviceAddress(), device.getOwnerAddress());
        if(debug){
            console.log("--------------------[Smart Contract State Change]--------------------");
            console.log("Validator added to request");
            console.log("---------------------------------------------------------------------");
        }
    }

    //alled by device account's address to post the access key to the data for the validator
    function postValidatorDataKey(address _validator, bytes32 _dataKey) external {
        require(msg.sender == device.getDeviceAddress(), "Only the external account associated with the device can post the access key to the device's data");
        require(checkValidatorMembership(_validator), "The validator is not part of the request");
        uint index = getValidatorIndex(_validator);
        require(ratings[index].dataKey == empty, "The validator has already been given a data key");
        ratings[index].dataKey = _dataKey;
        emit NewValidatorKeyPosted(_validator, _dataKey, device.getDeviceAddress(), device.getOwnerAddress());
        if(debug){
            console.log("--------------------[Smart Contract State Change]--------------------");
            console.log("Device successfully posted validator's key");
            console.log("---------------------------------------------------------------------");
        }
    }


    //Called by device account's address to post the access key to the data for the requestor
    function postRequestorDataKey(bytes32 _dataKey) external{
        require(msg.sender == device.getDeviceAddress(), "Only the external account associated with the device can post the access key to the device's data");
        require(requestorDataKey == empty, "The requestor has already been given a data key");
        require(getValidated(), "At least 3 validators must respond before a key can be posted");
        require(getMajorityOpinion() >= 0, "The data was deemed to be invalid");
        requestorDataKey = _dataKey;

        network.incrementDeviceResponses(this); 
        network.getOwnerSC(device.getOwnerAddress()).updateDataRequestsFulfilled(this); //used for owner's reputation score calculation

        if(debug){
            console.log("--------------------[Smart Contract State Change]--------------------");
            console.log("Device successfully posted requestor's key");
            console.log("---------------------------------------------------------------------");
        }

    }

    //Called by a validator to provide a rating to the data recieved 
    function postRating(bool _validData) external {
        require(!complete(), "The request has been completed");
        require(checkValidatorMembership(msg.sender), "The validator is not part of the request");
        //Finding the associated rating with this device
        uint index = getValidatorIndex(msg.sender);
        require(ratings[index].dataKey != empty, "The device has not yet responded with the validator's key");
        require(ratings[index].rating == 0, "The validator has already responded");
        
        if(_validData){
            ratings[index].rating = 1;
        }else{
            ratings[index].rating = -1;
        }

        network.incrementValidatorResponses(this);
        numValidatorsResponded += 1;
        /**
            One vote could potentially affect the reputation scores of the provider and all validators since the majority could change
            This block of code calls their reputation caching contracts just to be safe
         */
        network.getOwnerSC(device.getOwnerAddress()).updateDataRequestsFulfilled(this); //used for owner's reputation score calculation        
        address[] memory validators = getValidators();
        for(uint i = 0; i < validators.length; i++){
            network.getOwnerSC(validators[i]).updateRequestsValidated(this);
        }

        emit RequestValidated(getMajorityOpinion() != -1, numValidatorsResponded == numValidatorsAllowed, device.getDeviceAddress(), device.getOwnerAddress());
        
        if(debug){
            console.log("--------------------[Smart Contract State Change]--------------------");
            console.log("Validator successfully posted rating");
            console.log("---------------------------------------------------------------------");
        }
    }

}