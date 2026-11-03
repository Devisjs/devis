/* Copyright (c) 2017 Devis, MIT License */
"use strict";

const chai = require("chai"),
	expect = chai.expect,
	Transport = require("../lib/transport"),
	EventEmitter = require("events"),
	devis = require("../devis");
let transport;
/* global it, describe */
/*eslint no-console: ["error", { allow: ["warn", "error","log"] }]*/
describe("Devis Transport Class", function() {
	describe("constructor", function() {
		transport = new Transport();
		it("should be an instance of EventEmitter", function() {
			expect(transport).to.be.an.instanceof(EventEmitter);
		});
		it("should not have a socket before connecting", function() {
			expect(transport.socket).to.be.undefined;
		});
		it("should be disconnected", function() {
			expect(transport.state).to.equal("disconnected");
		});
		it("should have no pending request", function() {
			expect(transport.pending.size).to.equal(0);
		});
		it("should have an empty data, options and server", function() {
			expect(transport.data).to.be.empty;
			expect(transport.opt).to.be.undefined;
			expect(transport.server).to.be.undefined;
		});
	});

	describe("#listen", function() {
		it("should create a server and send send server data to clients", function() {
			devis.push({
				action: "server",
				cmd: "Test"
			}, function(args, done) {
				done(null, "test from client " + args.name);
			});
			devis.listen({
				host: "127.0.0.1",
				port: 8181
			});
		});
	});
	let devisClient = require("../devis");
	describe("#client Socket", function() {
		it("should connect client to server", function() {

			devisClient.connect({
				host: "127.0.0.1",
				port: 8181,
				id: 0
			}).setName("Client0");
		});
		// devisClient.clients[0].sendMessage({
		//     action: "server",
		//     cmd: "Test"
		// });
	});
	describe("#request", function() {
		it("should send arguments to server and route the answer by ident", function(finish) {
			let args = {
				name: "Client0",
				ident: ++devisClient.ident,
				devisInstanceName: devisClient.name
			};
			devisClient.clients[0].request({
				action: "server",
				cmd: "Test"
			}, args, (err, result) => {
				expect(err).to.be.null;
				expect(result).to.equal("test from client Client0");
				finish();
			});
		});
	});
	describe("#request and #close", function() {
		it("should reconnect if the connection has been closed and send arguments to server", function(finish) {
			devisClient.clients[0].close();
			let args = {
				name: "Client0",
				ident: ++devisClient.ident,
				devisInstanceName: devisClient.name
			};
			devisClient.clients[0].request({
				action: "server",
				cmd: "Test"
			}, args, (err, result) => {
				expect(result).to.equal("test from client Client0");
				finish();
			});
		});
	});

	describe("#log #serverData", function() {
		it("should return local Paths and servers Paths", function() {
			devisClient.log();
		});
	});
    

});
