'use strict';
const jsonet = require("jsonet");
const EventEmitter = require('events');

class Transport extends EventEmitter {

    constructor() {
         super();
        this.server;
        this.callback = [];
        this.socket = jsonet.createSocket();

        this.socket.on('close', () => {
            console.log("disconnected");
        })

        this.socket.on('message', (data) => {
            [this.callback[data.ident],this.callback[data.ident][data.name]] = [[],data.result];

            if (data.success === false) this.callback[data.ident][data.name] = null;

            this.emit(data.ident + '' + data.name, { data: this.callback[data.ident][data.name] });
        });
    }

    getCallback(id, name, call) {
        this.once(id + '' + name, (args) => {
            call(args.data);
        });
    }

    listen(opt, server) {
        this.server = jsonet.createServer((connection) => {
            connection.on('message', (args) => {
                server.act(args, function (err, result) {
                    let res = { result: result, ident: args.ident, args: args, name: args.name };
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