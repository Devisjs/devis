/* Copyright (c) 2017 Devis, MIT License */
"use strict";
const chai = require("chai"),
    cmd = require('node-cmd'),
    expect = chai.expect,
    Core = require("../lib/core.js"),
    Transport = require("../lib/transport"),
    devisP = require("devisPattern"),
    childProcess = require('child_process');
let core, Servercore;


describe("Devis Core", function() {
    describe("constructor", function() {
        let devisPattern = new devisP();
        core = new Core(devisPattern);
        it("should have a default name", function() {
            expect(core.name).to.equal("untitled");
        });
        it("should have an array for clients", function() {
            expect(core.clients).to.be.an('array');
            expect(core.clients).to.be.empty;
            expect(core.clients).to.have.lengthOf(0);
        });
        it("should have an initialized identificator", function() {
            expect(core.ident).to.equal(0);
        });
    });

    describe("#setName", function() {
        it("should set name if provided", function() {
            core.setName("foobar");
            expect(core.name).to.equal("foobar");
        });

    });

    describe("#listen", function() {
        it("should create an instance of transport (server) with given options and return the same instance of Core", function() {
            //Add a pattern for later test
            let devisPatternServer = new devisP();

            Servercore = new Core(devisPatternServer);
            Servercore.setName("server");
            Servercore.add({
                action: 'foo',
                cmd: 'bar'
            }, function(args, done) {
                done(null, "the client " + args.test + " are connected to this distant microservice");
            });
            var coreAfterServer = Servercore.listen({
                host: '127.0.0.1',
                port: 3030
            }); //try with tcp
            expect(Servercore).to.equal(coreAfterServer);
        });
    });

    describe("#client", function() {
        it("should create an instance of transport (client) and connect to the server", function() {
            core.client({
                host: '127.0.0.1',
                port: 3030,
                id: 0
            });
            expect(core.clients[0]).to.be.an.instanceof(Transport);
            expect(core.clients[0].socket['_socket']['connecting']).to.equal(true);
            expect(core.clients[0].state).to.equal("connected");
        });
        it("should increment the number of clients", function() {
            expect(core.clients).to.have.lengthOf(1);
        });
        it("should throw an exception if the id is not given", function() {
            expect(function() {
                core.client({
                    host: '127.0.0.1',
                    port: 3032
                })
            }).to.throw(Error, "Id can not be empty");
        });
        it("should throw an exception if the id already exists", function() {
            expect(function() {
                core.client({
                    host: '127.0.0.1',
                    port: 3030,
                    id: 0
                })
            }).to.throw(Error, "id must be unique");
        });
    });

    describe("#add", function() {
        it("should add a pattern to the microsevice", function() {
            core.add({
                action: 'game',
                cmd: 'play'
            }, function(args, done) {
                done(null, args.name + " is playing game now");
            });
            expect(core.path.id).to.not.equal(0);
            expect(core.path.path).to.not.be.empty;
            expect(core.path.path).to.be.an("Array");
        });
        it("should add a pattern without needed arguments to the microsevice", function() {
            core.add({
                action: 'foo',
                cmd: 'pause'
            }, function(args, done) {
                done(null, "player X is pausing game now");
            });
        });
        it("should throw an exception if the pattern already exists", function() {
            expect(function() {
                core.add({
                    action: 'game',
                    cmd: 'play'
                }, function(args, done) {
                    done(null, args.name + " is playing game now");
                })
            }).to.throw(Error, "This pattern already exists");
        });
        it("should throw an exception if the pattern are not an object", function() {
            expect(function() {
                core.add("notAnObject", function(args, done) {
                    done(null, args.name + " is playing game now");
                })
            }).to.throw(Error, "pattern should be an object, not string");
        });
        it("should throw an exception if the pattern are null", function() {
            expect(function() {
                core.add(null, function(args, done) {
                    done(null, args.name + " is playing game now");
                })
            }).to.throw(Error, "pattern couldn\'t be null");
        });
        it("should throw an exception if the handle are not a function", function() {
            expect(function() {
                core.add({
                    action: 'foo',
                    cmd: 'play'
                }, "notAFunction")
            }).to.throw(Error, "handle should be a function");
        });
    });

    describe("#act", function() {
        it("should successively detect that there is not arguments there", function() {
            var coreAfterServer = core.act({
                action: 'foo',
                cmd: 'pause'
            }, function(err, result) {
                if (err) throw err;
                console.log(result);
            });
            expect(core).to.equal(coreAfterServer);
        });
        it("should find the pattern on his own instance", function() {

            var coreAfterServer = core.act({
                action: 'game',
                cmd: 'play'
            }, {
                name: "foo"
            }, function(err, result) {
                if (err) throw err;
                console.log(result);
            });
            expect(core).to.equal(coreAfterServer);
        });
        it("should find the pattern on local microservice", function() {
            core.use("../examples/server");
            var coreAfterServer = core.act({
                action: 'gamer',
                cmd: 'pause'
            }, {
                name: "hmida"
            }, function(err, res) {
                if (err) throw err;
                console.log(res);
            });
            expect(core).to.equal(coreAfterServer);
        });
        it("should throw an exception if the pattern doesn't exist", function() {
            expect(function() {
                core.act({
                    action: 'gamer',
                    cmd: 'player'
                }, {
                    name: "foo"
                }, function(err, result) {
                    if (err) throw err;
                    console.log(result);
                })
            }).to.throw(Error, "No handle found");
        });
        it("should find the pattern on distant microservice", function() {
            var coreAfterServer = core.act({
                    clientId: 0,
                    action: 'foo',
                    cmd: 'bar'
                }, {
                    test: "Client0"
                },
                function(err, result) {
                    if (err) throw err;
                    console.log(result);
                });
            expect(core).to.equal(coreAfterServer);
        });

        describe("#_find", function() {
            it("should increment the ident when find a pattern on distant microservice", function() {
                expect(core.ident).to.equal(1);
            });
        });
    });

    describe("#use", function() {
        it("should get patterns and return the same instance of Core ", function() {
            var coreAfterServer = core.use("../examples/server");
            expect(coreAfterServer).to.equal(core);
        });
    });
    //only for wakanda server with node.js support!!
    describe("#usePath", function() {
        it("should throw an exception if the pattern doesn't exist", function() {

            core.usePath("../examples/server");

        });
    });

    describe("#log", function() {
        // it("should create a log file with the name of microservice which contains a description of different paths ", function() {
        //     var cmd1 = 'node examples/server2';
        //     var cmd2 = "node examples/log connect port : '3033' , host : '127.0.0.1";
        //     runScript('./examples/server2', function(err) {
        //         if (err) throw err;
        //         console.log('finished running some-script.js');
        //
        //     });
        //     runScript("examples/log connect port : '3033' , host : '127.0.0.1'", function(err) {
        //         if (err) throw err;
        //         console.log('finished running some-script.js');
        //     });
        //
        //
        //
        // });
    });

    describe("#close", function() {
        it("should close the connection between the given client and the server", function() {
            core.close(0);
            expect(core.clients[0].socket['_socket']['connecting']).to.equal(false);
            expect(core.clients[0].state).to.equal("disconnected");
        });
    });

});
