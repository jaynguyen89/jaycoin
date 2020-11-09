"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const _ = require("lodash");
const CryptoJS = require("crypto-js");
const elliptic_1 = require("elliptic");
const peers_network_1 = require("./peers_network");
const constants_1 = require("./constants");
const utility_1 = require("./utility");
const blockchain_1 = require("./blockchain");
const pooling_1 = require("./pooling");
const wallet_1 = require("./wallet");
exports.processTxs = (params) => {
    if (!validateBlockTxs(params))
        return null;
    const newAvailTxOuts = params.txs.map((tx) => {
        return tx.txOuts.map((txOut, index) => { return { id: tx.id, index, address: txOut.address, amount: txOut.amount }; });
    }).reduce((x, y) => x.concat(y), []);
    const consumes = params.txs.map((tx) => tx.txIns).reduce((x, y) => x.concat(y), [])
        .map((txIn) => { return { id: txIn.txOutId, index: txIn.txOutIndex, address: '', amount: 0 }; });
    return params.availTxOuts.filter((a) => !searchAvailTxOut(a.id, a.index, consumes)).concat(newAvailTxOuts);
};
const validateBlockTxs = (params) => {
    if (!validateMiningTx(params.txs[0], params.blockIndex))
        return false;
    const txIns = _(params.txs).map((tx) => tx.txIns).flatten().value();
    if (redundant(txIns))
        return false;
    const normalTxs = params.txs.slice(1);
    return normalTxs.map((tx) => exports.validateTx(tx, params.availTxOuts)).reduce((x, y) => (x && y), true);
};
const validateMiningTx = (tx, index) => {
    return !(tx == null || exports.computeTxId(tx) !== tx.id || tx.txIns[0].txOutIndex !== index ||
        tx.txOuts.length !== 1 || tx.txIns.length !== 1 || tx.txOuts[0].amount !== constants_1.MINING_BASE);
};
exports.validateTx = (tx, availTxOuts) => {
    if (exports.computeTxId(tx) !== tx.id)
        return false;
    const validTxIns = tx.txIns.map((txIn) => isValidTxIn(txIn, tx, availTxOuts)).reduce((x, y) => (x && y), true);
    if (!validTxIns)
        return false;
    const txInsTotal = tx.txIns.map((txIn) => searchAvailTxOut(txIn.txOutId, txIn.txOutIndex, availTxOuts).amount).reduce((x, y) => (x + y), 0);
    const txOutsTotal = tx.txOuts.map((txOut) => txOut.amount).reduce((x, y) => (x + y), 0);
    return txInsTotal === txOutsTotal;
};
const searchAvailTxOut = (id, index, cons) => {
    let availTxOut = {};
    cons && cons.forEach((i) => { if (i.id === id && i.index === index)
        availTxOut = i; });
    return availTxOut;
};
const redundant = (txIns) => {
    const txInsMap = _.countBy(txIns, (ins) => ins.txOutId + ins.txOutIndex);
    return _(txInsMap).map((count, id) => count > 1).includes(true);
};
exports.computeTxId = (tx) => {
    const inString = tx.txIns.map((txIn) => txIn.txOutId + txIn.txOutIndex).reduce((x, y) => x + y, '');
    const outString = tx.txOuts.map((txOut) => txOut.address + txOut.amount).reduce((x, y) => x + y, '');
    return CryptoJS.SHA256(inString + outString).toString();
};
const isValidTxIn = (txIn, tx, availTxOuts) => {
    const availTxOut = availTxOuts && availTxOuts.find((i) => i.id === txIn.txOutId && i.index === txIn.txOutIndex) || null;
    if (availTxOut == null)
        return false;
    return utility_1.deriveKeyPairPublic(availTxOut.address).verify(tx.id, new elliptic_1.ec.Signature(txIn.signature));
};
exports.createMiningTx = (publicKey, index) => {
    let tx = {
        id: constants_1.EMPTY,
        txIns: [{ txOutId: '', txOutIndex: index, signature: '' }],
        txOuts: [{ address: publicKey, amount: constants_1.MINING_BASE }]
    };
    tx.id = exports.computeTxId(tx);
    return tx;
};
exports.createNewBlockForTx = (endPoint, amount) => {
    if (!utility_1.validateAddress(endPoint))
        return null;
    const miningTx = exports.createMiningTx(wallet_1.getPublicKey(), blockchain_1.getLastBlock(blockchain_1.getBlockchain()).index + 1);
    const tx = wallet_1.initTransaction(wallet_1.generatePrivateKey(), pooling_1.getPool().transactions, blockchain_1.getAvailableTxOuts(), amount, endPoint);
    return blockchain_1.createNewBlock([miningTx, tx]);
};
exports.processTx = (endPoint, amount) => {
    const tx = wallet_1.initTransaction(wallet_1.generatePrivateKey(), pooling_1.getPool().transactions, blockchain_1.getAvailableTxOuts(), amount, endPoint);
    if (tx == null)
        return null;
    if (pooling_1.addTransaction(tx)) {
        peers_network_1.broadcastPool();
        return tx;
    }
    return null;
};
//# sourceMappingURL=transaction.js.map