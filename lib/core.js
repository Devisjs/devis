/* Copyright (c) 2017 Devis, MIT License */
"use strict";
const log = require("./log");
const fs = require("fs");
const Transport = require("./transport");
const EventEmitter = require("events");
const Path = require("path");
const callsite = require("callsite");

// Patterns are stored with sorted keys, so { b, a } and { a, b } are the same pattern.
function normalize(pattern) {
	let key = {};
	Object.keys(pattern).sort().forEach((name) => {
		if (name !== "clientId") key[name] = pattern[name];
	});
	return key;
}

function toError(err) {
	if (err instanceof Error) return err;
	return new Error(typeof err === "string" ? err : JSON.stringify(err), { cause: err });
}

class Core extends EventEmitter {
	constructor(path) {
		super();
		this.name = "untitled";
		this.path = path;
		this.ident = 0;
		this.clients = [];
		this.servers = [];
		this.logger = log.defaultLogger;
		// Transports read the logger through this object, so setLogger also applies to open connections.
		this.transportLogger = {
			info: (message) => this.logger.info(message),
			error: (message) => this.logger.error(message)
		};
	}

	setName(name) {
		this.name = name;
		return this;
	}

	setLogger(logger) {
		this.logger = logger || log.silentLogger;
		return this;
	}

	listen(opt, callback) {
		let server = new Transport(this.transportLogger);
		this.servers.push(server);
		server.listen(opt, this, (err, res) => {
			if (callback) callback(err, res);
		});
		return this;
	}

	connect(opt, callback) {
		if (typeof opt.id === "undefined") { if (callback) callback("empty_id", null); return (log.error("empty_id")); }
		if (this.clients[opt.id]) { if (callback) callback("unique_id", null); return (log.error("unique_id")); }
		else {
			this.clients[opt.id] = new Transport(this.transportLogger);
			this.clients[opt.id].connect(opt, (err, res) => {
				if (callback) callback(err, res);
			});
			return this;
		}
	}

	// close(id) closes one connection; close([callback]) closes every connection and server.
	close(id, callback) {
		if (id !== undefined && typeof id !== "function") {
			this.clients[id].close();
			return this;
		}
		callback = id;
		Object.values(this.clients).forEach((client) => client.close());
		let servers = this.servers;
		this.servers = [];
		let remaining = servers.length;
		if (remaining === 0 && callback) callback();
		servers.forEach((server) => server.stopListening(() => {
			remaining--;
			if (remaining === 0 && callback) callback();
		}));
		return this;
	}

	push(pattern, handle) {
		if (pattern === null) throw new Error("pattern couldn't be null");
		if (typeof pattern !== "object") throw new Error("pattern should be an object, not " + (typeof pattern));
		if (typeof handle !== "function") throw new Error("handle should be a function");
		let key = normalize(pattern);
		if (this.path.find(key) !== null) throw new Error("This pattern already exists");

		this.path.add(key, handle);
		return this;
	}

	_find(pattern, args, callback) {
		let res = this.path.find(normalize(pattern));
		if (res) return callback(res);

		let id = pattern.clientId;
		if (id === undefined) return callback(null, "no_handle_found");
		let client = this.clients[id];
		if (!client) return callback(null, "no_transport_found");

		// Copies keep the caller's pattern and args reusable; the pattern keeps its key order for 3.x services.
		let remotePattern = Object.assign({}, pattern);
		delete remotePattern.clientId;
		let remoteArgs = Object.assign({}, args, { ident: ++this.ident, devisInstanceName: this.name });
		client.request(remotePattern, remoteArgs, (err, result) => {
			callback((args, done) => {
				done(err, result);
			});
		});
	}

	// Handlers either call done(err, result) or, when they take a single argument, return a value or a Promise.
	invoke(handle, args, callback) {
		let result = handle.call(this, args, callback);
		if (handle.length < 2 && result && typeof result.then === "function") {
			result.then((value) => callback(null, value), (err) => callback(err));
		}
	}

	call(path, args, callback) {
		if (typeof args === "function") {
			callback = args;
			args = {};
		}
		if (args === undefined) args = {};
		if (!callback) {
			return new Promise((resolve, reject) => {
				try {
					this.call(path, args, (err, result) => (err ? reject(toError(err)) : resolve(result)));
				} catch (e) {
					reject(e);
				}
			});
		}
		this._find(path, args, (res, errorType) => {

			if (!res) {
				return callback(log.error(errorType));
			}
			this.invoke(res, args, callback);

		});

		return this;
	}

	use(arg) {
		let stack = callsite(),
			requester = stack[1].getFileName(),
			Filepath = Path.dirname(requester);
		try {
			let devisToUse = require(Filepath + "/" + arg);
			let paths = devisToUse.path.list();
			paths = JSON.parse(paths);
			paths.forEach((path) => {
				if (path !== "") {
					this.path.add(path, devisToUse.path.find(path));
				}
			});
		} catch (e) {
			throw new Error(e);
		}
		return this;
	}

	plug(plugin) {
		// let stack = callsite(),
		// 	requester = stack[1].getFileName(),
		// 	Filepath = Path.dirname(requester);
		try {
			let devisPlugin = require(plugin+"/index");
			let paths = devisPlugin.path.list();
			paths = JSON.parse(paths);
			paths.forEach((path) => {
				if (path !== "") {
					this.path.add(path, devisPlugin.path.find(path));
				}
			});

		} catch (e) {
			throw new Error(e);
		}
		return this;
	}

	log() {
		let file = this.name + "-log.txt";
		let id = 0;
		fs.writeFileSync(file, "");
		this.serverDatatoFile(-1, file);
		while (this.clients[id]) {
			this.serverDatatoFile(id, file);
			id++;
		}
		return this;
	}
	serverDatatoFile(id, file) {
		if (id === -1) {
			let local = "local " + this.path.list() + "\n";
			if (file) {
				fs.appendFileSync(file, local, "utf8");
			}
		} else {
			this.clients[id].serverData((res) => {
				let serv = "server ";
				for (let k in JSON.parse(res))
					if ({}.hasOwnProperty.call(JSON.parse(res), k)) {
						serv += JSON.parse(res)[k] + "\n";
					}

				if (file) {
					fs.appendFileSync(file, serv, "utf8");
				}
			});
		}
		return this;
	}
}
module.exports = Core;
