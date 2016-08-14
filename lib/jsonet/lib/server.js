/* JavaScript Object Network Server
 *
 * Copyright (c) 2014 .decimal, Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

var events = require('events');
var net = require('net');
var util = require("util");

var Socket = require('./socket').Socket;


// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Server

function Server(/* [options], [connectionListener] */) {
    events.EventEmitter.call(this);
    var self = this;

    var options;
    if (typeof arguments[0] === 'function') {
        options = {};
        this.on('connection', arguments[0]);
    } else {
        options = arguments[0] || {};
        if (typeof arguments[1] === 'function') {
            this.on('connection', arguments[1]);
        }
    }

    this._server = net.createServer(options, this._handler.bind(this));
    this._server.on('listening', function () {
        self.emit('listening');
    })
    this._server.on('close', function () {
        self.emit('close');
    })
    this._server.on('error', function (e) {
        self.emit('error', e);
    });
}
util.inherits(Server, events.EventEmitter);

Server.prototype._handler = function (socket) {
    var s = new Socket(socket);
    this.emit('connection', s);
};

Server.prototype.address = function () {
    return this._server.address.apply(this._server, arguments);
};

Server.prototype.close = function () {
    this._server.close.apply(this._server, arguments);
    return this;
};

Server.prototype.getConnections = function (callback) {
    return this._server.getConnections(callback);
};

Server.prototype.listen = function () {
    this._server.listen.apply(this._server, arguments);
    return this;
};


// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Exports

exports.Server = Server;

exports.create = function (/* [options], [connectionListener] */) {
    return new Server(arguments[0], arguments[1]);
}
