import CryptoJS = require('crypto-js');

import { ec } from 'elliptic';
import { IBlock } from '../crypto/interfaces';
import { EMPTY, HEX_MAP } from './constants';

const SECP256 = new ec('secp256k1');

const base2Convert = (origin: string): string => {
    let binary = EMPTY;
    for (let i: number = 0; i < origin.length; i++)
        binary += HEX_MAP[origin[i]];

    return binary;
};

export const getTimestamp = () => {
    return Date.now() / 1000;
};

export const base16Convert = (bytes: any) => {
    return Array.from(bytes, (b: any) => ('0' + (b & 0xFF)
        .toString(16)).slice(-2)).join(EMPTY);
};

export const derivePublicKey = (secret: string) => {
    return SECP256.keyFromPrivate(secret, 'hex').getPublic(true, 'hex');
};

export const deriveKeyPairPublic = (pubkey: string): ec.KeyPair => {
    return SECP256.keyFromPublic(pubkey, 'hex');
};

export const deriveKeyPairPrivate = (privKey: string): ec.KeyPair => {
    return SECP256.keyFromPrivate(privKey, 'hex');
};

export const isValidProofOfWork = (hash: string, complexity: number): boolean => {
    const binary: string = base2Convert(hash);
    return binary.startsWith('0'.repeat(complexity));
};

export const hashBlock = (block: IBlock): string => {
    return CryptoJS.SHA256(
        block.index + block.prevHash + block.timestamp + block.content + block.complexity + block.nonce
    ).toString();
};

export const generateBlockHash = (block: IBlock): IBlock => {
    while (true) {
        const hash = hashBlock(block);
        if (isValidProofOfWork(hash, block.complexity)) {
            block.hash = hash;
            return block;
        }

        block.nonce = block.nonce++;
    }
};

export const validateAddress = (address: string): boolean => {
    return address.match('^[a-fA-F0-9]+$') !== null && address.startsWith('04');
};