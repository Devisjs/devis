/* Copyright (c) 2026 Devis, MIT License */
"use strict";
const chai = require("chai"),
	expect = chai.expect,
	{ instance, nextPort, listen, connect, announced, closeAll } = require("./support/cores");
/* global it, describe, afterEach */

function wait(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

describe("Devis 4.1", function() {
	afterEach(closeAll);

	describe("partial matching", function() {
		// Callers can send extra keys, such as a version, without every handler having to declare them.
		it("should call the handler whose pattern is contained in the call", async function() {
			let core = instance("local");
			core.push({ role: "math", cmd: "sum" }, async ({ left, right }) => left + right);
			expect(await core.call({ role: "math", cmd: "sum", version: 2 }, { left: 1, right: 2 })).to.equal(3);
		});
		// A generic fallback must not shadow a specific handler, whatever the registration order.
		it("should prefer the most specific handler", async function() {
			let core = instance("local");
			core.push({ role: "math" }, async () => "any");
			core.push({ role: "math", cmd: "sum" }, async () => "sum");
			expect(await core.call({ role: "math", cmd: "sum" })).to.equal("sum");
			expect(await core.call({ role: "math", cmd: "divide" })).to.equal("any");
		});
		it("should apply partial matching on the remote service", async function() {
			let server = instance("server");
			server.push({ role: "math", cmd: "sum" }, async ({ left, right }) => left + right);
			let p = nextPort();
			await listen(server, p);
			let client = instance("client");
			await connect(client, "math", p);
			expect(await client.call({ clientId: "math", role: "math", cmd: "sum", version: 2 }, { left: 2, right: 2 })).to.equal(4);
		});
	});

	describe("routing without clientId", function() {
		it("should send the call to the service that announced the pattern", async function() {
			let math = instance("math");
			math.push({ role: "math", cmd: "sum" }, async ({ left, right }) => left + right);
			let users = instance("users");
			users.push({ role: "users", cmd: "get" }, async ({ id }) => ({ id: id }));
			let pm = nextPort(), pu = nextPort();
			await listen(math, pm);
			await listen(users, pu);
			let gateway = instance("gateway");
			await connect(gateway, "math", pm);
			await connect(gateway, "users", pu);
			expect(await gateway.call({ role: "math", cmd: "sum" }, { left: 1, right: 2 })).to.equal(3);
			expect(await gateway.call({ role: "users", cmd: "get" }, { id: 7 })).to.deep.equal({ id: 7 });
		});
		// connect() returns before the service announced its patterns; the first call must not fail because of that.
		it("should wait for the announcements of a call made right after connect", async function() {
			let math = instance("math");
			math.push({ role: "math", cmd: "sum" }, async ({ left, right }) => left + right);
			let p = nextPort();
			await listen(math, p);
			let gateway = instance("gateway");
			gateway.connect({ id: "math", host: "127.0.0.1", port: p });
			expect(await gateway.call({ role: "math", cmd: "sum" }, { left: 1, right: 2 })).to.equal(3);
		});
		it("should spread calls over every service announcing the pattern", async function() {
			let gateway = instance("gateway");
			for (let name of ["a", "b"]) {
				let service = instance(name);
				service.push({ role: "echo" }, async () => name);
				let p = nextPort();
				await listen(service, p);
				await connect(gateway, name, p);
			}
			await announced(gateway);
			let results = [];
			for (let i = 0; i < 4; i++) results.push(await gateway.call({ role: "echo" }));
			expect(results).to.deep.equal(["a", "b", "a", "b"]);
		});
		// A generic local fallback must not capture calls that a remote service handles more precisely.
		it("should prefer a more specific remote pattern over a generic local one", async function() {
			let math = instance("math");
			math.push({ role: "math", cmd: "sum" }, async () => "remote");
			let p = nextPort();
			await listen(math, p);
			let gateway = instance("gateway");
			gateway.push({ role: "math" }, async () => "local");
			await connect(gateway, "math", p);
			await announced(gateway);
			expect(await gateway.call({ role: "math", cmd: "sum" })).to.equal("remote");
			expect(await gateway.call({ role: "math", cmd: "divide" })).to.equal("local");
		});
		it("should route to a pattern pushed after the service started listening", async function() {
			let math = instance("math");
			let p = nextPort();
			await listen(math, p);
			let gateway = instance("gateway");
			await connect(gateway, "math", p);
			await announced(gateway);
			math.push({ role: "math", cmd: "sum" }, async () => "late");
			await wait(50);
			expect(await gateway.call({ role: "math", cmd: "sum" })).to.equal("late");
		});
		it("should fail with No handle found when no service announces the pattern", async function() {
			let math = instance("math");
			let p = nextPort();
			await listen(math, p);
			let gateway = instance("gateway");
			await connect(gateway, "math", p);
			let err = await gateway.call({ role: "missing" }).catch((e) => e);
			expect(err.message).to.equal("No handle found");
		});
	});

	describe("reconnection", function() {
		// In 4.0 a restarted service only got traffic again when a call happened to reconnect.
		it("should reconnect by itself to a restarted service", async function() {
			this.timeout(5000);
			let p = nextPort();
			let first = instance("math");
			first.push({ role: "math" }, async () => "first");
			await listen(first, p);
			let gateway = instance("gateway");
			await connect(gateway, "math", p);
			await new Promise((resolve) => first.close(resolve));
			let second = instance("math");
			second.push({ role: "math" }, async () => "second");
			await listen(second, p);
			await wait(1500);
			expect(gateway.clients.math.state).to.equal("connected");
			expect(await gateway.call({ role: "math" })).to.equal("second");
		});
		// Services and gateways can then start in any order, as with docker compose.
		it("should connect to a service started after the client", async function() {
			this.timeout(5000);
			let p = nextPort();
			let gateway = instance("gateway");
			let connected = connect(gateway, "math", p);
			await wait(200);
			let math = instance("math");
			math.push({ role: "math" }, async () => "up");
			await listen(math, p);
			await connected;
			expect(await gateway.call({ role: "math" })).to.equal("up");
		});
		it("should not reconnect when reconnect is false", async function() {
			this.timeout(5000);
			let p = nextPort();
			let math = instance("math");
			await listen(math, p);
			let gateway = instance("gateway");
			await connect(gateway, "math", p, { reconnect: false });
			await new Promise((resolve) => math.close(resolve));
			let again = instance("math");
			await listen(again, p);
			await wait(1500);
			expect(gateway.clients.math.state).to.equal("disconnected");
		});
	});
});
