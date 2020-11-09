import _ = require('lodash');

import { COMPLEXITY_ADJUST_INTERVAL, EMPTY, firstBlock, MINING_ADJUST_INTERVAL } from '../helper/constants';
import { generateBlockHash, getTimestamp, hashBlock, isValidProofOfWork } from '../helper/utility';
import { broadcastLastBlock } from '../network/peers_network';
import { IAvailableTxOut, IBlock, IBlockchain, ITransaction } from './interfaces';
import { getPool, updatePool } from './pooling';
import { createMiningTx, IProcessTxs, processTxs } from './transaction';
import { getPublicKey } from './wallet';

const initBlockchain = (): IBlockchain => {
    return { sequence : [firstBlock] };
};

const blockchain: IBlockchain = initBlockchain();
let availableTxOuts: IAvailableTxOut[] = processTxs({
    txs : blockchain.sequence[0].content,
    availTxOuts : [] as IAvailableTxOut[],
    blockIndex : 0
} as IProcessTxs);

export const getBlockchain = (): IBlockchain => blockchain;
export const getLastBlock = (): IBlock => blockchain.sequence[blockchain.sequence.length - 1];

export const getAvailableTxOuts = (): IAvailableTxOut[] => _.cloneDeep(availableTxOuts);
const updateAvailableTxOuts = (availTxOuts: IAvailableTxOut[]) => availableTxOuts = availTxOuts;

const validateBlock = (block: IBlock, prev: IBlock) => {
    const timestampCheck = prev.timestamp - 60 < block.timestamp && block.timestamp - 60 < getTimestamp();
    const blockCheck = hashBlock(block) === block.hash && isValidProofOfWork(block.hash, block.complexity);

    return prev.index + 1 === block.index && prev.hash === block.prevHash && timestampCheck && blockCheck;
};

const adjustComplexity = (chain: IBlockchain): number => {
    const lastBlock = getLastBlock();
    if (lastBlock.index % COMPLEXITY_ADJUST_INTERVAL === 0 && lastBlock.index !== 0) {
        const prevBlock: IBlock = chain.sequence[chain.sequence.length - COMPLEXITY_ADJUST_INTERVAL];

        const requiredInterval: number = MINING_ADJUST_INTERVAL * COMPLEXITY_ADJUST_INTERVAL;
        const actualInterval: number = lastBlock.timestamp - prevBlock.timestamp;

        return actualInterval < requiredInterval / 2 ? prevBlock.complexity + 1 : (
            actualInterval > requiredInterval * 2 ? prevBlock.complexity - 1 : prevBlock.complexity
        );
    }

    return lastBlock.complexity;
};

export const createNewBlock = (content: ITransaction[]): IBlock | null => {
    const prevBlock: IBlock = getLastBlock();
    let newBlock: IBlock = {
        index: prevBlock.index + 1,
        hash: EMPTY,
        prevHash: prevBlock.hash,
        timestamp: getTimestamp(),
        content,
        complexity: adjustComplexity(blockchain),
        nonce: 0
    } as IBlock;

    newBlock = generateBlockHash(newBlock);
    if (uploadAndBroadcast(newBlock)) return newBlock;
    return null;
};

const uploadAndBroadcast = (block: IBlock): boolean => {
    if (!uploadBlock(block)) return false;

    broadcastLastBlock();
    return true;
};

export const uploadBlock = (block: IBlock): boolean => {
    if (!validateBlock(block, getLastBlock())) return false;

    const availTxOuts: IAvailableTxOut[] = processTxs({
        txs: block.content,
        availTxOuts: getAvailableTxOuts(),
        blockIndex: block.index
    } as IProcessTxs);
    if (availTxOuts === null) return false;

    blockchain.sequence.push(block);
    updateAvailableTxOuts(availTxOuts);
    updatePool(availTxOuts);
    return true;
};

export const replaceBlockchain = (newChain: IBlock[]) => {
    const availTxOuts = pickupAvailTxOuts(newChain);
    if (availTxOuts !== null && totalComplexity(newChain) > totalComplexity(getBlockchain().sequence)) {
        blockchain.sequence = newChain;

        updateAvailableTxOuts(availTxOuts);
        updatePool(availableTxOuts);
        broadcastLastBlock();
    }
};

const pickupAvailTxOuts = (chain: IBlock[]): IAvailableTxOut[] => {
    if (JSON.stringify(chain[0]) !== JSON.stringify(firstBlock)) return null;

    let availTxOuts: IAvailableTxOut[] = [];
    let invalid: boolean = false;
    chain.map((block: IBlock, i: number) => {
        if (i !== 0 && !validateBlock(block, chain[i - 1])) {
            availTxOuts = null;
            invalid = true;
        }

        if (!invalid) availTxOuts = processTxs(
            { txs: block.content, availTxOuts, blockIndex: block.index } as IProcessTxs
        );
    });

    return availTxOuts;
};

const totalComplexity = (chain: IBlock[]): number =>
    chain.map((block: IBlock) => block.complexity)
        .map((complexity) => Math.pow(2, complexity))
        .reduce((x, y) => x + y);

export const getWalletAvailableTxOuts = () => {
    const publicKey: string = getPublicKey();
    const availTxOuts: IAvailableTxOut[] = getAvailableTxOuts();
    if (availTxOuts == null) return null;

    return _.filter(availTxOuts, (a: IAvailableTxOut) => a.address === publicKey);
};

export const createNewLastBlock = (): IBlock | null => {
    const miningTx: ITransaction = createMiningTx(getPublicKey(), getLastBlock().index + 1);
    const txData: ITransaction[] = [miningTx].concat(getPool().transactions);
    return createNewBlock(txData);
};