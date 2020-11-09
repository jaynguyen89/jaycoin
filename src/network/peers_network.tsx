import * as WebSocket from 'ws';
import { Server } from 'ws';
import { getBlockchain, getLastBlock, replaceBlockchain, uploadBlock } from '../crypto/blockchain';
import { addTransaction, getPool } from '../crypto/pooling';
import { IBlock, IConnection, IRequest, ITransaction } from '../crypto/interfaces';

const initPeers = (): IConnection => {
    return { connections: [] } as IConnection;
};

const peers: IConnection = initPeers();

export const getPeers = (): WebSocket[] => peers.connections;
export const startNetwork = () => {
    const server: Server = new WebSocket.Server({ port: 6001 });
    server.on('connection', (connection: WebSocket) => {
        peers.connections.push(connection);
        handleRequests(connection);
        handleErrors(connection);

        connection.send(JSON.stringify({ type: 'LAST_BLOCK', payload: null } as IRequest));
    });

    setTimeout(() =>
        peers.connections.forEach(
            (connection: WebSocket) => connection.send({ type: 'REQUEST_POOL', payload: null })
        )
        , 1000
    );
    console.log('PEER Server listening on port: ' + 6001);
};

const handleRequests = (connection: WebSocket) => {
    connection.on('message', (message: string) => {
        let request: IRequest = {} as IRequest;
        try { request = JSON.parse(message); } catch (e) { return; }

        switch (request.type) {
            case 'LAST_BLOCK':
                connection.send(JSON.stringify({
                    type: 'RESPONSE_BLOCKCHAIN', payload: JSON.stringify([getLastBlock()])
                } as IRequest));
                return;
            case 'BLOCKCHAIN':
                connection.send(JSON.stringify({
                    type: 'RESPONSE_BLOCKCHAIN', payload: JSON.stringify((getBlockchain()))
                } as IRequest));
                return;
            case 'RESPONSE_BLOCKCHAIN':
                let newBlocks: IBlock[] = [];
                try { newBlocks = JSON.parse(request.payload); } catch (e) { return; }

                if (newBlocks.length === 0 || !sendResponse(newBlocks)) console.log('Invalid new blocks.');
                return;
            case 'REQUEST_POOL':
                connection.send(JSON.stringify({
                    type: 'REQUEST_POOL', payload: JSON.stringify((getPool()))
                } as IRequest));
                return;
            default: //RESPONSE_POOL
                let newTxs: ITransaction[] = [];
                try { newTxs = JSON.parse(request.payload); } catch (e) { return; }

                newTxs.forEach((tx: ITransaction) => {
                    try {
                        addTransaction(tx);
                        broadcastPool();
                    } catch (e) { console.log(e.message); }
                });
                return;
        }
    });
};

const handleErrors = (connection: WebSocket) => {
    connection.on('close', () => peers.connections.splice(peers.connections.indexOf(connection)));
    connection.on('error', () => {
        console.log('Peer connection error: automatically closed.');
        peers.connections.splice(peers.connections.indexOf(connection));
    });
};

const sendResponse = (newBlocks: IBlock[]): boolean => {
    const lastBlock: IBlock = getLastBlock();
    const lastNewBlock: IBlock = newBlocks[newBlocks.length - 1];

    if (lastNewBlock.index < lastBlock.index) return false;

    if (lastBlock.hash === lastNewBlock.prevHash && uploadBlock(lastNewBlock)) {
        broadcastLastBlock();
        return true;
    }

    if (newBlocks.length === 1) {
        peers.connections.forEach((connection: WebSocket) => connection.send({ type: 'RESPONSE_BLOCKCHAIN', payload: null } as IRequest));
        return true;
    }

    replaceBlockchain(newBlocks);
    return true;
};

export const connectPeer = (peer: string): void => {
    const connection: WebSocket = new WebSocket(peer);
    connection.on('open', () => {
        peers.connections.push(connection);
        handleRequests(connection);
        handleErrors(connection);

        connection.send(JSON.stringify({ type: 'LAST_BLOCK', payload: null } as IRequest));
    });
    connection.on('error', () => console.log(peer + ' refused to connect.'));
};

export const broadcastLastBlock = () => {
    peers.connections.forEach((connection) => connection.send(
        { type: 'RESPONSE_BLOCKCHAIN', payload: JSON.stringify([getLastBlock()]) }
    ));
};

export const broadcastPool = () => {
    peers.connections.forEach((connection) => connection.send(
        { type: 'REQUEST_POOL', payload: JSON.stringify(getPool()) }
    ));
};