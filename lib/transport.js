'use strict';
const jsonet = require("jsonet");
const EventEmitter = require('events');
class MyEmitter extends EventEmitter { }
class Transport {

    constructor() {
        this.server;
        this.Emitter = new MyEmitter();
        this.callback = {};
        this.devis;
        this.socket = jsonet.createSocket();
        this.socket.on('close', () => {
            console.log("disconnected");
        })
        this.Emitter.once('data', (callback) => {
            this.socket.on('message', (data) => {
                this.callback[data.ident] = data.result;

                if (data.success === false) this.callback[data.ident] = null;

                callback(this.callback[data.ident]);
            });
        });
    }

    getCallback(id, call) {
        this.Emitter.emit('data', call);
    }

    listen(opt, server) {
        this.server = jsonet.createServer((connection) => {
            connection.on('message', (args) => {
                server.act(args, function (err, result) {
                    let res = { result: result, ident: args.ident, args: args };
                    connection.write(res);
                });
            });
        })
            .on('error', (err) => {
                console.log(err);

            })
            .listen(opt, () => {
                let address = this.server.address();
                console.log('listen %j', address);
            });
    }

    client(opt, devis) {
        this.socket.connect(opt, () => {
            console.log('client %j', opt);
        });
    }

    sendMessage(args, data) {
        this.socket.write(args);
    }
}

module.exports = Transport;