/* Copyright (c) 2016 Devis, MIT License */
"use strict";
const path=require("path");
const log = require("./log");
const colors = require("colors/safe");
const fs = require("fs");
const Transport = require("./transport");
const EventEmitter = require("events");

class Core extends EventEmitter {
	/*eslint no-console: ["error", { allow: ["warn", "error","log"] }] */
	constructor(path) {
		super();
		this.name = "untitled";
		this.path = path;
		this.ident = 0;
		this.clients = [];
	}

	setName(name) {
		this.name = name;
		return this;
	}

	listen(opt) {
		let server = new Transport();
		server.listen(opt, this);
		return this;
	}

	client(opt) {
		if (typeof opt.id === "undefined") { return (log.error("empty_id", 1)); }
		if (this.clients[opt.id]) { return (log.error("unique_id", 1)); }
		else {
			this.clients[opt.id] = new Transport();
			this.clients[opt.id].client(opt);
			return this;
		}
	}

	close(id) {
		this.clients[id].close();
		return this;
	}

	add(pattern, handle) {
		var errors = [
			{ code: "patternNull", value: pattern === null, error: "pattern couldn't be null" },
			{ code: "patternNotObject", value: typeof pattern !== "object", error: "pattern should be an object, not " + (typeof pattern) },
			{ code: "handleNotFunction", value: typeof handle !== "function", error: "handle should be a function" },
			{ code: "patternExsist", value: this.path.find(pattern) !== null, error: "This pattern already exists" }
		];
		errors.forEach((obj) => {
			if (obj.value === true) {
				throw new Error(obj.error);
			}
		});

		this.path.add(pattern, handle);
		return this;
	}

	_find(pattern, args, callback) {
		let id, res;
		if (typeof pattern.clientId != "undefined") {
			id = pattern.clientId;
			args.ident = ++this.ident;
			args.devisInstanceName = this.name;
			delete pattern["clientId"];
		}
		res = this.path.find(pattern);

		if (res) {
			callback(res, 0);

		} else {
			try {
				if (this.clients[id].state === "connected") {

					this.clients[id].sendMessage(pattern, args);

					this.clients[id].getCallback(this.ident, this.name, (err, result, id) => {

						if (!result && result !== false) {
							console.log(colors.red("undefined pattern " + id + " at devis " + this.name));
							res = null;
						} else {
							res = (args, done) => {
								done(err, result);
							};
						}
						callback(res, 1);
					});
				}
			} catch (e) {
				callback(null, 0);
				throw new Error(e);
			}
		}
	}

	act(path, args, callback) {
		if (!callback) {
			callback = args;
			args = {};
		}
		this._find(path, args, (res, client) => {

			if (!res) {
				return callback(log.error("no_handle_found", client));
			}
			res.call(this, args, callback);

		});

		return this;
	}

	usePath(arg) {
		var Path = "/PROJECT/backend/" + arg + ".js";
		var filepath;
		try {
			filepath = new File(Path).path;
		}
		catch (e) {
			filepath = arg;
			this.use(filepath);
			// throw new Error(e);
		}
		return this;
	}

	use(arg) {
		try {
			let devisToUse=require(arg);
			let paths=devisToUse.path.list();
			paths=JSON.parse(paths);
			paths.forEach((path) => {
				if(path !== "") {
					this.path.add(path,devisToUse.path.find(path));
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
		fs.writeFile(file, "");
		this.serverData(-1, file);
		while (this.clients[id]) {
			this.serverData(id, file);
			id++;
		}
		return this;
	}

	serverData(id, file) {
		if (id === -1) {
			let local = "local " + this.path.list() + "\n";
			if (file) {
				fs.appendFile(file, local, "UTF-8", "a");
			}
		} else {
			this.clients[id].serverData((res) => {
				let serv = "server ";
				for (let k in JSON.parse(res))
					if ({}.hasOwnProperty.call(JSON.parse(res), k)) {
						serv += JSON.parse(res)[k] + "\n";
					}

				if (file) {
					fs.appendFile(file, serv, "UTF-8", "a");
				}
			});
		}
		return this;
	}
}

module.exports = Core;
