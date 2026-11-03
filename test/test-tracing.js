/* Copyright (c) 2026 Devis, MIT License */
"use strict";
const chai = require("chai"),
	expect = chai.expect,
	api = require("@opentelemetry/api"),
	{ BasicTracerProvider, InMemorySpanExporter, SimpleSpanProcessor } = require("@opentelemetry/sdk-trace-base"),
	{ AsyncLocalStorageContextManager } = require("@opentelemetry/context-async-hooks"),
	{ W3CTraceContextPropagator } = require("@opentelemetry/core"),
	{ instance, nextPort, listen, connect, closeAll } = require("./support/cores");
/* global it, describe, before, beforeEach, afterEach */

const exporter = new InMemorySpanExporter();

function spans(kind) {
	return exporter.getFinishedSpans().filter((span) => span.kind === kind);
}

describe("OpenTelemetry tracing", function() {
	before(function() {
		api.trace.setGlobalTracerProvider(new BasicTracerProvider({ spanProcessors: [new SimpleSpanProcessor(exporter)] }));
		api.context.setGlobalContextManager(new AsyncLocalStorageContextManager().enable());
		api.propagation.setGlobalPropagator(new W3CTraceContextPropagator());
	});
	beforeEach(() => exporter.reset());
	afterEach(closeAll);

	async function service(name, register) {
		let core = instance(name);
		register(core);
		let p = nextPort();
		await listen(core, p);
		return p;
	}

	// Without propagation, the caller and the service would show up as two unrelated traces.
	it("should record the remote handler as a child of the caller's span", async function() {
		let p = await service("math", (s) => s.push({ role: "math", cmd: "sum" }, async ({ left, right }) => left + right));
		let gateway = instance("gateway");
		await connect(gateway, "math", p);
		await gateway.call({ role: "math", cmd: "sum" }, { left: 1, right: 2 });

		let [client] = spans(api.SpanKind.CLIENT);
		let [server] = spans(api.SpanKind.SERVER);
		expect(client.name).to.equal("cmd:sum,role:math");
		expect(client.attributes).to.include({ "rpc.system": "devis", "devis.service": "gateway", "server.address": "127.0.0.1", "server.port": p });
		expect(server.attributes).to.include({ "rpc.method": "cmd:sum,role:math", "devis.service": "math" });
		expect(server.spanContext().traceId).to.equal(client.spanContext().traceId);
		expect(server.parentSpanContext.spanId).to.equal(client.spanContext().spanId);
	});

	it("should mark both spans as errors when the handler fails", async function() {
		let p = await service("math", (s) => s.push({ role: "math", cmd: "divide" }, async () => {
			throw new Error("division by zero");
		}));
		let gateway = instance("gateway");
		await connect(gateway, "math", p);
		await gateway.call({ role: "math", cmd: "divide" }).catch(() => {});

		let recorded = [...spans(api.SpanKind.CLIENT), ...spans(api.SpanKind.SERVER)];
		expect(recorded).to.have.lengthOf(2);
		for (let span of recorded) {
			expect(span.status).to.deep.equal({ code: api.SpanStatusCode.ERROR, message: "division by zero" });
		}
	});

	// A request crossing gateway -> orders -> stock must read as one trace.
	it("should join calls made by a handler to the incoming trace", async function() {
		let stockPort = await service("stock", (s) => s.push({ role: "stock", cmd: "reserve" }, async () => true));
		let orders = instance("orders");
		await connect(orders, "stock", stockPort);
		orders.push({ role: "orders", cmd: "create" }, async () => orders.call({ role: "stock", cmd: "reserve" }));
		let ordersPort = nextPort();
		await listen(orders, ordersPort);
		let gateway = instance("gateway");
		await connect(gateway, "orders", ordersPort);
		await gateway.call({ role: "orders", cmd: "create" });

		let all = exporter.getFinishedSpans();
		expect(all).to.have.lengthOf(4);
		expect(new Set(all.map((span) => span.spanContext().traceId)).size).to.equal(1);
		let ordersServer = all.find((span) => span.kind === api.SpanKind.SERVER && span.attributes["devis.service"] === "orders");
		let stockClient = all.find((span) => span.kind === api.SpanKind.CLIENT && span.attributes["devis.service"] === "orders");
		expect(stockClient.parentSpanContext.spanId).to.equal(ordersServer.spanContext().spanId);
	});
});
