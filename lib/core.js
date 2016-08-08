'use strict';
const async = require('async')
const _ = require("lodash");
const patrun = require("patrun");
const Makeuse = require('use-plugin');
const log = require("./log");
const Transport = require("./transport");


class core {
    constructor(path) {
        this.path = path;
        //this.remotepat=remotepat;
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
    find(pattern) {
        let res = this.path.find(pattern);
        

        if (!res) {
            this.transport.act(pattern);
            
                if (this.transport.callback)
                    res = (args, done) => { done(null, this.transport.callback) };
                     callback(null, res);
            
            async.waterfall([(callback)=>{setTimeout(() => {
                if (this.transport.callback)
                    res = (args, done) => { done(null, this.transport.callback) };
                     callback(null, res);
                //console.log(this.transport.callback);
            }, 100)},()=>{return res}]);
        }
        if (!res) console.log("undefined pattern");

        else return res;
    }
    act(args, callback) {
        console.log
        let handle = this.find(args);
        if (!handle) return callback(log.error("this handle doesn't exist"));
        handle.call(this, args, callback);
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