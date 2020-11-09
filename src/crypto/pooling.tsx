import _ = require('lodash');

import { getAvailableTxOuts } from './blockchain';
import { IAvailableTxOut, ITransaction, ITransactionPool, ITxIn } from './interfaces';
import { validateTx } from './transaction';

const initTransactionPool = (): ITransactionPool => {
    return { transactions: [] } as ITransactionPool;
};

const pool: ITransactionPool = initTransactionPool();

export const getPool = () => _.cloneDeep(pool);
export const addTransaction = (tx: ITransaction): boolean => {
    const availableTxOuts: IAvailableTxOut[] = getAvailableTxOuts();
    if (availableTxOuts == null) return false;

    if (!validateTx(tx, availableTxOuts) || !validatePoolTx(tx, pool)) return false;

    pool.transactions.push(tx);
    return true;
};

export const updatePool = (availableTxOuts: IAvailableTxOut[]) => {
    const txInsToRemove: ITransaction[] = [];

    pool.transactions.map((tx: ITransaction) => {
        let found: boolean = false;

        tx.txIns.map((ins: ITxIn) => {
            availableTxOuts && availableTxOuts.map((a: IAvailableTxOut) => {
                if (a.id === ins.txOutId && a.index === ins.txOutIndex) found = true;
            });
        });

        if (found) txInsToRemove.push(tx);
    });

    if (txInsToRemove.length !== 0) pool.transactions = _.without(pool.transactions, ...txInsToRemove);
};

const validatePoolTx = (tx: ITransaction, pool: ITransactionPool): boolean => {
    const poolTxIns: ITxIn[] = _(pool.transactions).map((tx: ITransaction) => tx.txIns).flatten().value();

    let isValid: boolean = true;
    tx.txIns.map((ins) => {
        _.find(poolTxIns, (pIns: ITxIn) => {
            if (ins.txOutIndex === pIns.txOutIndex && ins.txOutId === pIns.txOutId) isValid = false;
        });
    });

    return isValid;
};