"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utility_1 = require("./utility");
exports.KEY_DIR = 'src/wallets';
exports.EMPTY = '';
exports.MINING_BASE = 10;
exports.MINING_ADJUST_INTERVAL = 10;
exports.COMPLEXITY_ADJUST_INTERVAL = 10;
exports.HEX_MAP = {
    '0': '0000', '1': '0001', '2': '0010', '3': '0011',
    '4': '0100', '5': '0101', '6': '0110', '7': '0111',
    '8': '1000', '9': '1001', 'a': '1010', 'b': '1011',
    'c': '1100', 'd': '1101', 'e': '1110', 'f': '1111'
};
const txIn = {
    txOutId: '',
    txOutIndex: 0,
    signature: ''
};
const txOut = {
    address: '049cdd72ada8a9f732ba49b229913ec107266e4a153b8e9969153a87a3145ce0cf79cfb7dd9ca7491224db48f9455a14b3e7bd287f7bf53b47076313cae5334aaf',
    amount: 0
};
const firstTx = {
    id: '189f40034be7a199f1fa9891668ee3ab6049f82d38c68be70f596eab2e1857b7',
    txIns: [txIn],
    txOuts: [txOut]
};
exports.firstBlock = {
    index: 0,
    hash: 'bfef4adc39f01b033fe749bb5f28f10b581fef319d34445d21a7bc63fe732fa3',
    prevHash: '',
    timestamp: utility_1.getTimestamp(),
    content: [firstTx],
    complexity: 0,
    nonce: 0
};
//# sourceMappingURL=constants.js.map