'use strict';
const jsonet = require("./jsonet/index");
const jsonpack = require("jsonpack");
const EventEmitter = require('events');
class Transport extends EventEmitter {

    constructor() {
        super();
        this.server;
        this.callback = [];
        this.opt;
        this.send = false;
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
            this.emit(data.ident + 1, false);
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

    sendMessage(args) {


        if (this.send === false) {
            this.send = true;
            args = jsonpack.pack(args);
            if (this.state == 'disconnected') {
                this.socket.connect(this.opt, () => {
                    this.state = 'connected';
                    console.log('client %j', opt);
                    
                    this.socket.write(args);
                });
            }
            else this.socket.write(args);
        }
        else {
            this.on(args.ident, (data) => {
                this.send = data;
                args = jsonpack.pack(args);
                this.socket.write(args);

            })
        }
    }

}

module.exports = Transport;
