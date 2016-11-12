'use strict';
let devis=require("../devis");
devis.use("./core");
devis.act({action: 'game', cmd: 'play' }, function (result) {

	console.log(result);

    });

devis.act({action: 'game', cmd: 'pause' }, function (result2) {


	console.log(result2);
    });


devis.act({action: 'gamer', cmd: 'play' }, function (result2) {


	console.log(result2);
    })
