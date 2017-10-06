/* Copyright (c) 2016 Devis, MIT License */
"use strict";

const Core = require("./lib/core"),
    DevisP = require("devisPattern"),
    devisPattern=new DevisP();
let devis = new Core(devisPattern);
module.exports = devis;
