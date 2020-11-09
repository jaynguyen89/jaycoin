import WebSocket = require('ws');

export interface IRequest {
    type: string;
    payload: any;
}

export interface IConnection {
    connections: WebSocket[];
}

export interface ITxIn {
    txOutId: string;
    txOutIndex: number;
    signature: string;
}

export interface ITxOut {
    address: string;
    amount: number;
}

export interface ITransaction {
    id: string;
    txIns: ITxIn[];
    txOuts: ITxOut[];
}

export interface IBlock {
    index: number;
    hash: string;
    prevHash: string;
    timestamp: number;
    content: ITransaction[];
    complexity: number;
    nonce: number;
}

export interface IBlockchain {
    sequence: IBlock[];
}

export interface ITransactionPool {
    transactions: ITransaction[];
}

export interface IAvailableTxOut {
    id: string;
    index: number;
    address: string;
    amount: number;
}