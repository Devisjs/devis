'use strict';
let devis=require("../devis");
devis.use("./core");
devis.fetch({action: 'game', cmd: 'play' }, function (result) {

	console.log(result);

    });

devis.fetch({action: 'game', cmd: 'pause' }, function (result2) {


	console.log(result2);
    });


devis.fetch({action: 'gamer', cmd: 'play' }, function (result2) {


	console.log(result2);
    })
