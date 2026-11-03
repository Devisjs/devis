/* Copyright (c) 2026 Devis, MIT License */
"use strict";
const Core = require("../../lib/core.js"),
	devisP = require("devisPattern");

let port = 4300;
let opened = [];

function instance(name) {
	let core = new Core(new devisP()).setName(name).setLogger(null);
	opened.push(core);
	return core;
}

function nextPort() {
	return ++port;
}

function listen(core, p) {
	return new Promise((resolve, reject) => core.listen({ host: "127.0.0.1", port: p }, (err) => (err ? reject(err) : resolve())));
}

function connect(core, id, p, options) {
	return new Promise((resolve) => core.connect(Object.assign({ id: id, host: "127.0.0.1", port: p }, options), resolve));
}

// Resolves once every connection of core has received the remote patterns.
function announced(core) {
	return Promise.all(Object.values(core.clients).map((client) => new Promise((resolve) => client.whenSettled(resolve))));
}

function closeAll(finish) {
	let cores = opened;
	opened = [];
	let remaining = cores.length;
	if (remaining === 0) return finish();
	cores.forEach((core) => core.close(() => --remaining || finish()));
}

module.exports = { instance, nextPort, listen, connect, announced, closeAll };
