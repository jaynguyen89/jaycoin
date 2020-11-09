"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const CryptoJS = require("crypto-js");
const elliptic_1 = require("elliptic");
const constants_1 = require("./constants");
const SECP256 = new elliptic_1.ec('secp256k1');
const base2Convert = (origin) => {
    let binary = constants_1.EMPTY;
    for (let i = 0; i < origin.length; i++)
        binary += constants_1.HEX_MAP[origin[i]];
    return binary;
};
exports.getTimestamp = () => {
    return Date.now() / 1000;
};
exports.base16Convert = (bytes) => {
    return Array.from(bytes, (b) => ('0' + (b & 0xFF)
        .toString(16)).slice(-2)).join(constants_1.EMPTY);
};
exports.derivePublicKey = (secret) => {
    return SECP256.keyFromPrivate(secret, 'hex').getPublic(true, 'hex');
};
exports.deriveKeyPairPublic = (pubkey) => {
    return SECP256.keyFromPublic(pubkey, 'hex');
};
exports.deriveKeyPairPrivate = (privKey) => {
    return SECP256.keyFromPrivate(privKey, 'hex');
};
exports.isValidProofOfWork = (hash, complexity) => {
    const binary = base2Convert(hash);
    return binary.startsWith('0'.repeat(complexity));
};
exports.hashBlock = (block) => {
    return CryptoJS.SHA256(block.index + block.prevHash + block.timestamp + block.content + block.complexity + block.nonce).toString();
};
exports.generateBlockHash = (block) => {
    while (true) {
        const hash = exports.hashBlock(block);
        if (exports.isValidProofOfWork(hash, block.complexity)) {
            block.hash = hash;
            return block;
        }
        block.nonce = block.nonce++;
    }
};
exports.validateAddress = (address) => {
    return address.match('^[a-fA-F0-9]+$') !== null && address.startsWith('04'); //length=130
};
//# sourceMappingURL=utility.js.map