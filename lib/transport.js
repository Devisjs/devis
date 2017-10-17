/* Copyright (c) 2016 Devis, MIT License */
"use strict";

const jsonet = require("./jsonet/index");
const jsonpack = require("jsonpack");
const EventEmitter = require("events");
const colors = require("colors/safe");

class Transport extends EventEmitter {
   
	constructor() {
		super();
		this.data = "";
		this.server;
		this.callback = [];
		this.opt;
		this.send = false;
		this.socket = jsonet.createSocket();
		this.state = "disconnected";

		this.socket.on("close", () => {
			this.state = "disconnected";
			console.log(colors.gray("disconnected"));
		});

		this.socket.on("error", (ex) => {
			this.state = "disconnected";
			console.log(colors.red(ex));
		});

		this.socket.on("message", (data) => {
			data = jsonpack.unpack(data);
			if (data.server) {
				this.emit("dataServer", {
					data: data.server
				});
			}
			this.callback[data.ident] = [];
			this.callback[data.ident]["result"] = data.result;
			this.callback[data.ident]["error"] = data.err;


			if (data.success === false) {this.callback[data.ident][data.name] = null;}

			this.emit(data.ident + "" + data.name, {
				data: this.callback[data.ident]["result"],
				err: this.callback[data.ident]["error"],
				id: data.ident
			});
			this.send = false;
			this.emit(1);
		});
	}

	getCallback(id, name, call) {
		this.once(id + "" + name, (args) => {
			this.send = false;
			call(args.err, args.data, args.id);
		});
	}

	listen(opt, server,callback) {
		this.server = jsonet.createServer((connection) => {
			connection.write(jsonpack.pack({
				server: server.path.list()
			}));
			connection.on("message", (args) => {
				args = jsonpack.unpack(args);
				server.act(args[0], args[1], function(err, result) {
					let res = {
						err: err,
						result: result,
						ident: args[1].ident,
						args: args,
						name: args[1].devisInstanceName
					};
					res = jsonpack.pack(res);
					connection.write(res);
				});
			});
		})
			/*eslint no-console: ["error", { allow: ["warn", "error","log"] }] */
			.on("error", function(ex) {
				console.log("handled error");
				console.log(ex);
				callback(ex,null);
			})

			.listen(opt, () => {
				let address = this.server.address();
				console.log(colors.green("listen", JSON.stringify(address)));
				callback(null,"done");
			});
	}

	serverData(callback) {
		this.once("dataServer", (data) => {
			this.data += JSON.stringify(data);
			callback(this.data);
		});
	}

	client(opt,callback) {
		this.state = "connected";
		this.socket.connect(opt, () => {
			this.opt = opt;
			console.log(colors.green("client", JSON.stringify(opt)));
			callback(null,"done");
		});
	}

	close() {
		if (this.state === "connected") {
			this.state = "disconnected";
			this.socket.destroy();
		}
	}

	sendMessage(pattern, args) {
		if (this.send === false) {
			this.send = true;
			let res = [pattern].concat([args]);
			res = jsonpack.pack(res);
			if (this.state === "disconnected") {
				this.socket.connect(this.opt, () => {
					this.state = "connected";
					console.log(colors.green("client", JSON.stringify(this.opt)));
					this.socket.write(res);
				});
			} else {this.socket.write(res);}
		} else {
			this.once(1, () => {
				this.sendMessage(pattern, args);
			});
		}
	}

}

module.exports = Transport;
