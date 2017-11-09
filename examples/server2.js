/* Copyright (c) 2017 Devis, MIT License */
"use strict";
var devis = require("../devis");
devis.push({
	action: "game",
	cmd: "pause"
}, function(args, done) {

	done(null, args.name + " pause");
});

devis.push({
	action: "game",
	cmd: "play"
}, function(args, done) {

	done(null, args.name + " play");
}).listen({
	host:"127.0.0.1",
	port:3033
});
