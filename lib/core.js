'use strict';
const _ = require("lodash");
const patrun = require("patrun");
const Makeuse = require('use-plugin');
const log = require("./log");
const Transport = require("./transport");

class core {

    constructor(path) {
        this.path = path;
        this.ident = 0;
        this.transport = new Transport();
    }

    listen(opt) {
        this.transport.listen(opt, this);
        return this;
    }

    client(opt) {
        this.transport.client(opt);
        return this;
    }

    add(pattern, handle) {
        let errorMsg;
        if (pattern == null) errorMsg = "pattern couldn't be null";
        if (typeof pattern != 'object') errorMsg = "pattern should be an object, not " + (typeof pattern);
        if (typeof handle != 'function') errorMsg = "handle should be a function";
        if (this.path.find(pattern) != null)
            errorMsg = "This pattern already exists";

        if (errorMsg)
            throw new Error(errorMsg);

        this.path.add(pattern, handle);
        return this;
    }

    find(pattern, callback) {
        pattern.ident = ++this.ident;
        let res = this.path.find(pattern);
        if (res) callback(res);
        else {
            try {
                this.transport.sendMessage(pattern);
                this.transport.getCallback(this.ident, (result) => {
                    if (!result) { console.log("undefined pattern"); res = null }
                    else res = (args, done) => { done(null, result) };
                    callback(res);
                })
            }
            catch (e) {
                new Error(e);
                callback(null);
            }
        }
    }

    act(args, callback) {
        this.find(args, (res) => {
            if (!res) return callback(log.error("no_handle_found"));
            res.call(this, args, callback);
        });
        return this;
    }

    use(arg0, arg1, arg2) {
        let plugindesc;
        if (arg0 === 'options') {
            this.options(arg1)
            return this
        }
        try {
            _.use = Makeuse({
                prefix: 'devis-',
                module: module,
                msgprefix: false,
                builtin: ''
            })
            plugindesc = _.use(arg0, arg1, arg2)
        }
        catch (e) {
            new Error(e);
            return this
        }

        return this
    }
}

module.exports = new core(patrun());