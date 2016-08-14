'use strict';
const jsonet = require("jsonet");
const EventEmitter = require('events');

class Transport extends EventEmitter {

    constructor() {
        super();
        this.server;
        this.callback = [];
        this.opt;
        this.socket = jsonet.createSocket();
        this.state = 'connected';
        this.socket.on('close', () => {
            this.state = 'disconnected';
            console.log("disconnected");
        })

        this.socket.on('message', (data) => {
            [this.callback[data.ident], this.callback[data.ident][data.name]] = [[], data.result];

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

    client(opt) {
        this.socket.connect(opt, () => {
            this.opt = opt;
            this.state = 'connected';
            console.log('client %j', opt);
        });
    }

    sendMessage(args, data) {
        if (this.state == 'disconnected') {
            this.socket.connect(opt, () => {
                this.opt = opt;
                this.state = 'connected';
                console.log('client %j', opt);
                this.socket.write(args);
            });
        }
        else this.socket.write(args);
    }
}

module.exports = Transport;
