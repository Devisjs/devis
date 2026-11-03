/* Copyright (c) 2017 Devis, MIT License */
"use strict";

const net = require("node:net");
const jsonpack = require("jsonpack");
const EventEmitter = require("events");
const DevisPattern = require("devisPattern");
const Socket = require("./socket");
const log = require("./log");
const tracing = require("./tracing");

const DEFAULT_TIMEOUT = 30000;
const MAX_RECONNECT_DELAY = 30000;

class Transport extends EventEmitter {

	constructor(logger) {
		super();
		this.logger = logger || log.defaultLogger;
		this.data = "";
		this.server;
		this.connections = new Set();
		this.pending = new Map();
		this.opt;
		this.socket;
		this.state = "disconnected";
		// Patterns announced by the remote service, used to route calls without clientId.
		this.patterns = new DevisPattern();
		this.announced = false;
		this.closedByUser = false;
		this.reconnectDelay = 0;
		this.reconnectTimer = null;
		this.onFirstConnect = null;
	}

	// A fresh socket per connection, so the close event of a previous one cannot touch the new one.
	open() {
		let socket = new Socket();
		this.socket = socket;
		this.state = "connected";
		this.closedByUser = false;

		socket.on("close", () => {
			if (socket !== this.socket) return;
			this.state = "disconnected";
			this.logger.info("disconnected");
			this.failPending(log.ErrorMap.connection_closed);
			// Callers waiting for the first announcement must not wait for a service that is down.
			this.emit("settled");
			if (!this.closedByUser) this.scheduleReconnect();
		});

		socket.on("error", (ex) => {
			this.logger.error(String(ex));
		});

		socket.on("message", (data) => this.onMessage(jsonpack.unpack(data)));

		socket.connect(this.opt, () => this.onConnected());
	}

	onConnected() {
		this.reconnectDelay = 0;
		this.logger.info("connected using the following informations : " + JSON.stringify(this.opt));
		let callback = this.onFirstConnect;
		this.onFirstConnect = null;
		if (callback) callback(null, "done");
	}

	// Retries 1 s, 2 s, 4 s... up to 30 s, so services can start in any order and come back after a restart.
	scheduleReconnect() {
		if (this.opt.reconnect === false) return;
		this.reconnectDelay = Math.min(this.reconnectDelay ? this.reconnectDelay * 2 : 1000, MAX_RECONNECT_DELAY);
		this.reconnectTimer = setTimeout(() => {
			this.reconnectTimer = null;
			this.open();
		}, this.reconnectDelay);
		this.reconnectTimer.unref();
	}

	// Calls back once the remote patterns are known, or the connection dropped.
	whenSettled(callback) {
		if (this.announced || this.state !== "connected") return callback();
		this.once("settled", callback);
	}

	onMessage(data) {
		if (data.server) {
			this.patterns = new DevisPattern();
			JSON.parse(data.server).forEach((pattern) => this.patterns.add(pattern, true));
			this.announced = true;
			this.emit("dataServer", {
				data: data.server
			});
			this.emit("settled");
			return;
		}
		let request = this.pending.get(data.ident);
		// Late answer to a request that already timed out.
		if (!request) return;
		this.pending.delete(data.ident);
		clearTimeout(request.timer);
		request.callback(data.err, data.result);
	}

	failPending(err) {
		let requests = [...this.pending.values()];
		this.pending.clear();
		requests.forEach((request) => {
			clearTimeout(request.timer);
			request.callback(err);
		});
	}

	listen(opt, server, callback) {
		this.server = net.createServer((raw) => {
			let connection = new Socket(raw);
			this.connections.add(connection);
			connection.on("close", () => this.connections.delete(connection));
			connection.write(jsonpack.pack({
				server: server.path.list()
			}));
			// A client dropping its socket must not crash the server process.
			connection.on("error", (ex) => {
				this.logger.error(String(ex));
			});
			connection.on("message", (args) => {
				args = jsonpack.unpack(args);
				tracing.runServer(args[0], server.name, args[2], (end) => this.answer(connection, server, args, end));
			});
		})
			.on("error", (ex) => {
				this.logger.error(String(ex));
				callback(ex, null);
			})
			.listen(opt, () => {
				let address = this.server.address();
				this.logger.info("server launched using the following informations : " + JSON.stringify(address));
				callback(null, "done");
			});
	}

	answer(connection, server, args, end) {
		let reply = function(err, result) {
			end(err);
			let res = {
				// An Error object serializes to {}, so only its message travels.
				err: err instanceof Error ? err.message : err,
				result: result,
				ident: args[1].ident,
				args: args,
				name: args[1].devisInstanceName
			};
			res = jsonpack.pack(res);
			connection.write(res);
		};
		try {
			server.call(args[0], args[1], reply);
		} catch (e) {
			// An unknown pattern or a throwing handler is answered to the caller instead of crashing the server.
			reply(e.message, undefined);
		}
	}

	// Sends the current patterns to connected clients, so patterns pushed after listen can be routed to.
	announce(list) {
		this.connections.forEach((connection) => connection.write(jsonpack.pack({
			server: list
		})));
	}

	stopListening(callback) {
		this.server.close(() => callback());
		// server.close waits for open connections, so end them.
		this.connections.forEach((connection) => connection.destroy());
	}

	serverData(callback) {
		this.once("dataServer", (data) => {
			this.data += JSON.stringify(data);
			callback(this.data);
		});
	}

	connect(opt, callback) {
		this.opt = opt;
		this.onFirstConnect = callback;
		this.open();
	}

	close() {
		this.closedByUser = true;
		clearTimeout(this.reconnectTimer);
		this.reconnectTimer = null;
		if (this.state === "connected") {
			this.state = "disconnected";
			this.socket.destroy();
			this.failPending(log.ErrorMap.connection_closed);
		}
	}

	request(pattern, args, callback, meta) {
		let timeout = this.opt.timeout === undefined ? DEFAULT_TIMEOUT : this.opt.timeout;
		let timer = null;
		if (timeout > 0) {
			timer = setTimeout(() => {
				this.pending.delete(args.ident);
				callback(log.ErrorMap.timeout);
			}, timeout);
		}
		this.pending.set(args.ident, { callback: callback, timer: timer });
		// net buffers writes while connecting, so a closed connection is reopened and written to at once.
		if (this.state === "disconnected") {
			clearTimeout(this.reconnectTimer);
			this.reconnectTimer = null;
			this.open();
		}
		// 3.x services ignore the third element, which carries the trace context.
		this.socket.write(jsonpack.pack(meta ? [pattern, args, meta] : [pattern, args]));
	}

}

module.exports = Transport;
