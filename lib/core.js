'use strict';
const _ = require("lodash");
const patrun = require("patrun");
const Makeuse = require('use-plugin');
const log = require("./log");
const Transport = require("./transport");
const EventEmitter = require('events');
class Core extends EventEmitter {

    constructor(path) {
        super();
        this.name;
        this.path = path;
        this.ident = 0;
        this.transport = [];
    }

    setName(name) {
        this.name = name;
        return this;
    }

    listen(opt) {
        let server = new Transport();
        server.listen(opt, this);
        return this;
    }

    client(opt) {
        this.transport[opt.id] = new Transport();
        this.transport[opt.id].client(opt);
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
        let id;
        if (pattern.clientId) {
            id=pattern.clientId;
            pattern.clientId=null;
            pattern.ident = ++this.ident;
            pattern.name = this.name;

        }
        let res = this.path.find(pattern);
        if (res) callback(res);
        else {
            try {
                this.transport[id].sendMessage(pattern);
                this.transport[id].getCallback(this.ident, this.name, (result) => {
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

module.exports = new Core(patrun());