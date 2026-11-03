/* Copyright (c) 2026 Devis, MIT License */
"use strict";
const chai = require("chai"),
	expect = chai.expect,
	Core = require("../lib/core.js"),
	devisP = require("devisPattern");
/* global it, describe, afterEach */

let port = 4100;
let opened = [];

function instance(name) {
	let core = new Core(new devisP()).setName(name).setLogger(null);
	opened.push(core);
	return core;
}

// Starts a service on a fresh port and a client connected to it.
function pair(register, connectOptions) {
	let server = instance("server");
	register(server);
	let client = instance("client");
	let opt = Object.assign({ id: "s", host: "127.0.0.1", port: ++port }, connectOptions);
	return new Promise((resolve, reject) => {
		server.listen({ host: "127.0.0.1", port: opt.port }, (err) => {
			if (err) return reject(err);
			client.connect(opt, () => resolve({ server, client }));
		});
	});
}

describe("Devis 4", function() {
	afterEach(function(finish) {
		let cores = opened;
		opened = [];
		let remaining = cores.length;
		if (remaining === 0) return finish();
		cores.forEach((core) => core.close(() => --remaining || finish()));
	});

	describe("promises", function() {
		it("should resolve call() when no callback is given", async function() {
			let core = instance("local");
			core.push({ role: "math", cmd: "sum" }, (args, done) => done(null, args.left + args.right));
			expect(await core.call({ role: "math", cmd: "sum" }, { left: 1, right: 2 })).to.equal(3);
		});
		// Promise users catch errors with try/catch, so an unknown pattern must reject instead of throwing synchronously.
		it("should reject with an Error for an unknown local pattern", async function() {
			let core = instance("local");
			let promise = core.call({ role: "missing" });
			let err = await promise.catch((e) => e);
			expect(err).to.be.an.instanceof(Error);
			expect(err.message).to.equal("No handle found");
		});
		it("should reject with an Error carrying the remote handler error", async function() {
			let { client } = await pair((server) => {
				server.push({ role: "math", cmd: "divide" }, (args, done) => done("division by zero"));
			});
			let err = await client.call({ clientId: "s", role: "math", cmd: "divide" }, { left: 1, right: 0 }).catch((e) => e);
			expect(err).to.be.an.instanceof(Error);
			expect(err.message).to.equal("division by zero");
		});
	});

	describe("async handlers", function() {
		it("should answer with the value returned by an async handler", async function() {
			let core = instance("local");
			core.push({ role: "users", cmd: "get" }, async (args) => ({ id: args.id }));
			expect(await core.call({ role: "users", cmd: "get" }, { id: 7 })).to.deep.equal({ id: 7 });
		});
		it("should send the message of a rejected async handler to a remote caller", async function() {
			let { client } = await pair((server) => {
				server.push({ role: "users", cmd: "get" }, async () => {
					throw new Error("user not found");
				});
			});
			let err = await client.call({ clientId: "s", role: "users", cmd: "get" }, {}).catch((e) => e);
			expect(err.message).to.equal("user not found");
		});
	});

	describe("patterns", function() {
		// Callers should not need to know the key order used by the service that registered the pattern.
		it("should match a pattern whatever its key order, locally and remotely", async function() {
			let { server, client } = await pair((s) => {
				s.push({ role: "math", cmd: "sum" }, (args, done) => done(null, "sum"));
			});
			expect(await server.call({ cmd: "sum", role: "math" })).to.equal("sum");
			expect(await client.call({ cmd: "sum", clientId: "s", role: "math" })).to.equal("sum");
		});
		it("should refuse a pattern already registered with another key order", function() {
			let core = instance("local");
			core.push({ role: "math", cmd: "sum" }, (args, done) => done());
			expect(() => core.push({ cmd: "sum", role: "math" }, (args, done) => done())).to.throw("This pattern already exists");
		});
		// 3.x deleted clientId from the caller's object, so a second call with the same pattern went local and failed.
		it("should leave the caller's pattern and args untouched", async function() {
			let { client } = await pair((s) => {
				s.push({ role: "ping" }, (args, done) => done(null, "pong"));
			});
			let pattern = { clientId: "s", role: "ping" };
			let args = { from: "test" };
			expect(await client.call(pattern, args)).to.equal("pong");
			expect(await client.call(pattern, args)).to.equal("pong");
			expect(pattern).to.deep.equal({ clientId: "s", role: "ping" });
			expect(args).to.deep.equal({ from: "test" });
		});
	});

	describe("remote results", function() {
		// 3.x treated any falsy remote result as a missing pattern, so sum(0, 0) failed with "No handle found".
		it("should deliver falsy results such as 0, empty string and null", async function() {
			let { client } = await pair((s) => {
				s.push({ role: "math", cmd: "sum" }, (args, done) => done(null, args.left + args.right));
				s.push({ role: "text", cmd: "empty" }, (args, done) => done(null, ""));
				s.push({ role: "users", cmd: "find" }, (args, done) => done(null, null));
			});
			expect(await client.call({ clientId: "s", role: "math", cmd: "sum" }, { left: 0, right: 0 })).to.equal(0);
			expect(await client.call({ clientId: "s", role: "text", cmd: "empty" })).to.equal("");
			expect(await client.call({ clientId: "s", role: "users", cmd: "find" })).to.equal(null);
		});
	});

	describe("concurrency", function() {
		// 3.x sent one request at a time per connection, so a slow handler delayed every other call.
		it("should not make a fast call wait for a slow one on the same connection", async function() {
			let { client } = await pair((s) => {
				s.push({ role: "slow" }, (args, done) => setTimeout(() => done(null, "slow"), 300));
				s.push({ role: "fast" }, (args, done) => done(null, "fast"));
			});
			let order = [];
			let slow = client.call({ clientId: "s", role: "slow" }).then((r) => order.push(r));
			let fast = client.call({ clientId: "s", role: "fast" }).then((r) => order.push(r));
			await Promise.all([slow, fast]);
			expect(order).to.deep.equal(["fast", "slow"]);
		});
		// jsonet reused one header buffer, so frames written before the socket connected overwrote each other's length.
		it("should answer many calls sent before the connection is established", async function() {
			let server = instance("server");
			server.push({ role: "echo" }, (args, done) => done(null, args.n));
			let client = instance("client");
			let p = ++port;
			await new Promise((resolve) => server.listen({ host: "127.0.0.1", port: p }, resolve));
			client.connect({ id: "s", host: "127.0.0.1", port: p });
			let calls = [];
			for (let n = 0; n < 50; n++) calls.push(client.call({ clientId: "s", role: "echo" }, { n: n }));
			let results = await Promise.all(calls);
			expect(results).to.deep.equal([...Array(50).keys()]);
		});
	});

	describe("failures", function() {
		// Without a timeout, a caller waited forever for a service that never answers.
		it("should fail a call that gets no answer within the connection timeout", async function() {
			let { client } = await pair((s) => {
				s.push({ role: "stuck" }, () => {});
			}, { timeout: 50 });
			let err = await client.call({ clientId: "s", role: "stuck" }).catch((e) => e);
			expect(err.message).to.equal("request timed out");
		});
		it("should fail pending calls when the service goes away", async function() {
			let { server, client } = await pair((s) => {
				s.push({ role: "stuck" }, () => {});
			});
			let call = client.call({ clientId: "s", role: "stuck" }).catch((e) => e);
			setTimeout(() => server.close(), 20);
			let err = await call;
			expect(err.message).to.equal("connection closed");
		});
		it("should reject a call to an unknown connection id", async function() {
			let core = instance("local");
			let err = await core.call({ clientId: "nope", role: "ping" }).catch((e) => e);
			expect(err.message).to.equal("No transport found");
		});
	});

	describe("#close", function() {
		// Graceful shutdown needs to know when the port is released.
		it("should stop every server and release its port", async function() {
			let server = instance("server");
			let p = ++port;
			await new Promise((resolve) => server.listen({ host: "127.0.0.1", port: p }, resolve));
			await new Promise((resolve) => server.close(resolve));
			let again = instance("again");
			let err = await new Promise((resolve) => again.listen({ host: "127.0.0.1", port: p }, resolve));
			expect(err).to.equal(null);
		});
	});

	describe("#setLogger", function() {
		it("should route connection logs to the given logger", async function() {
			let lines = [];
			let server = instance("server").setLogger({ info: (m) => lines.push(m), error: (m) => lines.push(m) });
			let p = ++port;
			await new Promise((resolve) => server.listen({ host: "127.0.0.1", port: p }, resolve));
			expect(lines[0]).to.contain("server launched");
		});
		it("should print nothing when the logger is null", async function() {
			let printed = [];
			let original = console.log;
			console.log = (m) => printed.push(m);
			try {
				await pair((s) => s.push({ role: "ping" }, (args, done) => done(null, "pong")));
			} finally {
				console.log = original;
			}
			expect(printed).to.be.empty;
		});
	});
});
