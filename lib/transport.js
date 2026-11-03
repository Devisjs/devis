/* Copyright (c) 2017 Devis, MIT License */
"use strict";

const net = require("node:net");
const jsonpack = require("jsonpack");
const EventEmitter = require("events");
const Socket = require("./socket");
const log = require("./log");

const DEFAULT_TIMEOUT = 30000;

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
	}

	// A fresh socket per connection, so the close event of a previous one cannot touch the new one.
	open(callback) {
		let socket = new Socket();
		this.socket = socket;
		this.state = "connected";

		socket.on("close", () => {
			if (socket !== this.socket) return;
			this.state = "disconnected";
			this.logger.info("disconnected");
			this.failPending(log.ErrorMap.connection_closed);
		});

		socket.on("error", (ex) => {
			this.logger.error(String(ex));
		});

		socket.on("message", (data) => this.onMessage(jsonpack.unpack(data)));

		socket.connect(this.opt, callback);
	}

	onMessage(data) {
		if (data.server) {
			this.emit("dataServer", {
				data: data.server
			});
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
				let reply = function(err, result) {
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
		this.open(() => {
			this.logger.info("connected using the following informations : " + JSON.stringify(opt));
			callback(null, "done");
		});
	}

	close() {
		if (this.state === "connected") {
			this.state = "disconnected";
			this.socket.destroy();
			this.failPending(log.ErrorMap.connection_closed);
		}
	}

	request(pattern, args, callback) {
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
			this.open(() => {
				this.logger.info("connected using the following informations : " + JSON.stringify(this.opt));
			});
		}
		this.socket.write(jsonpack.pack([pattern, args]));
	}

}

module.exports = Transport;
