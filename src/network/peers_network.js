"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const WebSocket = require("ws");
const blockchain_1 = require("../crypto/blockchain");
const pooling_1 = require("../crypto/pooling");
const initPeers = () => {
    return { connections: [] };
};
const peers = initPeers();
exports.getPeers = () => peers.connections;
exports.startNetwork = () => {
    const server = new WebSocket.Server({ port: 6001 });
    server.on('connection', (connection) => {
        peers.connections.push(connection);
        handleRequests(connection);
        handleErrors(connection);
        connection.send(JSON.stringify({ type: 'LAST_BLOCK', payload: null }));
    });
    setTimeout(() => peers.connections.forEach((connection) => connection.send({ type: 'REQUEST_POOL', payload: null })), 1000);
    console.log('PEER Server listening on port: ' + 6001);
};
const handleRequests = (connection) => {
    connection.on('message', (message) => {
        let request = {};
        try {
            request = JSON.parse(message);
        }
        catch (e) {
            return;
        }
        switch (request.type) {
            case 'LAST_BLOCK':
                connection.send(JSON.stringify({
                    type: 'RESPONSE_BLOCKCHAIN', payload: JSON.stringify([blockchain_1.getLastBlock()])
                }));
                return;
            case 'BLOCKCHAIN':
                connection.send(JSON.stringify({
                    type: 'RESPONSE_BLOCKCHAIN', payload: JSON.stringify((blockchain_1.getBlockchain()))
                }));
                return;
            case 'RESPONSE_BLOCKCHAIN':
                let newBlocks = [];
                try {
                    newBlocks = JSON.parse(request.payload);
                }
                catch (e) {
                    return;
                }
                if (newBlocks.length === 0 || !sendResponse(newBlocks))
                    console.log('Invalid new blocks.');
                return;
            case 'REQUEST_POOL':
                connection.send(JSON.stringify({
                    type: 'REQUEST_POOL', payload: JSON.stringify((pooling_1.getPool()))
                }));
                return;
            default://RESPONSE_POOL
                let newTxs = [];
                try {
                    newTxs = JSON.parse(request.payload);
                }
                catch (e) {
                    return;
                }
                newTxs.forEach((tx) => {
                    try {
                        pooling_1.addTransaction(tx);
                        exports.broadcastPool();
                    }
                    catch (e) {
                        console.log(e.message);
                    }
                });
                return;
        }
    });
};
const handleErrors = (connection) => {
    connection.on('close', () => peers.connections.splice(peers.connections.indexOf(connection)));
    connection.on('error', () => {
        console.log('Peer connection error: automatically closed.');
        peers.connections.splice(peers.connections.indexOf(connection));
    });
};
const sendResponse = (newBlocks) => {
    const lastBlock = blockchain_1.getLastBlock();
    const lastNewBlock = newBlocks[newBlocks.length - 1];
    if (lastNewBlock.index < lastBlock.index)
        return false;
    if (lastBlock.hash === lastNewBlock.prevHash && blockchain_1.uploadBlock(lastNewBlock)) {
        exports.broadcastLastBlock();
        return true;
    }
    if (newBlocks.length === 1) {
        peers.connections.forEach((connection) => connection.send({ type: 'RESPONSE_BLOCKCHAIN', payload: null }));
        return true;
    }
    blockchain_1.replaceBlockchain(newBlocks);
    return true;
};
exports.connectPeer = (peer) => {
    const connection = new WebSocket(peer);
    connection.on('open', () => {
        peers.connections.push(connection);
        handleRequests(connection);
        handleErrors(connection);
        connection.send(JSON.stringify({ type: 'LAST_BLOCK', payload: null }));
    });
    connection.on('error', () => console.log(peer + ' refused to connect.'));
};
exports.broadcastLastBlock = () => {
    peers.connections.forEach((connection) => connection.send({ type: 'RESPONSE_BLOCKCHAIN', payload: JSON.stringify([blockchain_1.getLastBlock()]) }));
};
exports.broadcastPool = () => {
    peers.connections.forEach((connection) => connection.send({ type: 'REQUEST_POOL', payload: JSON.stringify(pooling_1.getPool()) }));
};
//# sourceMappingURL=peers_network.js.map