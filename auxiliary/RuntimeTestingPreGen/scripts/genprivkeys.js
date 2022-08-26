const ethWallet = require('ethereumjs-wallet');
var finalString = "["
for (let index = 0; index < 100; index++) {
    let addressData = ethWallet['default'].generate();
    //[{ privateKey: "f14ba714b8a52c457c68b5cfa7b083084cb770ad1aa9ca127986641e91b813e1", balance: "5" }]
    finalString += `{privateKey: "${addressData.getPrivateKeyString()}", balance: "5"},`
}
finalString += "]"
console.log(finalString)