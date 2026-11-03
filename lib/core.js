/* Copyright (c) 2017 Devis, MIT License */
"use strict";
const log = require("./log");
const fs = require("fs");
const Transport = require("./transport");
const EventEmitter = require("events");
const Path = require("path");
const callsite = require("callsite");
const tracing = require("./tracing");

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
		this.turns = new Map();
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
		this._announce();
		return this;
	}

	_announce() {
		let list = this.path.list();
		this.servers.forEach((server) => server.announce(list));
	}

	_find(pattern, args, callback, settled) {
		let key = normalize(pattern);
		let id = pattern.clientId;
		if (id !== undefined) {
			// An explicit clientId only falls back on an identical local pattern, as in 4.0.
			let res = this.path.find(key);
			if (res) return callback(res);
			let client = this.clients[id];
			if (!client) return callback(null, "no_transport_found");
			return this._remote(client, pattern, args, callback);
		}

		let local = this.path.match(key);
		let remote = this._route(key);
		if (local && (!remote || local.size >= remote.size)) return callback(local.handle);
		if (remote) return this._remote(remote.client, pattern, args, callback);

		// A call made right after connect() waits for the remote patterns instead of failing.
		let waiting = Object.values(this.clients).filter((client) => !client.announced && client.state === "connected");
		if (settled || waiting.length === 0) return callback(null, "no_handle_found");
		let remaining = waiting.length;
		waiting.forEach((client) => client.whenSettled(() => {
			remaining--;
			if (remaining === 0) this._find(pattern, args, callback, true);
		}));
	}

	// Picks the connection announcing the most specific pattern, in turn when several services announce it.
	_route(key) {
		let best = -1;
		let candidates = [];
		Object.values(this.clients).forEach((client) => {
			let found = client.patterns.match(key);
			if (!found || found.size < best) return;
			if (found.size > best) {
				best = found.size;
				candidates = [];
			}
			candidates.push(client);
		});
		if (candidates.length === 0) return null;
		let connected = candidates.filter((client) => client.state === "connected");
		if (connected.length > 0) candidates = connected;
		let group = candidates.map((client) => client.opt.id).join(",");
		let turn = this.turns.get(group) || 0;
		this.turns.set(group, turn + 1);
		return { client: candidates[turn % candidates.length], size: best };
	}

	_remote(client, pattern, args, callback) {
		// Copies keep the caller's pattern and args reusable; the pattern keeps its key order for 3.x services.
		let remotePattern = Object.assign({}, pattern);
		delete remotePattern.clientId;
		let remoteArgs = Object.assign({}, args, { ident: ++this.ident, devisInstanceName: this.name });
		let span = tracing.startClient(remotePattern, this.name, client.opt);
		client.request(remotePattern, remoteArgs, (err, result) => {
			span.end(err);
			callback((args, done) => {
				done(err, result);
			});
		}, span.meta);
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
		let sync = true;
		this._find(path, args, (res, errorType) => {

			if (!res) {
				// Thrown when known at once, as documented; passed to the callback after waiting for remote patterns.
				if (sync) return callback(log.error(errorType));
				return callback(log.ErrorMap[errorType]);
			}
			this.invoke(res, args, callback);

		});
		sync = false;

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
		this._announce();
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
		this._announce();
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
