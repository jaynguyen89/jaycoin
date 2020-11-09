import { createWallet } from './crypto/wallet';
import { runHttpServer } from './network/http_network';
import { startNetwork } from './network/peers_network';

startNetwork();
runHttpServer();
createWallet();