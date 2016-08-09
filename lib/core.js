'use strict';
const _ = require("lodash");
const patrun = require("patrun");
const Makeuse = require('use-plugin');
const log = require("./log");
const Transport = require("./transport");


class core {
    constructor(path) {
        this.path = path;
        this.ident = 1;
        this.transport = new Transport();
    }

    listen(opt) {
        this.transport.listen(opt, this);
        return this;
    }

    client(opt) {
        this.transport.client(opt);
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

            }, 100);
        }
    }

    act(args, callback) {
        this.find(args, function (res) {
            let handle = res;
            if (!handle) return callback(log.error("this handle doesn't exist"));
            handle.call(this, args, callback);
        })
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