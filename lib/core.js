/* Copyright (c) 2017 Devis, MIT License */
"use strict";
const log = require("./log");
const colors = require("colors/safe");
const fs = require("fs");
const Transport = require("./transport");
const EventEmitter = require("events");
const Path = require("path");
const callsite = require("callsite");

class Core extends EventEmitter {
	/*eslint no-console: ["error", { allow: ["warn", "error","log"] }] */
	constructor(path) {
		super();
		this.name = "untitled";
		this.path = path;
		this.ident = 0;
		this.clients = [];
		this.projectPath = "";//the project path
	}

	setProjectPath() {
		let stack = callsite(),
			requester = stack[1].getFileName();
		this.projectPath = requester;
	}

	setName(name) {
		this.name = name;
		return this;
	}

	listen(opt, callback) {
		let server = new Transport();
		server.listen(opt, this, (err, res) => {
			if (callback) callback(err, res);
		});
		return this;
	}

	connect(opt, callback) {
		if (typeof opt.id === "undefined") { if (callback) callback("empty_id", null); return (log.error("empty_id", 1)); }
		if (this.clients[opt.id]) { if (callback) callback("unique_id", null); return (log.error("unique_id", 1)); }
		else {
			this.clients[opt.id] = new Transport();
			this.clients[opt.id].connect(opt, (err, res) => {
				if (callback) callback(err, res);
			});
			return this;
		}
	}

	close(id) {
		this.clients[id].close();
		return this;
	}

	push(pattern, handle) {
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

	call(path, args, callback) {
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
		let Path = "/PROJECT/backend/" + arg + ".js";
		let filepath;
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

	plug(plugging) {
		// let stack = callsite(),
		// 	requester = stack[1].getFileName(),
		// 	Filepath = Path.dirname(requester);
		try {
			let devisPlugging = require(plugging+"/index");
			let paths = devisPlugging.path.list();
			paths = JSON.parse(paths);
			paths.forEach((path) => {
				if (path !== "") {
					this.path.add(path, devisPlugging.path.find(path));
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
		this.serverDatatoFile(-1, file);
		while (this.clients[id]) {
			this.serverDatatoFile(id, file);
			id++;
		}
		return this;
	}
	getServerData(id, callback) {
		this.clients[id].serverData((res) => {
			callback(res);
		});
	}
	serverDatatoFile(id, file) {
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

	findFile(file, fullPath) {
		let TempSearchPath = fullPath;
		return new Promise((resolve, reject) => {
			function search(searchPath) {
				let subFolders = [];
				let list = fs.readdirSync(searchPath);
				list.filter((element, number, elementList) => {
					try {
						if (fs.statSync(TempSearchPath + "/" + element).isFile() === true && element === file) {
							resolve(TempSearchPath + "/" + element);
						} else if (element !== "node_modules" && fs.statSync(TempSearchPath + "/" + element).isDirectory() === true) {
							subFolders.push(element);
						}
						if (number === elementList.length - 1) {
							subFolders.forEach(function (value) {
								TempSearchPath = TempSearchPath + "/" + value;
								search(TempSearchPath);
								TempSearchPath = searchPath;
							});
						}
					} catch (e) {
						reject(e);
					}
				});
			}
			search(fullPath);
		});
	}

	findFolderAscending(folder, fullPath) {
		let TempSearchPath = fullPath;
		return new Promise((resolve, reject) => {
			function search(searchPath) {
				let subFolders = [];
				let list = fs.readdirSync(searchPath);
				list.filter((element, number, elementList) => {
					try {
						if (fs.statSync(TempSearchPath + "/" + element).isDirectory() === true && element === folder) {
							resolve(TempSearchPath + "/" + element);
						} else if (element !== "node_modules" && fs.statSync(TempSearchPath + "/" + element).isDirectory() === true) {
							subFolders.push(element);
						}
						if (number === elementList.length - 1) {
							subFolders.forEach(function (value) {
								TempSearchPath = TempSearchPath + "/" + value;
								search(TempSearchPath);
								TempSearchPath = searchPath;
							});
						}
					} catch (e) {
						reject(e);
					}
				});
			}
			search(fullPath);
		});
	}

	findFolderDescending(folder, fullPath) {
		let TempSearchPath = fullPath;
		return new Promise((resolve, reject) => {
			function search(searchPath) {
				let subFolders = [];
				var list = fs.readdirSync(searchPath);
				list.filter((element, number, lis) => {
					try {
						if (element !== "node_modules" && fs.statSync(TempSearchPath + "/" + element).isDirectory() === true) {
							subFolders.push(element);
						}
						if (number === lis.length - 1) {
							if (subFolders.find((element) => { return element === folder; })) {
								resolve(TempSearchPath + "/" + folder);
							}
							else {
								TempSearchPath = TempSearchPath + "/..";
								search(TempSearchPath);
							}
						}

					} catch (e) {
						reject(e);
					}
				});
			}
			search(fullPath);
		});
	}

	getFunctions(arg0, arg1, arg2, arg3, callback) {//arg0: local or distant microservice; arg1: name,  path, or network opt for the microservice; arg2: folder name if arg1 is just a name
		//arg3 depend on your folder position, 1 for an ascending search and -1 for a descending search
		if (arg0 === "local") {
			if (!arg3) {
				let stack = callsite(),
					requester = stack[1].getFileName(),
					Filepath = Path.dirname(requester);
				let devis = require(Filepath + "/" + arg1);
				callback = arg2;
				callback(JSON.parse(devis.path.list()));
			}
			else if (arg3) {
				let stack = callsite(),
					requester = stack[1].getFileName();
				this.projectPath = Path.dirname(requester);
				if (arg3 === 1) {
					this.findFolderAscending(arg2, this.projectPath).then((folderPath) => {
						this.findFile(arg1, folderPath).then((microservicePath) => {
							let devis = require(microservicePath);
							callback(JSON.parse(devis.path.list()));
						});
					});
				} else if (arg3 === -1) {
					this.findFolderDescending(arg2, this.projectPath).then((folderPath) => {
						this.findFile(arg1, folderPath).then((microservicePath) => {
							let devis = require(microservicePath);
							callback(JSON.parse(devis.path.list()));
						});
					});
				}
			}
		}
		else if (arg0 === "distant") {
			let devis = require("devis");
			let promise = new Promise((resolve, reject) => {
				if (typeof arg1 !== "object")
					reject("should be object!");
				arg1.id = 505;
				devis.connect(arg1, (err, res) => {
					if (err) reject(err);
					resolve(res);
				});
			});
			promise.then((res, err) => {
				callback = arg3;
				if (err) throw new Error(err);
				devis.getServerData(505, (res) => {
					callback(JSON.parse(JSON.parse(res)["data"]));
					process.exit(0);
				});

			});
		}
		return this;
	}
}
module.exports = Core;
