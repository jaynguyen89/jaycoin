"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const wallet_1 = require("./wallet");
const http_network_1 = require("./http_network");
const peers_network_1 = require("./peers_network");
peers_network_1.startNetwork();
http_network_1.runHttpServer();
wallet_1.createWallet();
//# sourceMappingURL=main.js.map