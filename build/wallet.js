"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const _ = require("lodash");
const fs_1 = require("fs");
const constants_1 = require("./constants");
const utility_1 = require("./utility");
const elliptic_1 = require("elliptic");
const blockchain_1 = require("./blockchain");
const transaction_1 = require("./transaction");
const SECP256 = new elliptic_1.ec('secp256k1');
exports.getPublicKey = () => {
    const privateKey = fs_1.readFileSync(constants_1.KEY_DIR + 'private.dat', 'utf8').toString();
    return utility_1.derivePublicKey(privateKey);
};
exports.generatePrivateKey = () => {
    const keyPair = SECP256.genKeyPair();
    return keyPair.getPrivate('hex').toString();
};
exports.createWallet = () => {
    if (fs_1.existsSync(constants_1.KEY_DIR + 'private.dat'))
        return;
    const keyPair = SECP256.genKeyPair();
    const privateKey = keyPair.getPrivate('hex').toString();
    fs_1.writeFileSync(constants_1.KEY_DIR + 'private.dat', privateKey);
};
exports.voidWallet = () => {
    if (fs_1.existsSync(constants_1.KEY_DIR + 'private.dat'))
        fs_1.unlinkSync(constants_1.KEY_DIR + 'private.dat');
};
exports.balance = () => {
    const address = exports.getPublicKey();
    const availableTxOuts = blockchain_1.getAvailableTxOuts(); //getWalletAvailableTxOuts();
    return _(_.filter(availableTxOuts, (a) => a.address === address)).map((a) => a.amount).sum();
};
exports.initTransaction = (privateKey, txs, availableTxOuts, amount, endPoint) => {
    const senderAddress = utility_1.derivePublicKey(privateKey);
    const senderAvailTxOutsByAddress = availableTxOuts && availableTxOuts.filter((a) => a.address === senderAddress);
    const txIns = _(txs).map((tx) => tx.txIns).flatten().value();
    const consumes = [];
    senderAvailTxOutsByAddress && senderAvailTxOutsByAddress.forEach((a) => {
        const txIn = _.find(txIns, (ins) => ins.txOutIndex === a.index && ins.txOutId == a.id);
        if (txIn)
            consumes.push(a);
    });
    const senderAvailTxOuts = _.without(availableTxOuts, ...consumes);
    let leftover = 0;
    let balance = 0;
    senderAvailTxOuts.forEach((a) => balance += a.amount);
    if (balance >= amount)
        leftover = balance - amount;
    else
        return null;
    const txInsToPay = senderAvailTxOuts.map((a) => { return { txOutId: a.id, txOutIndex: a.index }; });
    let txOutsToPay = [];
    if (leftover === 0)
        txOutsToPay.push({ address: endPoint, amount });
    else
        txOutsToPay = [
            { address: endPoint, amount },
            { address: senderAddress, amount: leftover }
        ];
    let transaction = {
        id: constants_1.EMPTY,
        txIns: txInsToPay,
        txOuts: txOutsToPay
    };
    transaction.id = transaction_1.computeTxId(transaction);
    transaction.txIns = transaction.txIns.map((ins, i) => {
        const signature = generateTxInSignature(privateKey, transaction, availableTxOuts, i);
        ins.signature = signature || constants_1.EMPTY;
        return ins;
    });
    return transaction;
};
const generateTxInSignature = (privateKey, tx, availableTxOuts, index) => {
    const txIn = tx.txIns[index];
    const availTxOut = availableTxOuts && availableTxOuts.find((a) => a.id === txIn.txOutId && a.index === txIn.txOutIndex);
    if (availTxOut && utility_1.derivePublicKey(privateKey) === availTxOut.address) {
        const key = utility_1.deriveKeyPairPrivate(privateKey);
        return utility_1.base16Convert(key.sign(tx.id).toDER());
    }
    return null;
};
//# sourceMappingURL=wallet.js.map