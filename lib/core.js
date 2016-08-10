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
        this.cl = false;
    }

    listen(opt) {
        this.transport.listen(opt, this);
        return this;
    }

    client(opt) {
        if (opt.timeout)[this.timeout, opt.timeout] = [opt.timeout, null];
        this.transport.client(opt);
        this.cl = true;
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
        pattern.ident = ++this.ident;
        let res = this.path.find(pattern);
        if (!res) {
            this.transport.sendMessage(pattern);
            this.transport.getCallback(this.ident, (result) => {
                if (!result) {console.log("undefined pattern");result={data:null}}
                res = (args, done) => { done(null, result) };
                this.cl == false
                callback(res);
            })
        }

        return res;

    }


    act(args, callback) {
        let handle;
        if (this.cl == false) {
            handle = this.find(args, () => { });
            handle.call(this, args, callback);
        }

        if (!handle) {
            this.find(args, (res) => {
                handle = res;
                handle.call(this, args, callback);
                if (!handle) return callback(log.error("no_handle_found"));
            });
        }

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