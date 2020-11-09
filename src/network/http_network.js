"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const bodyParser = require("body-parser");
const _ = require("lodash");
const express = require("express");
const blockchain_1 = require("../crypto/blockchain");
const pooling_1 = require("../crypto/pooling");
const transaction_1 = require("../crypto/transaction");
const wallet_1 = require("../crypto/wallet");
const peers_network_1 = require("./peers_network");
const cors = require("cors");
exports.runHttpServer = () => {
    const app = express();
    app.use(bodyParser.json());
    app.use(cors());
    app.use((error, request, response, next) => {
        if (error)
            response.status(404).send(error);
    });
    app.get('/blockchain', (request, response) => response.send(blockchain_1.getBlockchain()));
    app.get('/block/:hash', (request, response) => response.send(_.find(blockchain_1.getBlockchain().sequence, (block) => block.hash === request.params.hash)));
    app.get('/transaction/:id', (request, response) => response.send(_(blockchain_1.getBlockchain().sequence).map((block) => block.content)
        .flatten().find((tx) => tx.id === request.params.id)));
    app.get('/tx-outs/:address', (request, response) => response.send({
        'availableTxOuts': _.filter(blockchain_1.getAvailableTxOuts(), (a) => a.address === request.params.address)
    }));
    app.get('/available-tx-outs', (request, response) => response.send(blockchain_1.getAvailableTxOuts()));
    app.get('/wallet-available-tx-outs', (request, response) => response.send(blockchain_1.getWalletAvailableTxOuts()));
    app.get('/balance', (request, response) => response.send({ 'balance': wallet_1.balance() }));
    app.get('/public-key', (request, response) => response.send({ 'publicKey': wallet_1.getPublicKey() }));
    app.get('/transaction-pool', (request, response) => response.send(pooling_1.getPool()));
    app.get('/peers', (request, response) => response.send(peers_network_1.getPeers()));
    app.post('/connect-peer', (request, response) => { peers_network_1.connectPeer(request.body.peer); response.send(); });
    app.get('/close-wallet', (request, response) => { wallet_1.voidWallet(); response.send('Wallet deleted.'); });
    app.get('/shutdown', (request, response) => { response.send('HttpServer will shutdown.'); process.exit(); });
    app.post('/mine-random', (request, response) => {
        if (request.body.data == null) {
            response.status(400).send('Request body required.');
            return;
        }
        const newBlock = blockchain_1.createNewBlock(request.body.data);
        if (newBlock === null)
            response.send('Invalid block data.');
        else
            response.send(newBlock);
    });
    app.post('/mine-transaction', (request, response) => {
        try {
            response.send(transaction_1.createNewBlockForTx(request.body.address, request.body.amount));
        }
        catch (e) {
            response.status(400).send('Error occurred.');
        }
    });
    app.post('/mine-last', (request, response) => {
        const newBlock = blockchain_1.createNewLastBlock();
        if (newBlock === null)
            response.send('Error occurred.');
        else
            response.send(newBlock);
    });
    app.post('/process-transaction', (request, response) => {
        try {
            if (request.body.address && request.body.amount) {
                response.send(transaction_1.processTx(request.body.address, request.body.amount));
                return;
            }
            response.send('Request body required.');
        }
        catch (e) {
            response.status(400).send('Error occurred.');
        }
    });
    app.listen(3001);
    console.log('HTTP Server listening on port: ' + 3001);
};
//# sourceMappingURL=http_network.js.map