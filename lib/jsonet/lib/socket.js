/* JavaScript Object Network Socket
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

var events = require("events");
var net = require("net");
var util = require("util");


// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Private functions

function readString(buffer, offset, length) {
    return buffer.toString("utf8", offset, offset + length);
}

function readUInt32BE(buffer, offset, length) {
    return buffer.readUInt32BE(offset);
}


// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Socket

function Socket(/* [options] */) {
    events.EventEmitter.call(this);
    var self = this;

    // Socket
    if (arguments[0] instanceof net.Socket) {
        this._socket = arguments[0];
    } else {
        var options = arguments[0] || {};
        this._socket = new net.Socket(options);
    }
    
    // Configuration
    this.signature = 174021652;

    // Read data
    this._buffers = [];
    this._offset = 0;            // Current offset in the first buffer    
    this._length = 0;            // Sum of all buffers minus offset
    this._messageLength = null;

    // Write data
    this._header = new Buffer(8);
    this._header.writeUInt32BE(this.signature, 0);

    // Event handlers
    this._socket.on("data", this.onData.bind(this));

    // Relay some of the socket events that don"t need to be handled
    [   "connect",
        "end",
        "close",
        "timeout",
        "drain",
        "error"
    ].forEach(function (event) {
        self._socket.on(event, function (data) {
            self.emit(event, data);
        });
    });

    // Relay some of the socket properties that don"t need to be handled
    [   "remoteAddress",
        "remotePort",
        "bytesRead",
        "bytesWritten",
        "bufferSize"
    ].forEach(function (propertyName) {
        Object.defineProperty(self, propertyName, {
            get: function () {
                return self._socket[propertyName];
            },
            enumerable: true
        });
    });

    // Relay some of the socket functions that don't need to be handled
    [   "connect",
        "destroy",
        "pause",
        "resume",
        "setTimeout",
        "setNoDelay",
        "setKeepAlive",
        "address"
    ].forEach(function (functionName) {
        self[functionName] = function () {
            return self._socket[functionName].apply(self._socket, arguments);
        };
    });
}
util.inherits(Socket, events.EventEmitter);

Socket.prototype._consume = function (fcn, length) {
    this._length -= length;
    if (this._offset + length <= this._buffers[0].length) {
        var val = fcn(this._buffers[0], this._offset, length);
        this._offset += length;
        if (this._offset === this._buffers[0].length) {
            this._offset = 0;
            this._buffers.shift();
        }
        return val;
    } else {
        var buf = new Buffer(length);
        var buf_pos = 0;
        var rem = length;
        while (rem > 0) {
            var len = Math.min(rem, this._buffers[0].length - this._offset);
            this._buffers[0].copy(buf, buf_pos, this._offset, this._offset + len);
            buf_pos += len;
            rem -= len;
            if (len === (this._buffers[0].length - this._offset)) {
                this._offset = 0;
                this._buffers.shift();
            } else {
                this._offset += len;
            }
        }
        var val = fcn(buf, 0, length);
        return val;
    }
};

Socket.prototype._parse = function () {
    var previousLength = 0;
    while (this._length > 0 && previousLength !== this._length) {
        var previousLength = this._length;

        // Read data from buffers        
        var message = null;
        if (this._messageLength === null) {
            if (this._length >= 8) {
                var signature = this._consume(readUInt32BE, 4);
                this._messageLength = this._consume(readUInt32BE, 4);
            }
        } else if (this._length >= this._messageLength) {
            var str = this._consume(readString, this._messageLength);
            this._messageLength = null;
            try {
                message = JSON.parse(str);
            } catch (e) {
                this.emit("error", e);
            }
        }

        // Emit data event
        if (message) {
            this.emit("message", message);
        }
    }
};

Socket.prototype.end = function (obj) {
    if (obj) {
        this.write(obj);
    }
    this._socket.end();
};

Socket.prototype.onData = function (data) {
    this._buffers.push(data);
    this._length += data.length;
    this._parse();
};

Socket.prototype.write = function (obj) {
    var message = JSON.stringify(obj);
    var length = Buffer.byteLength(message);
    this._header.writeUInt32BE(length, 4);
    this._socket.write(this._header);
    this._socket.write(message);
};


// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Exports

exports.Socket = Socket;

exports.create = function (/* [options] */) {
    return new Socket(arguments[0]);
};