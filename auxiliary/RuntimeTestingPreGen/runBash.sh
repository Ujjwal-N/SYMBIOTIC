#!/bin/bash

maxNum=10
while [ "$maxNum" -le 100 ]; do
    node scripts/bash-multiple.js $maxNum
    maxNum=$(($maxNum+10))
done