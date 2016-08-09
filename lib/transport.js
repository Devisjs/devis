'use strict';
const net = require("net");
const JsonSocket = require('json-socket');

class Transport {

    constructor() {
        this.server;
        this.callback = {};
        this.socket = new JsonSocket(new net.Socket());
        this.socket.on('message', (call) => {
            this.callback[call.ident] = call.result;
        })
    }

    getCallback(id) {
        return this.callback[id];
    }

    listen(opt, server) {
        this.server = net.createServer((connection) => {
            let socket = new JsonSocket(connection);
            socket.on('message', (args) => {
                server.act(args, function (err, result) {
                    socket.sendEndMessage({ result: result, ident: args.ident });
                });
            });
        })
            .on('error', (err) => {
                throw err;
            })
        this.server.listen(opt, () => {
            let address = this.server.address();
            console.log('listen %j', address);
        });
    }

    client(opt, devis) {
        this.socket.connect(opt, () => {
        });
    }

    sendMessage(args) {
        this.socket.sendMessage(args);
    }
}

module.exports = Transport;