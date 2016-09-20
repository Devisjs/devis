'use strict';
let colors = require("colors/safe");

function error(type,client) {

    let err = new Error();
    err.type = type;
    err.message = ErrorMap()[type];
    err.error = true;
    console.log(colors.red(JSON.stringify(err)));
    if(client==1)
    process.exit(1);
    return err;

}

function ErrorMap() {
    return {
        unique_id:"id must be unique",
        empty_id:"Id can not be empty",
        pattern_null: 'Pattern cannot be null',
        no_handle_found: 'No handle found',
        no_transport_found: 'No transport found'
    };
}

module.exports = {
    error: error,
    ErrorMap: ErrorMap
}
