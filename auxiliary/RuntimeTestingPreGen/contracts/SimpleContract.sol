// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.4;

// Import this file to use console.log
import "hardhat/console.sol";

contract SimpleContract {
    uint counter = 0;

    function increment() public {
        counter += 1;
    }
}
