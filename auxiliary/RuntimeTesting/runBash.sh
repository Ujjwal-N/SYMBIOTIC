#!/bin/bash

maxNum=10
while [ "$maxNum" -le 100 ]; do
    node scripts/await-bash.js $maxNum
    maxNum=$(($maxNum+10))
done

maxNum=10
while [ "$maxNum" -le 100 ]; do
    node scripts/then-bash.js $maxNum
    maxNum=$(($maxNum+10))
done