/* Copyright (c) 2026 Devis, MIT License */
"use strict";

const net = require("node:net");
const EventEmitter = require("node:events");

// Same frame header as jsonet, so 3.x services and clients still understand 4.x.
const SIGNATURE = 174021652;
const HEADER_LENGTH = 8;

class Socket extends EventEmitter {

	constructor(socket) {
		super();
		this.socket = socket || new net.Socket();
		this.buffer = Buffer.alloc(0);
		this.socket.on("data", (data) => this.onData(data));
		["connect", "close", "error"].forEach((event) => {
			this.socket.on(event, (arg) => this.emit(event, arg));
		});
	}

	connect(opt, callback) {
		this.socket.connect(opt, callback);
	}

	destroy() {
		this.socket.destroy();
	}

	// One buffer per frame: jsonet reused its header buffer, which corrupted writes queued while connecting.
	write(obj) {
		const body = Buffer.from(JSON.stringify(obj));
		const header = Buffer.alloc(HEADER_LENGTH);
		header.writeUInt32BE(SIGNATURE, 0);
		header.writeUInt32BE(body.length, 4);
		this.socket.write(Buffer.concat([header, body]));
	}

	onData(data) {
		this.buffer = Buffer.concat([this.buffer, data]);
		while (this.buffer.length >= HEADER_LENGTH) {
			if (this.buffer.readUInt32BE(0) !== SIGNATURE) {
				this.socket.destroy(new Error("bad frame signature"));
				return;
			}
			const length = this.buffer.readUInt32BE(4);
			if (this.buffer.length < HEADER_LENGTH + length) return;
			const body = this.buffer.subarray(HEADER_LENGTH, HEADER_LENGTH + length).toString("utf8");
			this.buffer = this.buffer.subarray(HEADER_LENGTH + length);
			let message;
			try {
				message = JSON.parse(body);
			} catch (e) {
				this.emit("error", e);
				continue;
			}
			this.emit("message", message);
		}
	}

}

module.exports = Socket;
