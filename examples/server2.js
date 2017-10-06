"use strict";
var devis = require("../devis");
devis.add({
    action: "game",
    cmd: "pause"
}, function(args, done) {

    done(null, args.name + " pause");
});

devis.add({
    action: "game",
    cmd: "play"
}, function(args, done) {

    done(null, args.name + " play");
}).listen({
  host:"127.0.0.1",
  port:3033
});
