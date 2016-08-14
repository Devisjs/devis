let colors = require("colors/safe");
function error(type,client) {
   
    let err = new Error();
    err.type = type;
    err.message = ErrorMap()[type];
    err.error = true;
    console.log(colors.red(JSON.stringify(err)));
    if(client==1)
    process.exit(0);
    return err;
    
}

function ErrorMap() {
    return {
        pattern_null: 'Pattern cannot be null',
        no_handle_found: 'No handle fund',
        no_transport_found: 'No transport found'
    };
}

module.exports = {
    error: error,
    ErrorMap: ErrorMap
}