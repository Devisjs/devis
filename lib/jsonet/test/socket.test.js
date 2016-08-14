/* JavaScript Object Network Socket Tests
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

"use strict";

var chai = require('chai');
var net = require('net');

var expect = chai.expect;

var jsonet = require('../index.js');

var PORT = 8643;


// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Unit tests

describe('Socket', function () {

    describe('#create()', function () {

        it('should create when no args are provided', function () {
            var socket1 = new jsonet.Socket();
            expect(socket1).to.be.an.instanceof(jsonet.Socket);
            var socket2 = jsonet.createSocket();
            expect(socket2).to.be.an.instanceof(jsonet.Socket);
        });

        it('should create when options arg is provided', function () {
            var options = {
                allowHalfOpen: true
            };
            var socket1 = new jsonet.Socket(options);
            expect(socket1).to.be.an.instanceof(jsonet.Socket);
            expect(socket1._socket.allowHalfOpen).to.be.true;
            var socket2 = jsonet.createSocket(options);
            expect(socket2).to.be.an.instanceof(jsonet.Socket);
            expect(socket2._socket.allowHalfOpen).to.be.true;
        });

    });

    describe('#connect()', function () {

        it('should connect properly to server', function (done) {
            var server = jsonet.createServer();
            var socket;
            server.listen(PORT, function () {
                socket = jsonet.createSocket().on('end', function () {
                    server.close();
                    done();  
                });
                socket.connect(PORT, function () {
                    expect(socket.remoteAddress).to.be.equal('127.0.0.1');
                    expect(socket.remotePort).to.be.equal(PORT);
                    socket.end();
                });
            });
        });

    });

    describe('#end()', function () {

        it('should transmit end message properly', function (done) {
            var message = {
                foo: 'bar'
            };
            var server = jsonet.createServer(function (serverSocket) {
                expect(serverSocket).to.be.an.instanceof(jsonet.Socket);
                expect(serverSocket.remoteAddress).to.be.equal('127.0.0.1');

                serverSocket.on('message', function (message) {
                    expect(message).to.deep.equal(message);
                    server.close();
                    done();
                });
            });
            var socket;
            server.listen(PORT, function () {
                socket = jsonet.createSocket();
                socket.connect(PORT, function () {
                    expect(socket.remoteAddress).to.be.equal('127.0.0.1');
                    expect(socket.remotePort).to.be.equal(PORT);
                    socket.end(message);
                });
            });
        });

    });

    describe('#write()', function () {

        it('should write to server', function (done) {
            var server = jsonet.createServer(function (serverSocket) {
                expect(serverSocket).to.be.an.instanceof(jsonet.Socket);
                expect(serverSocket.remoteAddress).to.be.equal('127.0.0.1');
                server.close();
                done();
            });
            var socket;
            server.listen(PORT, function () {
                socket = jsonet.createSocket();
                socket.connect(PORT, function () {
                    expect(socket.remoteAddress).to.be.equal('127.0.0.1');
                    expect(socket.remotePort).to.be.equal(PORT);
                    socket.write("string");
                });
            });
        });

        it('should handle delayed headers', function (done) {
            this.timeout(30000);
            var message = {
                foo: 'bar'
            };
            var payload = JSON.stringify(message);
            var length = Buffer.byteLength(payload);
            var server = jsonet.createServer(function (serverSocket) {
                serverSocket.on('message', function (message) {
                    expect(message).to.deep.equal(message);
                    server.close();
                    done();
                }).on('error', function (err) {
                    done(err);
                });
            });
            var connection;
            server.listen(PORT, function () {
                connection = net.connect(PORT, function () {
                    var buf1 = new Buffer(4);
                    buf1.writeUInt32BE(174021652, 0);
                    connection.write(buf1);
                    setTimeout(function () {
                        var buf2 = new Buffer(4);
                        buf2.writeUInt32BE(length, 0);
                        connection.write(buf2);
                        setTimeout(function () {
                            connection.write(payload);
                        }, 500);
                    }, 500);
                });
            });
        });

        it('should handle stacked messages', function (done) {
            var message1 = {
                foo: 'bar'
            };
            var message2 = {
                baz: 'boo'
            };
            var server = jsonet.createServer(function (serverSocket) {
                var count = 0;
                serverSocket.on('message', function (message) {
                    if (message.hasOwnProperty('foo')) {
                        expect(message).to.deep.equal(message1);
                        count++;   
                    } else if (message.hasOwnProperty('baz')) {
                        expect(message).to.deep.equal(message2);
                        count++;
                    } else {
                        done(new Error('Incorrect message'));
                    }
                    if (count == 2) {
                        server.close();
                        done();
                    }
                });

                serverSocket.on('error', function (err) {
                    done(err);
                });
            });
            var connection;
            server.listen(PORT, function () {
                connection = net.connect(PORT, function () {
                    var payload1 = JSON.stringify(message1);
                    var payload2 = JSON.stringify(message2);
                    var length1 = Buffer.byteLength(payload1);
                    var length2 = Buffer.byteLength(payload2);
                    var buf = new Buffer(length1 + length2 + 16);
                    buf.writeUInt32BE(174021652, 0);
                    buf.writeUInt32BE(length1, 4);
                    buf.write(payload1, 8);
                    buf.writeUInt32BE(174021652, length1 + 8);
                    buf.writeUInt32BE(length2, length1 + 12);
                    buf.write(payload2, length1 + 16);
                    connection.write(buf);
                });
            });
        });

        it('should handle large stacked messages', function (done) {
            this.timeout(10000);
            var message1 = {
                foo: 'bar',
                items: []
            };
            var message2 = {
                baz: 'boo',
                items: []
            };
            var count = 10000;
            for (var i = 0; i < count; ++i) {
                message1.items.push('K49RdQqWlaIWmHe7ZFmt9DnojYftdgIDj1jKs2G2-' + i.toString());
                message2.items.push('BYTcTHxT65Qmic5ap7exuEfL0mUCdyODd4hW91Nh-' + (count - i).toString());
            }
            var server = jsonet.createServer(function (serverSocket) {
                var count = 0;
                serverSocket.on('message', function (message) {
                    if (message.hasOwnProperty('foo')) {
                        expect(message).to.deep.equal(message1);
                        count++;
                    } else if (message.hasOwnProperty('baz')) {
                        expect(message).to.deep.equal(message2);
                        count++;
                    } else {
                        done(new Error('Incorrect message'));
                    }
                    if (count == 2) {
                        server.close();
                        done();
                    }
                });

                serverSocket.on('error', function (err) {
                    done(err);
                });
            });
            var connection;
            server.listen(PORT, function () {
                connection = net.connect(PORT, function () {
                    var payload1 = JSON.stringify(message1);
                    var payload2 = JSON.stringify(message2);
                    var length1 = Buffer.byteLength(payload1);
                    var length2 = Buffer.byteLength(payload2);
                    var buf = new Buffer(length1 + length2 + 16);
                    buf.writeUInt32BE(174021652, 0);
                    buf.writeUInt32BE(length1, 4);
                    buf.write(payload1, 8);
                    buf.writeUInt32BE(174021652, length1 + 8);
                    buf.writeUInt32BE(length2, length1 + 12);
                    buf.write(payload2, length1 + 16);
                    connection.write(buf);
                });
            });
        });

        it('should handle two-way communication of small datasets', function (done) {
            var message1 = {
                foo: 'bar'
            };
            var message2 = {
                baz: [
                    'yep',
                    {
                        bingo: 'bongo'
                    }
                ]
            }
            var server = jsonet.createServer(function (serverSocket) {
                serverSocket.on('message', function (message) {
                    expect(message).to.deep.equal(message1);
                    serverSocket.write(message2);
                });
            });
            var clientSocket;
            server.listen(PORT, function () {
                clientSocket = jsonet.createSocket().on('message', function (message) {
                    expect(message).to.deep.equal(message2);
                    server.close();
                    done();
                });
                clientSocket.connect(PORT, function () {
                    clientSocket.write(message1);
                });
            });
        });

        it('should handle rapid two-way communication of small datasets', function (done) {
            this.timeout(20000);
            var message1 = {
                foo: 'bar'
            };
            var message2 = {
                baz: [
                    'yep',
                    {
                        bingo: 'bongo'
                    }
                ]
            }
            var server = jsonet.createServer(function (serverSocket) {
                serverSocket.on('message', function (message) {
                    expect(message).to.deep.equal(message1);
                    serverSocket.write(message2);
                });
            });
            var clientSocket;
            server.listen(PORT, function () {
                var count = 0;
                clientSocket = jsonet.createSocket().on('message', function (message) {
                    if (count < 20) {
                        expect(message).to.deep.equal(message2);
                        clientSocket.write(message1);
                        count++;
                    } else {
                        clientSocket.end();
                    }
                }).on('end', function () {
                    server.close();
                    done();
                });
                clientSocket.connect(PORT, function () {
                    clientSocket.write(message1);
                });
            });
        });

        it('should handle two-way communication of large datasets', function (done) {
            this.timeout(20000);
            var message1 = {
                foo: 'bar1',
                baz: 'boo1',
                items: []
            };
            var message2 = {
                foo: 'bar2',
                baz: 'boo2',
                items: []
            };
            var count = 10000;
            for (var i = 0; i < count; ++i) {
                message1.items.push('K49RdQqWlaIWmHe7ZFmt9DnojYftdgIDj1jKs2G2-' + i.toString());
                message2.items.push('BYTcTHxT65Qmic5ap7exuEfL0mUCdyODd4hW91Nh-' + (count - i).toString());
            }
            var server = jsonet.createServer(function (serverSocket) {
                serverSocket.on('message', function (message) {
                    expect(message).to.deep.equal(message1);
                    serverSocket.write(message2);
                });
            });
            var clientSocket;
            server.listen(PORT, function () {
                clientSocket = jsonet.createSocket().on('message', function (message) {
                    expect(message).to.deep.equal(message2);
                    server.close();
                    done();
                });
                clientSocket.connect(PORT, function () {
                    clientSocket.write(message1);
                });
            });
        });

        it('should handle rapid two-way communication of large datasets', function (done) {
            this.timeout(60000);
            var message1 = {
                foo: 'bar1',
                baz: 'boo1',
                items: []
            };
            var message2 = {
                foo: 'bar2',
                baz: 'boo2',
                items: []
            };
            var count = 10000;
            for (var i = 0; i < count; ++i) {
                message1.items.push('K49RdQqWlaIWmHe7ZFmt9DnojYftdgIDj1jKs2G2-' + i.toString());
                message2.items.push('BYTcTHxT65Qmic5ap7exuEfL0mUCdyODd4hW91Nh-' + (count - i).toString());
            }
            var server = jsonet.createServer(function (serverSocket) {
                serverSocket.on('message', function (message) {
                    expect(message).to.deep.equal(message1);
                    serverSocket.write(message2);
                });
            });
            var clientSocket;
            server.listen(PORT, function () {
                var count = 0;
                clientSocket = jsonet.createSocket().on('message', function (message) {
                    if (count < 10) {
                        expect(message).to.deep.equal(message2);
                        clientSocket.write(message1);
                        count++;
                    } else {
                        server.close();
                        done();
                    }
                });
                clientSocket.connect(PORT, function () {
                    clientSocket.write(message1);
                });
            });
        });

    });

    describe('Event #close', function () {

        it('should emit close event from tcp socket', function (done) {
            var server = jsonet.createServer();
            var socket;
            server.listen(PORT, function () {
                socket = jsonet.createSocket().on('end', function () {
                    server.close();
                }).on('close', function () {
                    done();
                });
                socket.connect(PORT, function () {
                    socket.end();
                });
            });
        });

    });

    describe('Event #error', function () {

        it('should emit SyntaxError if bad json is received', function (done) {
            var server = jsonet.createServer(function (serverSocket) {
                expect(serverSocket).to.be.an.instanceof(jsonet.Socket);
                expect(serverSocket.remoteAddress).to.be.equal('127.0.0.1');

                serverSocket.on('message', function (message) {
                    server.close();
                    done(new Error("Should not receive message"));
                });

                serverSocket.on('error', function (err) {
                    expect(err).to.be.an.instanceof(SyntaxError);
                    server.close();
                    done();
                });
            });
            var connection;
            server.listen(PORT, function () {
                connection = net.connect(PORT, function () {
                    var message = '{ "foo": "bar", "baz": sdf }';
                    var length = Buffer.byteLength(message);
                    var header = new Buffer(8);
                    header.writeUInt32BE(174021652, 0);
                    header.writeUInt32BE(length, 4);
                    connection.write(header);
                    connection.write(message);
                });
            });
        });

        it('should emit Error if bad signature is received', function (done) {
            var server = jsonet.createServer(function (serverSocket) {
                expect(serverSocket).to.be.an.instanceof(jsonet.Socket);
                expect(serverSocket.remoteAddress).to.be.equal('127.0.0.1');

                serverSocket.on('message', function (message) {
                    server.close();
                    done(new Error("Should not receive message"));
                });

                serverSocket.on('error', function (err) {
                    expect(err).to.be.an.instanceof(Error);
                    server.close();
                    done();
                });
            });
            var connection;
            server.listen(PORT, function () {
                connection = net.connect(PORT, function () {
                    var message = JSON.stringify({
                        foo: 'bar'
                    });
                    var length = Buffer.byteLength(message);
                    var header = new Buffer(8);
                    header.writeUInt32BE(174021651, 0);
                    header.writeUInt32BE(length, 4);
                    connection.write(header);
                    connection.write(message);
                });
            });
        });

    });

});