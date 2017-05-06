/* Copyright (c) 2016 Devis, MIT License */
'use strict';

const Core = require("./lib/core"),
    devisP = require("devisPattern"),
    devisPattern=new devisP();
let devis = new Core(devisPattern);
module.exports = devis;
