/* Copyright (c) 2016 Devis, MIT License */
'use strict';

const _ = require("lodash");
const devisPattern = require("devisPattern");
const Makeuse = require('use-plugin');
const log = require("./log");
const colors = require("colors/safe");
const fs = require("fs");
const Transport = require("./transport");
const EventEmitter = require('events');

class Core extends EventEmitter {

    constructor(path) {
        super();
        this.name = "untitled";
        this.path = path;
        this.ident = 0;
        this.clients = [];
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
        if (typeof opt.id === "undefined") return (log.error("empty_id", 1));
        if (this.clients[opt.id]) return (log.error("unique_id", 1));
        else {
            this.clients[opt.id] = new Transport();
            this.clients[opt.id].client(opt);
            return this;
        }
    }

    close(id) {
        this.clients[id].close();
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

    _find(pattern, args, callback) {
        let id, res;
        if (typeof pattern.clientId != "undefined") {
            id = pattern.clientId;
            args.ident = ++this.ident;
            args.devisInstanceName = this.name;
            delete pattern["clientId"];
        }
        res = this.path.find(pattern);

        if (res) {
            callback(res, 0);

        } else {
            try {
                if (this.clients[id].state == 'connected') {

                    this.clients[id].sendMessage(pattern, args);

                    this.clients[id].getCallback(this.ident, this.name, (err, result, id) => {

                        if (!result && result != false) {
                            console.log(colors.red("undefined pattern " + id + " at devis " + this.name));
                            res = null
                        } else res = (args, done) => {
                            done(err, result)
                        };
                        callback(res, 1);
                    });
                }
            } catch (e) {
                new Error(e);
                callback(null, 0);
            }
        }
    }

    act(path, args, callback) {
        if (!callback) {
            callback = args;
            args = {};
        }
        this._find(path, args, (res, client) => {

            if (!res) {
                return callback(log.error("no_handle_found", client));
            }
            res.call(this, args, callback);

        });

        return this;
    }

    usePath(arg) {
        var Path = "/PROJECT/backend/" + arg + ".js";
        var filepath;
        try{
          filepath = File(Path).path;
        }
        catch (e) {
            new Error(e);
            filepath=arg;
            this.use(filepath);
        }
        return this;
    }

    use(arg0, arg1, arg2) {
        let plugindesc;
        try {
            _.use = Makeuse({
                prefix: 'devis-',
                module: module,
                msgprefix: false,
                builtin: ''
            });
            plugindesc = _.use(arg0, arg1, arg2);
        } catch (e) {
            new Error(e);
        }
        return this;
    }

    log() {
        let file = this.name + "-log.txt";
        let id = 0;
        let data = "";
        fs.writeFile(file, "");
        this.serverData(-1, file);
        while (this.clients[id]) {
            this.serverData(id, file);
            id++;
        }
        return this;
    }

    serverData(id, file) {
        if (id == -1) {
            let local = "local " + this.path.list() + "\n";
            if (file) {
                fs.appendFile(file, local, "UTF-8", "a");
            }
        } else {
            this.clients[id].serverData((res) => {
                let serv = "server ";
                for (let k in JSON.parse(res)) serv += JSON.parse(res)[k] + "\n";

                if (file) {
                    fs.appendFile(file, serv, "UTF-8", "a");
                }
            });
        }
        return this;
    }
}

module.exports = Core;
