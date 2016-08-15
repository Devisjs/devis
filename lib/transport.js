'use strict';
const jsonet = require("./jsonet/index");
const jsonpack = require("jsonpack");
const EventEmitter = require('events');
const colors = require("colors/safe");

class Transport extends EventEmitter {

    constructor() {
        super();
        this.server;
        this.callback = [];
        this.opt;
        this.send = false;
        this.socket = jsonet.createSocket();
        this.state = 'disconnected';

        this.socket.on('close', () => {
            this.state = 'disconnected';
            console.log(colors.gray("disconnected"));
        });

        this.socket.on('error', (ex) => {
            console.log(colors.red(ex));
        })
        this.socket.on('message', (data) => {
            [this.callback[data.ident], this.callback[data.ident][data.name]] = [[], data.result];

            if (data.success === false) this.callback[data.ident][data.name] = null;

            this.emit(data.ident + '' + data.name, { data: this.callback[data.ident][data.name], id: data.ident });
            this.send = false;
            this.emit(data.ident + 1);
        });
    }

    getCallback(id, name, call) {
        this.once(id + '' + name, (args) => {
            call(args.data, args.id);
        });
    }

    listen(opt, server) {
        this.server = jsonet.createServer((connection) => {
            connection.on('message', (args) => {
                args = jsonpack.unpack(args);
                server.act(args, function (err, result) {
                    let res = { result: result, ident: args.ident, args: args, name: args.name };
                    connection.write(res);
                });
            });
        })

            .on('error', function (ex) {
                console.log("handled error");
                console.log(ex);
            })

            .listen(opt, () => {
                let address = this.server.address();
                console.log(colors.green('listen', JSON.stringify(address)));
            });
    }

    client(opt) {
        this.state = 'connected';
        this.socket.connect(opt, () => {
            this.opt = opt;
            console.log(colors.green('client', JSON.stringify(opt)));
        });
    }

    sendMessage(data) {
        if (this.send === false) {

            this.send = true;
            data = jsonpack.pack(data);

            if (this.state == 'disconnected') {
                this.socket.connect(this.opt, () => {
                    this.state = 'connected';
                    console.log(colors.green('client', JSON.stringify(this.opt)));
                    this.socket.write(data);
                });
            }
            else this.socket.write(data);
        }

        else {
            this.on(data.ident, () => {
                this.sendMessage(data);

            })
        }
    }

}

module.exports = Transport;
