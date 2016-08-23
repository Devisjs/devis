'use strict';

const _ = require("lodash");
const patrun = require("patrun");
const Makeuse = require('use-plugin');
const log = require("./log");
const colors = require("colors/safe");
const fs = require("fs");
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
        if (!opt.id) return (log.error("empty_id", 1));
        if (this.transport[opt.id]) return (log.error("unique_id", 1));
        else {
            this.transport[opt.id] = new Transport();
            this.transport[opt.id].client(opt);
            return this;
        }
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

    _find(pattern, callback) {
        let id, res;

        if (pattern.clientId) {
            [id, pattern.clientId, pattern.ident, pattern.name] = [pattern.clientId, null, ++this.ident, this.name];
        }

        res = this.path.find(pattern);
        if (res) callback(res, 0);

        else {
            try {

                if (this.transport[id].state == 'connected') {

                    this.transport[id].sendMessage(pattern);

                    this.transport[id].getCallback(this.ident, this.name, (result, id) => {

                        if (!result && result != false) {
                            console.log(colors.red("undefined pattern " + id + " at devis " + this.name));
                            res = null
                        } else res = (args, done) => {
                            done(null, result)
                        };

                        callback(res, 1);
                    });
                } else {
                    let i = 0;
                    this.stateVerify(id, i);
                }
            } catch (e) {
                new Error(e);
                callback(null, 0);
            }
        }
    }

    stateVerify(id, i) {
        process.nextTick(() => {
            i++;
            if (this.transport[id].state == 'connected') {
                this.transport[id].sendMessage(pattern);

                this.transport[id].getCallback(this.ident, this.name, (result) => {

                    if (!result && result != false) {
                        console.log(colors.red("undefined pattern"));
                        res = null
                    } else res = (args, done) => {
                        done(null, result)
                    };
                    callback(res, 1);
                });
            } else {
                if (i < 5) this.stateVerify(id, i);
            }

        })

    }

    act(args, callback) {

        this._find(args, (res, client) => {

            if (!res) {
                return callback(log.error("no_handle_found", client));
            }

            res.call(this, args, callback);

        });
        return this;
    }
    usePath(arg) {
        var Path = "/PROJECT/backend/" + arg + ".js";

        var filepath = File(Path).path;
        this.use(filepath);
        return this;
    }
    use(arg0, arg1, arg2) {

        let plugindesc;
        if (arg0 === 'options') {
            this.options(arg1);
            return this;
        }
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
            return this;
        }

        return this;
    }
    log() {
        let file = "log.txt";
        let id = 1;
        let data = "";
        fs.writeFile(file, "");
        this.serverData(0, file);
        while (this.transport[id]) {
            this.serverData(id, file);
            id++;
        }
        return this;
    }
    serverData(id, file) {
        if (id == 0) {
            let local = "local " + JSON.stringify(this.path.list()) + "\n";
            if (file) {
                fs.appendFile(file, local, "UTF-8", "a");
            }
        } else {
            this.transport[id].serverData((res) => {
                let serv = "server " + id + " ";
                serv += res;
                serv += "\n";
                if (file) {
                    fs.appendFile(file, serv, "UTF-8", "a");
                }
            });
        }
        return this;
    }
}

module.exports = new Core(patrun());
