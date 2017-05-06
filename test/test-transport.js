/* Copyright (c) 2017 Devis, MIT License */

const chai = require("chai"),
    cmd = require('node-cmd'),
    expect = chai.expect,
    jsonet = require("../lib/jsonet/index"),
    Transport = require("../lib/transport"),
    jsonpack = require("jsonpack"),
    EventEmitter = require('events');
devis = require("../devis");
let transport;

describe("Devis Transport Class", function() {
    describe("constructor", function() {
        transport = new Transport();
        it("should be an instance of EventEmitter", function() {
            expect(transport).to.be.an.instanceof(EventEmitter);
        });
        it("shouldn't send any data", function() {
            expect(transport.send).to.be.false;
        });
        it("should create a socket object", function() {
            expect(transport.socket).to.be.an('object');
        });
        it("should be disconnected", function() {
            expect(transport.state).to.equal('disconnected');
        });
        it("should have an array for callbacks", function() {
            expect(transport.callback).to.be.an('array');
            expect(transport.callback).to.have.lengthOf(0);
        });
        it("should have an empty data, options and server", function() {
            expect(transport.data).to.be.empty;
            expect(transport.opt).to.be.empty;
            expect(transport.server).to.be.empty;
        });
    });

    describe("#getCallback", function() {
        it("should take once the result from the emitter given as argument", function() {

            transport.getCallback(1, "dataServer", (err, result, id) => {
                console.log(result);
            });
            transport.emit(1 + '' + 'dataServer', {
                err: null,
                data: "Data sent successfully",
                id: 1
            });
        });
    });

    describe("#listen", function() {
        it("should create a server and send send server data to clients", function() {
            devis.add({
                action: 'server',
                cmd: 'Test'
            }, function(args, done) {
                done(null, "test from client " + args.name);
            });
            devis.listen({
                host: '127.0.0.1',
                port: 8181
            });
        });
    });
    let devisClient = require("../devis");
    describe("#client Socket", function() {
        it("should connect client to server", function() {

            devisClient.client({
                host: "127.0.0.1",
                port: 8181,
                id: 0
            }).setName("Client0");
        });
        // devisClient.clients[0].sendMessage({
        //     action: 'server',
        //     cmd: 'Test'
        // });
    });
    describe("#sendMessage", function() {
        it("should send arguments to server", function() {
            args = {
                name: "Client0"
            };
            args.ident = ++devisClient.ident;
            args.devisInstanceName = devisClient.name;
            devisClient.clients[0].sendMessage({
                action: 'server',
                cmd: 'Test',
                clientId: 0
            }, args);
        });
        it("should wait to get data from a past send ", function() {
            args.ident = ++devisClient.ident;
            args.devisInstanceName = devisClient.name;
            devisClient.clients[0].sendMessage({
                action: 'server',
                cmd: 'Test',
                clientId: 0
            }, args);
            args.ident = ++devisClient.ident;
            args.devisInstanceName = devisClient.name;
            devisClient.clients[0].sendMessage({
                action: 'server',
                cmd: 'Test',
                clientId: 0
            }, args);
        });
    });
    describe("#sendMessage and #Close", function() {
        it("should reconnect if the connection has been closed and send arguments to server", function() {
            devisClient.clients[0].close();
            args = {
                name: "Client0"
            };
            args.ident = ++devisClient.ident;
            args.devisInstanceName = devisClient.name;
            devisClient.clients[0].sendMessage({
                action: 'server',
                cmd: 'Test',
                clientId: 0
            }, args);
        });
    });

    describe("#log #serverData", function() {
        it("should return local Paths and servers Paths", function() {
            devisClient.log();
        });
    });
    

});
