'use strict';
const _ = require("lodash");
const patrun = require("patrun");
const Makeuse = require('use-plugin');
const wait = require("wait.for");
const log = require("./log");
const Transport = require("./transport");

class core {

    constructor(path) {
        this.path = path;
        this.ident = 1;
        this.transport = new Transport();
        this.timeout;
    }

    listen(opt) {
        this.transport.listen(opt, this);
        return this;
    }

    client(opt) {
        if (opt.timeout)[this.timeout, opt.timeout] = [opt.timeout, null];
        this.transport.client(opt);
        return this;
    }

    add(pattern, handle)//add({...}=pattern,funtion(,)=>handle)
    {
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
        pattern.ident = this.id;
        let res = this.path.find(pattern);
        if (res) {
            callback(res);
        }

        if (!res) {
            this.transport.sendMessage(pattern);
             setTimeout(() => {
                if (this.transport.getCallback(this.id))
                    res = (args, done) => { done(null, this.transport.getCallback(this.id)) };
                callback(res);
                if (!res) console.log("undefined pattern");

            }, this.timeout || 100);
        }
    }

    act(args, callback) {
        this.find(args, (res) => {
            let handle = res;
            if (!handle) return callback(log.error("no_handle_found"));
            handle.call(this, args, callback);
        })
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
function cleartime(id) {
    clearTimeout(id);
}

module.exports = new core(patrun());