'use strict';
const net = require("net");

class Transport {

    constructor() {
        this.server;
        this.callback = {};
        this.devis;
        this.socket = new net.Socket();
        this.socket.on('close', () => {
            console.log("disconnected");
        })


    }

    getCallback(id, call) {
        function done(data) {
            call(data);
        }
        this.socket.on('data', (data) => {
            data = toJson(data)
            this.callback[data.ident] = data.result;
            if (data.success === false) this.callback[data.ident] = null;
            done(this.callback[data.ident]);
        });
    }

    listen(opt, server) {
        this.server = net.createServer((connection) => {
            connection.on('data', (args) => {
                args = toJson(args);
                server.act(args, function (err, result) {
                    let res = { result: result, ident: args.ident, args: args };
                    connection.write(JSON.stringify(res));

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
        this.socket.connect(opt, () => {
            console.log('client %j', opt);
        });
    }

    sendMessage(args, devis) {
        this.devis = devis;
        this.socket.write(JSON.stringify(args));
    }
}
function toJson(data) {
    return JSON.parse(data);
}
module.exports = Transport;