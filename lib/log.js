function error(type) {
    let err = new Error();
    err.type = type;
    err.message = ErrorMap()[type];
    err.error = true;
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