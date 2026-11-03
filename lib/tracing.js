/* Copyright (c) 2026 Devis, MIT License */
"use strict";

const { version } = require("../package.json");

// @opentelemetry/api is an optional peer dependency: without it, tracing is a no-op.
let api = null;
try {
	api = require("@opentelemetry/api");
} catch (e) {
	api = null;
}

const noop = { meta: undefined, end: () => {} };

function patternName(pattern) {
	return Object.keys(pattern).sort().filter((key) => key !== "clientId").map((key) => {
		let value = pattern[key];
		return key + ":" + (typeof value === "string" ? value : JSON.stringify(value));
	}).join(",");
}

function attributes(pattern, service, peer) {
	let attrs = { "rpc.system": "devis", "rpc.method": patternName(pattern), "devis.service": service };
	if (peer && (peer.host || peer.path)) attrs["server.address"] = peer.host || peer.path;
	if (peer && peer.port) attrs["server.port"] = Number(peer.port);
	return attrs;
}

// A handler may answer more than once (a subscription), but its span ends on the first answer.
function finisher(span) {
	let ended = false;
	return (err) => {
		if (ended) return;
		ended = true;
		if (err) span.setStatus({ code: api.SpanStatusCode.ERROR, message: err instanceof Error ? err.message : String(err) });
		span.end();
	};
}

// Starts the span of an outgoing call; meta carries its context to the remote service.
function startClient(pattern, service, peer) {
	if (!api) return noop;
	let span = api.trace.getTracer("devis", version).startSpan(patternName(pattern), {
		kind: api.SpanKind.CLIENT,
		attributes: attributes(pattern, service, peer)
	});
	let meta = {};
	api.propagation.inject(api.trace.setSpan(api.context.active(), span), meta);
	return { meta: meta, end: finisher(span) };
}

// Runs fn(end) inside the span of an incoming call, so calls made by the handler join the caller's trace.
function runServer(pattern, service, meta, fn) {
	if (!api) return fn(() => {});
	let parent = meta ? api.propagation.extract(api.context.active(), meta) : api.context.active();
	let span = api.trace.getTracer("devis", version).startSpan(patternName(pattern), {
		kind: api.SpanKind.SERVER,
		attributes: attributes(pattern, service)
	}, parent);
	return api.context.with(api.trace.setSpan(parent, span), () => fn(finisher(span)));
}

module.exports = {
	startClient: startClient,
	runServer: runServer
};
