"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const _ = require("lodash");
const blockchain_1 = require("./blockchain");
const transaction_1 = require("./transaction");
const initTransactionPool = () => {
    return { transactions: [] };
};
let pool = initTransactionPool();
exports.getPool = () => _.cloneDeep(pool);
exports.addTransaction = (tx) => {
    const availableTxOuts = blockchain_1.getAvailableTxOuts();
    if (availableTxOuts == null)
        return false;
    if (!transaction_1.validateTx(tx, availableTxOuts) || !validatePoolTx(tx, pool))
        return false;
    pool.transactions.push(tx);
    return true;
};
exports.updatePool = (availableTxOuts) => {
    let txInsToRemove = [];
    pool.transactions.map((tx) => {
        let found = false;
        tx.txIns.map((ins) => {
            availableTxOuts && availableTxOuts.map((a) => {
                if (a.id === ins.txOutId && a.index === ins.txOutIndex)
                    found = true;
            });
        });
        if (found)
            txInsToRemove.push(tx);
    });
    if (txInsToRemove.length != 0)
        pool.transactions = _.without(pool.transactions, ...txInsToRemove);
};
const validatePoolTx = (tx, pool) => {
    const poolTxIns = _(pool.transactions).map((tx) => tx.txIns).flatten().value();
    let isValid = true;
    tx.txIns.map((ins) => {
        _.find(poolTxIns, (pIns) => {
            if (ins.txOutIndex === pIns.txOutIndex && ins.txOutId === pIns.txOutId)
                isValid = false;
        });
    });
    return isValid;
};
//# sourceMappingURL=pooling.js.map