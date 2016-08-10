'use strict';
const net = require("net");
const JsonSocket = require('json-socket');

class Transport {

    constructor() {
        this.server;
        this.callback = {};
        this.devis;
        this.cl = new net.Socket();
        this.socket = new JsonSocket(this.cl);
        this.cl.on('close', () => {
            console.log("disconnected");
        })

    }

    getCallback(id, call) {
        function done(data) {
            call(data);
        }
        this.socket.on('message', (data) => {
            this.callback[data.ident] = data.result;
            //console.log(this.callback[data.ident]);
            if(!data.success) this.callback[data.ident]=null;
            done(this.callback[data.ident]);
        });
        



    }

    listen(opt, server) {
        this.server = net.createServer((connection) => {
            let socket = new JsonSocket(connection);
            socket.on('message', (args) => {
                server.act(args, function (err, result) {
                    socket.sendEndMessage({ result: result, ident: args.ident, args: args });
                });
            });
        })
            .on('error', (err) => {
                console.log(err);
               
            })
        this.server.listen(opt, () => {
            let address = this.server.address();
            console.log('listen %j', address);
        });
    }

    client(opt, devis) {
        this.cl.connect(opt, () => {
            console.log('client %j', opt);
        });
    }

    sendMessage(args, devis) {
        this.devis = devis;
        this.socket.sendMessage(args, () => {
            console.log(this.callback);
        });
    }
}
function toJson(data)
{
    data=data.split("")
}
module.exports = Transport;