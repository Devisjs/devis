let devis = require("../devis");

if (process.argv[2] == "connect") {
    let i = 3;
    let res = {};

    while (process.argv[i]) {
        if (process.argv[i] != ":" && process.argv[i] != ",") {
            res[process.argv[i]] = process.argv[i + 2];
            i += 3;
        } else i++;
    }

    res['id'] = 1;

    devis.client(res);


} else devis.use(process.argv[2]);

devis.setName("devis");
devis.log();
