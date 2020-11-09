"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const _ = require("lodash");
const peers_network_1 = require("./peers_network");
const constants_1 = require("./constants");
const utility_1 = require("./utility");
const pooling_1 = require("./pooling");
const transaction_1 = require("./transaction");
const wallet_1 = require("./wallet");
const initBlockchain = () => {
    return { sequence: [constants_1.firstBlock] };
};
let blockchain = initBlockchain();
let availableTxOuts = transaction_1.processTxs({
    txs: blockchain.sequence[0].content,
    availTxOuts: [],
    blockIndex: 0
});
exports.getBlockchain = () => blockchain;
exports.getLastBlock = (blockchain) => blockchain.sequence[blockchain.sequence.length - 1];
exports.getAvailableTxOuts = () => _.cloneDeep(availableTxOuts);
const updateAvailableTxOuts = (availTxOuts) => availableTxOuts = availTxOuts;
const validateBlock = (block, prev) => {
    const timestampCheck = prev.timestamp - 60 < block.timestamp && block.timestamp - 60 < utility_1.getTimestamp();
    const blockCheck = utility_1.hashBlock(block) === block.hash && utility_1.isValidProofOfWork(block.hash, block.complexity);
    return prev.index + 1 === block.index && prev.hash === block.prevHash && timestampCheck && blockCheck;
};
const adjustDifficulty = (blockchain) => {
    const lastBlock = exports.getLastBlock(blockchain);
    if (lastBlock.index % constants_1.COMPLEXITY_ADJUST_INTERVAL === 0 && lastBlock.index !== 0) {
        const prevBlock = blockchain.sequence[blockchain.sequence.length - constants_1.COMPLEXITY_ADJUST_INTERVAL];
        const requiredInterval = constants_1.MINING_ADJUST_INTERVAL * constants_1.COMPLEXITY_ADJUST_INTERVAL;
        const actualInterval = lastBlock.timestamp - prevBlock.timestamp;
        return actualInterval < requiredInterval / 2 ? prevBlock.complexity + 1 : (actualInterval > requiredInterval * 2 ? prevBlock.complexity - 1 : prevBlock.complexity);
    }
    return lastBlock.complexity;
};
exports.createNewBlock = (content) => {
    const prevBlock = exports.getLastBlock(blockchain);
    let newBlock = {
        index: prevBlock.index + 1,
        hash: constants_1.EMPTY,
        prevHash: prevBlock.hash,
        timestamp: utility_1.getTimestamp(),
        content: content,
        complexity: adjustDifficulty(blockchain),
        nonce: 0
    };
    newBlock = utility_1.generateBlockHash(newBlock);
    if (uploadAndBroadcast(newBlock))
        return newBlock;
    return null;
};
const uploadAndBroadcast = (block) => {
    if (!exports.uploadBlock(block))
        return false;
    peers_network_1.broadcastLastBlock();
    return true;
};
exports.uploadBlock = (block) => {
    if (!validateBlock(block, exports.getLastBlock(blockchain)))
        return false;
    const availTxOuts = transaction_1.processTxs({
        txs: block.content,
        availTxOuts: exports.getAvailableTxOuts(),
        blockIndex: block.index
    });
    if (availTxOuts === null)
        return false;
    blockchain.sequence.push(block);
    updateAvailableTxOuts(availTxOuts);
    pooling_1.updatePool(availTxOuts);
    return true;
};
exports.replaceBlockchain = (newChain) => {
    const availTxOuts = pickupAvailTxOuts(newChain);
    if (availTxOuts !== null && totalComplexity(newChain) > totalComplexity(exports.getBlockchain().sequence)) {
        blockchain.sequence = newChain;
        updateAvailableTxOuts(availTxOuts);
        pooling_1.updatePool(availableTxOuts);
        peers_network_1.broadcastLastBlock();
    }
};
const pickupAvailTxOuts = (chain) => {
    if (JSON.stringify(chain[0]) !== JSON.stringify(constants_1.firstBlock))
        return null;
    let availTxOuts = [];
    let invalid = false;
    chain.map((block, i) => {
        if (i !== 0 && !validateBlock(block, chain[i - 1])) {
            availTxOuts = null;
            invalid = true;
        }
        if (!invalid)
            availTxOuts = transaction_1.processTxs({ txs: block.content, availTxOuts, blockIndex: block.index });
    });
    return availTxOuts;
};
const totalComplexity = (chain) => chain.map((block) => block.complexity)
    .map((complexity) => Math.pow(2, complexity))
    .reduce((x, y) => x + y);
exports.getWalletAvailableTxOuts = () => {
    const publicKey = wallet_1.getPublicKey();
    const availTxOuts = exports.getAvailableTxOuts();
    if (availTxOuts == null)
        return null;
    return _.filter(availTxOuts, (a) => a.address === publicKey);
};
exports.createNextBlock = () => {
    const miningTx = transaction_1.createMiningTx(wallet_1.getPublicKey(), exports.getLastBlock(exports.getBlockchain()).index + 1);
    const txData = [miningTx].concat(pooling_1.getPool().transactions);
    return exports.createNewBlock(txData);
};
//# sourceMappingURL=blockchain.js.map