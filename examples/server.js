/* Copyright (c) 2017 Devis, MIT License */
"use strict";
var devis = require("../devis");


devis.push({
	action: "gamer",
	cmd: "pause"
}, function(args, done) {

	done(null, args.name + " pause the game");
});

devis.push({
	action: "gamer",
	cmd: "play"
}, function(args, done) {

	done(null, {
		result: args.name
	});
});

module.exports=devis;
