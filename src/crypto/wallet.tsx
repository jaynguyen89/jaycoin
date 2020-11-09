import _ = require('lodash');

import { ec } from 'elliptic';
import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'fs';
import { EMPTY, KEY_DIR } from '../helper/constants';
import { base16Convert, deriveKeyPairPrivate, derivePublicKey } from '../helper/utility';
import { getAvailableTxOuts } from './blockchain';
import { IAvailableTxOut, ITransaction, ITxIn, ITxOut } from './interfaces';
import { computeTxId } from './transaction';

const SECP256 = new ec('secp256k1');

export const getPublicKey = (): string => {
    const privateKey = readFileSync(KEY_DIR + 'private.dat', 'utf8').toString();
    return derivePublicKey(privateKey);
};

export const retrievePrivateKey = (): string => {
    return readFileSync(KEY_DIR + 'private.dat', 'utf8').toString();
};

export const createWallet = () => {
    if (existsSync(KEY_DIR + 'private.dat')) return;

    const keyPair = SECP256.genKeyPair();
    const privateKey =  keyPair.getPrivate('hex').toString();

    writeFileSync(KEY_DIR + 'private.dat', privateKey);
};

export const voidWallet = () => {
    if (existsSync(KEY_DIR + 'private.dat'))
        unlinkSync(KEY_DIR + 'private.dat');
};

export const balance = (): number => {
    const address: string = getPublicKey();
    const availableTxOuts: IAvailableTxOut[] = getAvailableTxOuts(); //getWalletAvailableTxOuts();

    return _(_.filter(availableTxOuts,
        (a: IAvailableTxOut) => a.address === address)
    ).map((a) => a.amount).sum();
};

export const initTransaction = (
    privateKey: string, txs: ITransaction[], availableTxOuts: IAvailableTxOut[], amount: number, endPoint: string
): ITransaction | null => {
    const senderAddress: string = derivePublicKey(privateKey);
    const senderAvailTxOutsByAddress = availableTxOuts && availableTxOuts.filter((a) => a.address === senderAddress);

    const txIns: ITxIn[] = _(txs).map((tx: ITransaction) => tx.txIns).flatten().value();
    const consumes: IAvailableTxOut[] = [];

    senderAvailTxOutsByAddress && senderAvailTxOutsByAddress.forEach((a: IAvailableTxOut) => {
        const txIn = _.find(txIns, (ins: ITxIn) => ins.txOutIndex === a.index && ins.txOutId === a.id);
        if (txIn) consumes.push(a);
    });

    const senderAvailTxOuts = _.without(availableTxOuts, ...consumes);
    let leftover: number = 0;

    let balance: number = 0;
    senderAvailTxOuts.forEach((a: IAvailableTxOut) => balance += a.amount);
    if (balance >= amount) leftover = balance - amount;
    else return null;

    const txInsToPay = senderAvailTxOuts.map(
        (a: IAvailableTxOut) => { return { txOutId: a.id, txOutIndex: a.index } as ITxIn }
    );

    let txOutsToPay: ITxOut[] = [];
    if (leftover === 0) txOutsToPay.push({ address: endPoint, amount } as ITxOut);
    else txOutsToPay = [
        { address: endPoint, amount } as ITxOut,
        { address: senderAddress, amount: leftover } as ITxOut
    ];

    const transaction: ITransaction = {
        id: EMPTY,
        txIns: txInsToPay,
        txOuts: txOutsToPay
    };

    transaction.id = computeTxId(transaction);
    transaction.txIns = transaction.txIns.map((ins: ITxIn, i: number) => {
        const signature: string | null = generateTxInSignature(privateKey, transaction, availableTxOuts, i);
        ins.signature = signature || EMPTY;
        return ins;
    });

    return transaction;
};

const generateTxInSignature = (
    privateKey: string, tx: ITransaction, availableTxOuts: IAvailableTxOut[], index: number
): string | null => {
    const txIn: ITxIn = tx.txIns[index];
    const availTxOut: IAvailableTxOut = availableTxOuts && availableTxOuts.find(
        (a) => a.id === txIn.txOutId && a.index === txIn.txOutIndex
    );

    if (availTxOut && derivePublicKey(privateKey) === availTxOut.address) {
        const key = deriveKeyPairPrivate(privateKey);
        return base16Convert(key.sign(tx.id).toDER());
    }

    return null;
};