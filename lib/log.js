/* Copyright (c) 2016 Devis, MIT License */
"use strict";
const { styleText } = require("node:util");

let ErrorMap = {
	unique_id: "id must be unique",
	empty_id: "Id can not be empty",
	pattern_null: "Pattern cannot be null",
	no_handle_found: "No handle found",
	no_transport_found: "No transport found",
	timeout: "request timed out",
	connection_closed: "connection closed"
};

function error(type) {
	let err = new Error();
	err.type = type;
	err.message = ErrorMap[type];
	err.error = true;
	throw err;
}

/*eslint no-console: ["error", { allow: ["warn", "error","log"] }]*/
const defaultLogger = {
	info: (message) => console.log(styleText("green", message)),
	error: (message) => console.log(styleText("red", message))
};

const silentLogger = {
	info: () => {},
	error: () => {}
};

module.exports = {
	error: error,
	ErrorMap: ErrorMap,
	defaultLogger: defaultLogger,
	silentLogger: silentLogger
};
