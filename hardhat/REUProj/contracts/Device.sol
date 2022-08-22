//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "./Network.sol";
import "./Request.sol";

contract Device{

    bool private constant debug = false;

    //Storage
    Network private network;
    address payable ownerAddress; //address of device owner (person who initiated transaction to create this contract)
    address private deviceAddress; //address of the device, the account responsible for posting the key
    string private metadata;

    //Request Management
    int private minReputationScore = 0; //the minimum reputation score required to access the data
    constructor(Network _network, address _deviceAddress, string memory _metadata) {
        network = _network;
        ownerAddress = payable(tx.origin); //set to payable to please the solidity compiler, gas is refunded to this address if this contract is destroyed(if removeDevice is called)
        deviceAddress = _deviceAddress; //should be provided by the owner in the constructor
        metadata = _metadata;
    }

    modifier onlyOwner {
        require(tx.origin == ownerAddress, "Only the device owner can call this function");
        _;
    }

    //Getters
    function getNetwork() public view returns (Network){
        return network;
    }

    function getDeviceAddress() public view returns (address){
        return deviceAddress;
    }

    function getMetadata() public view returns  (string memory){
        return metadata;
    }

    function getOwnerAddress() public view returns (address){
        return ownerAddress;
    }

    function getMinReputationScore() public view returns (int){
        return minReputationScore;
    }

    //Setters
    function setMinReputationScore(int _minReputationScore) external onlyOwner{
        minReputationScore = _minReputationScore;
        if(debug){
            console.log("--------------------[Smart Contract State Change]--------------------");
            console.log("Minimum reputation score changed");
            console.log("---------------------------------------------------------------------");
        }
    }

    function destroy() public onlyOwner{
        selfdestruct(ownerAddress);
    }


}
