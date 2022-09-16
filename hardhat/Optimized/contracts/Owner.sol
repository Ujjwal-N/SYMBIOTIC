//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "./Device.sol";
import "./Request.sol";
import "./Network.sol";

contract Owner {

    bool private constant debug = false;

    //Important storage variables
    address private walletAddr;
    Network private network;

    //Prevent duplicate counting in reputation calculation
    mapping(address => int8) private requestsFulfilled; //tracks the state of the owner's participation in a request where they act as the data provider
    mapping(address => int8) private requestsValidated; //tracks the state of the owner's participation in a request where they act as the data validator

    /**
        Int8 is used because it is the smallest int possible. There are 3 possible states:
        -1: Provider / Validator is acting maliciously as determined by the majority opinion of all validators
        0: Provider / Validator has not responded or their response is inconclusive 
        1: Provider / Validator is acting faithfully as determined by the majority opinion of all validators
     */

    /**
        These states can change once more validators submit their response. Every time a validator submits a response, the majority opinion of the request can change.
        When the majority opinion of a request changes, the data provider's reputation score and each validator's reputation score also changes:
        totalRequestsFulfilled -= 1 if majorityOpinion is that the data is invalid, requestFulfilled += 1 if majority opinion is that the data is valid
        totalRequestsValidated -= 1 if majorityOpinion is different from this validator's opinion, totalRequestsValidated += 1 if majorityOpinion is the same as this validator's opinion
     */
   

    //Cached for O(1) reputation calculation
    int totalRequestsFulfilled = 0; //Data Provider Score
    int totalOutgoingRequests = 0; //Leech Score
    int totalRequestsValidated = 0; //Data Validator Score

    modifier onlyOwner {
        require(tx.origin == walletAddr, "Only the owner can originate a call to this function");
        _;
    }
    
    constructor(Network _network) {
        walletAddr = tx.origin;
        network = _network;
    }

    //Getters
    function getWalletAddr() public view returns (address){
        return walletAddr;
    }

    //Reputation calculation getters
    function getRequestFulfilledState(Request _request) public view returns(int8){
        return requestsFulfilled[address(_request)];
    }

    function getRequestValidatedState(Request _request) public view returns(int8){
        return requestsValidated[address(_request)];
    }

    function getTotalRequestsFulfilled() public view returns(int) {
        return totalRequestsFulfilled;
    }

    function getTotalOutgoingRequests() public view returns (int) {
        return totalOutgoingRequests;
    }

    function getTotalRequestsValidated() public view returns (int){
        return totalRequestsValidated;
    }

    //helper function for both getReputationScore() and getReputationScoreWithExcludedRequest()
    function combineConstants(int _totalRequestsFulfilled, int _totalOutgoingRequests, int _totalRequestsValidated) private view returns (int){

        int avgProviderScore = network.getAverageProviderScore();
        int avgValidatorScore = network.getAverageValidatorScore();

        if(avgProviderScore == 0 || avgValidatorScore == 0){ 
            //the network does not have enough usage to determine an accurate reputation score, so the baseline 100 is returned
            //also prevents division by 0 errors
            return 100;
        }
        
        int dataProviderScore = (_totalRequestsFulfilled * 100 * 33) / avgProviderScore; //the 100 is because avgProviderScore is scaled by 100 in Network.sol

        int leechScore = 100; //by default, assume that the leech score is maximized
        int totalRequests = _totalRequestsFulfilled + _totalOutgoingRequests;

        if(totalRequests != 0){ //prevents division by 0 errors
            leechScore = (_totalRequestsFulfilled * 4 * 33) / (totalRequests);
            //totalRequestsFulfilled is mulitplied by 4 because the acceptable outgoingRequests to requestsFulfilled ratio is set to 3:1. Fulfilling one request grants an owner access to 3.
            //The above ratio is not set in stone, but if there are more than 3 requests made for every one fulfilled, then this portion of the reputation score will fall 
        }else if(totalRequestsFulfilled < 0){
            leechScore = 0; //corner case where -_totalRequestsFulfilled = _totalOutgoingRequests
        }
        
        int dataValidatorScore = (_totalRequestsValidated * 100 * 33) / avgValidatorScore;
        //all averages in Network.sol are scaled by 100

        return dataProviderScore + leechScore + 2 * dataValidatorScore; //each component was multiplied by 33 to scale the total score to 100
    }

    function getReputationScore() public view returns (int){
        //the current constants can be plugged into combineConstants directly
        return combineConstants(totalRequestsFulfilled, totalOutgoingRequests, totalRequestsValidated);
    }

    //Does the reputation calculation assuming a certaon request does not exist 
    function getReputationScoreWithExcludedRequest(Request _request) public view returns (int){

        //this if block figures out which part of the request the Owner participated in and undoes the change
        if(_request.getRequestor() == walletAddr){
            //totalOutgoingRequests -= 1;
            return combineConstants(totalRequestsFulfilled, totalOutgoingRequests - 1, totalRequestsValidated);
        }else if (_request.getDevice().getOwnerAddress() == walletAddr){
            //totalRequestsFulfilled -= getRequestFulfilledState(_request);
            return combineConstants(totalRequestsFulfilled - getRequestFulfilledState(_request), totalOutgoingRequests, totalRequestsValidated);
        }else if(_request.checkValidatorMembership(walletAddr)){
            //totalRequestsValidated -= getRequestValidatedState(_request);
            return combineConstants(totalRequestsFulfilled, totalOutgoingRequests, totalRequestsValidated - getRequestValidatedState(_request));
        }
        
        return getReputationScore(); //owner did not participate in the request at all

    }

    //Setters

    //Functions for reputation calculation
    function setRequestFulfilledState(Request _request, int8 fulfilled) internal{
        requestsFulfilled[address(_request)] = fulfilled;
    }

    function setRequestValidatedState(Request _request, int8 value) internal {
        requestsValidated[address(_request)] = value;
    }

    function incrementTotalOutgoingRequests() external onlyOwner{
        require(msg.sender == address(network), "The request must be from this network");
        //lenient security here because only the owner can originate a call to this function, and incrementing this will lower reputation score
        totalOutgoingRequests += 1;
    }

    modifier checkCallers(Request _request) {
        require(_request.getNetwork() == network, "Wrong network");
        require(msg.sender == address(_request), "This function can only be called by a Request contract");
        _;
        //high security here because anyone can call the two functions below with a fake request to artificially change their reputation score
    }

    //called by Request.sol when the provider posts a key or when a validator posts a response to the data provided
    function updateDataRequestsFulfilled(Request _request) external checkCallers(_request){
        require(_request.getDevice().getOwnerAddress() == walletAddr, "Device does not belong to owner");
        require(_request.checkValidatorMembership(tx.origin) || _request.getDevice().getDeviceAddress() == tx.origin, "Transaction must originate from a validator or the device wallet address");

        bool validData = _request.getMajorityOpinion() >= 0; //as long as the majority opinion of all validators is not negative, the data can be considered valid
        int8 state = getRequestFulfilledState(_request); 

        if(validData && state != 1){ //if the data was valid but the state is not 1(valid)
            totalRequestsFulfilled += -state + 1; //undo the previous state of the request and add 1
            setRequestFulfilledState(_request, 1); //update the state to reflect the changes
        }

        if(!validData && state != -1){ //if the data was invalid but the state is not -1(invalid)
            totalRequestsFulfilled -= state + 1; //undo the previous state of the request and subtract 2
            setRequestFulfilledState(_request, -1); //update the state to reflect the changes
        }

    }

    //called by Request.sol when a validator posts a response to the data provided
    function updateRequestsValidated(Request _request) external checkCallers(_request){
        require(_request.checkValidatorMembership(tx.origin), "Originating address is not part of request's validators");
        if(_request.getRating(walletAddr) == 0){
            return;
        }

        bool inMajority = _request.getRating(walletAddr) == _request.getMajorityOpinion(); //check if the Owner voted for or against the majority
        int8 state = getRequestValidatedState(_request);
        
        if(inMajority && state != 1){ //if the owner voted with majority but the state is not 1(valid)
            totalRequestsValidated += -state + 1; //undo the previous state of the request and add 1
            setRequestValidatedState(_request, 1); //update the state to reflect the changes
        }
        if(!inMajority && state != -1){ //if the owner was in the minority but the state is not -1(invalid)
            totalRequestsValidated -= state + 1; //undo the previous state of the request and subtract 2
            setRequestValidatedState(_request, -1); //update the state to reflect the changes
        }
    }
}