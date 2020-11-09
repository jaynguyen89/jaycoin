"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const wallet_1 = require("./crypto/wallet");
const http_network_1 = require("./network/http_network");
const peers_network_1 = require("./network/peers_network");
peers_network_1.startNetwork();
http_network_1.runHttpServer();
wallet_1.createWallet();
//# sourceMappingURL=main.js.map