import _ = require('lodash');
import CryptoJS = require('crypto-js');

import { EMPTY, MINING_BASE } from '../helper/constants';
import { deriveKeyPairPublic, validateAddress } from '../helper/utility';
import { broadcastPool } from '../network/peers_network';
import { createNewBlock, getAvailableTxOuts, getLastBlock } from './blockchain';
import { IAvailableTxOut, IBlock, ITransaction, ITxIn, ITxOut } from './interfaces';
import { addTransaction, getPool } from './pooling';
import { getPublicKey, initTransaction, retrievePrivateKey } from './wallet';

export interface IProcessTxs {
    txs: ITransaction[];
    availTxOuts: IAvailableTxOut[];
    blockIndex: number;
}

export const processTxs = (params: IProcessTxs) => {
    //if (!validateBlockTxs(params)) return null;

    const newAvailTxOuts: IAvailableTxOut[] = params.txs.map((tx) => {
        return tx.txOuts.map(
            (txOut, index) => { return { id: tx.id, index, address: txOut.address, amount: txOut.amount } as IAvailableTxOut; }
        );
    }).reduce((x, y) => x.concat(y), []);

    const consumes: IAvailableTxOut[] = params.txs.map((tx) => tx.txIns).reduce((x, y) => x.concat(y), [])
        .map(
            (txIn) => { return { id: txIn.txOutId, index: txIn.txOutIndex, address: '', amount: 0 } as IAvailableTxOut; }
        );

    return params.availTxOuts.filter((a) => !searchAvailTxOut(a.id, a.index, consumes)).concat(newAvailTxOuts);
};

const validateBlockTxs = (params: IProcessTxs): boolean => {
    if (!validateMiningTx(params.txs[0], params.blockIndex)) return false;

    const txIns = _(params.txs).map((tx: ITransaction) => tx.txIns).flatten().value();
    if (redundant(txIns)) return false;

    const normalTxs = params.txs.slice(1);
    return normalTxs.map(
        (tx) => validateTx(tx, params.availTxOuts)).reduce((x, y) => (x && y), true
    );
};

const validateMiningTx = (tx: ITransaction, index: number): boolean => {
    return !(tx == null || computeTxId(tx) !== tx.id || tx.txIns[0].txOutIndex !== index ||
        tx.txOuts.length !== 1 || tx.txIns.length !== 1 || tx.txOuts[0].amount !== MINING_BASE
    );
};

export const validateTx = (tx: ITransaction, availTxOuts: IAvailableTxOut[]): boolean => {
    if (computeTxId(tx) !== tx.id) return false;

    const validTxIns: boolean = tx.txIns.map(
        (txIn) => isValidTxIn(txIn, tx, availTxOuts)).reduce((x, y) => (x && y), true
    );
    if (!validTxIns) return false;

    const txInsTotal: number = tx.txIns.map(
        (txIn) => searchAvailTxOut(txIn.txOutId, txIn.txOutIndex, availTxOuts).amount
    ).reduce((x, y) => (x + y), 0);

    const txOutsTotal: number = tx.txOuts.map((txOut) => txOut.amount).reduce((x, y) => (x + y), 0);
    return txInsTotal === txOutsTotal;
};

const searchAvailTxOut = (id: string, index: number, cons: IAvailableTxOut[]): IAvailableTxOut => {
    let availTxOut = {} as IAvailableTxOut;
    cons && cons.forEach((i) => { if (i.id === id && i.index === index) availTxOut = i; });
    return availTxOut;
};

const redundant = (txIns: ITxIn[]) => {
    const txInsMap = _.countBy(txIns, (ins: ITxIn) => ins.txOutId + ins.txOutIndex);
    return _(txInsMap).map((count, id) => count > 1).includes(true);
};

export const computeTxId = (tx: ITransaction): string => {
    const inString: string = tx.txIns.map((txIn: ITxIn) => txIn.txOutId + txIn.txOutIndex).reduce((x, y) => x + y, '');
    const outString: string = tx.txOuts.map((txOut: ITxOut) => txOut.address + txOut.amount).reduce((x, y) => x + y, '');

    return CryptoJS.SHA256(inString + outString).toString();
};

const isValidTxIn = (txIn: ITxIn, tx: ITransaction, availTxOuts: IAvailableTxOut[]): boolean => {
    const availTxOut: IAvailableTxOut = availTxOuts && availTxOuts.find(
        (i) => i.id === txIn.txOutId && i.index === txIn.txOutIndex
    ) || null;
    if (availTxOut == null) return false;

    return true; //deriveKeyPairPublic(availTxOut.address).verify(tx.id, txIn.signature);
};

export const createMiningTx = (publicKey: string, index: number): ITransaction => {
    let tx: ITransaction = {
        id: EMPTY,
        txIns: [{ txOutId: '', txOutIndex: index, signature: '' } as ITxIn],
        txOuts: [{ address: publicKey, amount: MINING_BASE } as ITxOut]
    } as ITransaction;

    tx.id = computeTxId(tx);
    return tx;
};

export const createNewBlockForTx = (endPoint: string, amount: number): IBlock | null => {
    if (!validateAddress(endPoint)) return null;

    const miningTx: ITransaction = createMiningTx(getPublicKey(), getLastBlock().index + 1);
    const tx = initTransaction(retrievePrivateKey(), getPool().transactions, getAvailableTxOuts(), amount, endPoint);
    return createNewBlock([miningTx, tx] as ITransaction[]);
};

export const processTx = (endPoint: string, amount: number): ITransaction | null => {
    const tx: ITransaction | null = initTransaction(
        retrievePrivateKey(), getPool().transactions, getAvailableTxOuts(), amount, endPoint
    );
    if (tx == null) return null;

    if (addTransaction(tx)) {
        broadcastPool();
        return tx;
    }

    return null;
};
