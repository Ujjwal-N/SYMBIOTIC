#!/bin/bash
maliciousPercentage=35
while [ "$maliciousPercentage" -le 35 ]; do
    nodes=60
    while [ "$nodes" -le 100 ]; do
        folds=1
        while [ "$folds" -le 10 ]; do
            now=$(date)
            echo $now $folds $maliciousPercentage $nodes
            npx hardhat clean
            node scripts/simulateNetwork.js $folds $maliciousPercentage $nodes
            folds=$(($folds+1))
        done
        nodes=$(($nodes+20))
    done
    maliciousPercentage=$(($maliciousPercentage+10))
done