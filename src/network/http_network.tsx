import bodyParser = require('body-parser');
import _ = require('lodash');

import * as express from 'express';
import {
    createNewBlock,
    createNewLastBlock,
    getAvailableTxOuts,
    getBlockchain,
    getWalletAvailableTxOuts
} from '../crypto/blockchain';
import { IAvailableTxOut, IBlock, ITransaction } from '../crypto/interfaces';
import { getPool } from '../crypto/pooling';
import { createNewBlockForTx, processTx } from '../crypto/transaction';
import { balance, getPublicKey, voidWallet } from '../crypto/wallet';
import { connectPeer, getPeers } from './peers_network';

import cors = require('cors');

export const runHttpServer = () => {
    const app = express();
    app.use(bodyParser.json());
    app.use(cors());
    app.use((error: any, request: any, response: any, next: any) => {
        if (error) response.status(404).send(error);
    });

    app.get('/blockchain', (request, response) => response.send(getBlockchain()));

    app.get('/block/:hash', (request, response) =>
        response.send(_.find(getBlockchain().sequence, (block: IBlock) => block.hash === request.params.hash))
    );

    app.get('/transaction/:id', (request, response) => response.send(
        _(getBlockchain().sequence).map((block: IBlock) => block.content)
            .flatten().find((tx: ITransaction) => tx.id === request.params.id)
    ));

    app.get('/tx-outs/:address', (request, response) => response.send({
        'availableTxOuts' : _.filter(getAvailableTxOuts(),
            (a: IAvailableTxOut) => a.address === request.params.address)
    }));

    app.get('/available-tx-outs', (request, response) => response.send(getAvailableTxOuts()));

    app.get('/wallet-available-tx-outs', (request, response) => response.send(getWalletAvailableTxOuts()));

    app.get('/balance', (request, response) => response.send({ 'balance' : balance() }));

    app.get('/public-key', (request, response) => response.send({ 'publicKey': getPublicKey() }));

    app.get('/transaction-pool', (request, response) => response.send(getPool()));

    app.get('/peers', (request, response) => response.send(getPeers()));

    app.post('/connect-peer', (request, response) => { connectPeer(request.body.peer); response.send(); });

    app.get('/close-wallet', (request, response) => { voidWallet(); response.send('Wallet deleted.'); });

    app.get('/shutdown', (request, response) => { response.send('HttpServer will shutdown.'); process.exit(); });

    app.post('/mine-random', (request, response) => {
        if (request.body.data == null) {
            response.status(400).send('Request body required.');
            return;
        }

        const newBlock: IBlock | null = createNewBlock(request.body.data);
        if (newBlock === null) response.send('Invalid block data.');
        else response.send(newBlock);
    });

    app.post('/mine-transaction', (request, response) => {
        try {
            response.send(createNewBlockForTx(request.body.address, request.body.amount));
        } catch (e) { response.status(400).send('Error occurred.'); }
    });

    app.post('/mine-last', (request, response) => {
        const newBlock: IBlock | null = createNewLastBlock();
        if (newBlock === null) response.send('Error occurred.');
        else response.send(newBlock);
    });

    app.post('/process-transaction', (request, response) => {
        try {
            if (request.body.address && request.body.amount) {
                response.send(processTx(request.body.address, request.body.amount));
                return;
            }

            response.send('Request body required.');
        } catch (e) { response.status(400).send('Error occurred.'); }
    });

    app.listen(3001);
    console.log('HTTP Server listening on port: ' + 3001);
};