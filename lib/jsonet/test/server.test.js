/* JavaScript Object Network Server Tests
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

var net = require('net');
var chai = require('chai');
var expect = chai.expect;

var jsonet = require('../index.js');

var PORT = 8642;


// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Unit tests

describe('Server', function () {

    describe('#create()', function () {

        it('should create when no args are provided', function () {
            var server1 = new jsonet.Server();
            expect(server1).to.be.an.instanceof(jsonet.Server);
            var server2 = jsonet.createServer();
            expect(server2).to.be.an.instanceof(jsonet.Server);
        });

        it('should create when options arg is provided', function () {
            var options = {
                allowHalfOpen: true
            };
            var server1 = new jsonet.Server(options);
            expect(server1).to.be.an.instanceof(jsonet.Server);
            expect(server1._server.allowHalfOpen).to.be.true;
            var server2 = jsonet.createServer(options);
            expect(server2).to.be.an.instanceof(jsonet.Server);
            expect(server2._server.allowHalfOpen).to.be.true;
        });

        it('should create when connectionListener arg is provided', function () {
            var connectionListener = function (socket) { };
            var server1 = new jsonet.Server(connectionListener);
            expect(server1).to.be.an.instanceof(jsonet.Server);
            expect(server1.listeners('connection')).to.have.length(1);
            var server2 = jsonet.createServer(connectionListener);
            expect(server2).to.be.an.instanceof(jsonet.Server);
            expect(server2.listeners('connection')).to.have.length(1);
            expect(server1.listeners('connection')[0]).to.equal(server2.listeners('connection')[0]);
        });

        it('should create when options and connectionListener args are provided', function () {
            var options = {
                allowHalfOpen: true
            };
            var connectionListener = function (socket) { };
            var server1 = new jsonet.Server(options, connectionListener);
            expect(server1).to.be.an.instanceof(jsonet.Server);
            expect(server1._server.allowHalfOpen).to.be.true;
            expect(server1.listeners('connection')).to.have.length(1);
            var server2 = jsonet.createServer(options, connectionListener);
            expect(server2).to.be.an.instanceof(jsonet.Server);
            expect(server2._server.allowHalfOpen).to.be.true;
            expect(server2.listeners('connection')).to.have.length(1);
            expect(server1.listeners('connection')[0]).to.equal(server2.listeners('connection')[0]);
        });

    });

    describe('#getConnections(callback)', function () {

        it('should return zero when nothing is connected', function (done) {
            var server = jsonet.createServer();
            server.listen(function () {
                server.getConnections(function (err, count) {
                    expect(err).to.be.null;
                    expect(count).to.be.equal(0);
                    server.close();
                    done();
                });
            });
        });

        it('should return one when one socket is connected', function (done) {
            var connection;
            var server = jsonet.createServer().on('connection', function (socket) {
                expect(socket).to.be.an.instanceof(jsonet.Socket);
                server.getConnections(function (err, count) {
                    expect(err).to.be.null;
                    expect(count).to.be.equal(1);
                    server.close();
                    connection.destroy();
                    done();
                });
            });
            server.listen(PORT, function () {
                connection = net.connect(PORT);
            });
        });

    });

    describe('#listen()', function () {

        it('should listen to generic port', function (done) {
            var server = jsonet.createServer();
            server.listen(function () {
                expect(server.address()).to.have.property('address', '0.0.0.0');
                server.close();
                done();
            });            
        });

        it('should listen to specific port', function (done) {
            var server = jsonet.createServer();
            server.listen(PORT, function () {
                expect(server.address()).to.have.property('address', '0.0.0.0');
                expect(server.address()).to.have.property('port', PORT);
                server.close();
                done();
            });
        });

        it('should return socket to connectionListener', function (done) {
            var connection;
            var server = jsonet.createServer(function (socket) {
                expect(socket).to.be.an.instanceof(jsonet.Socket);
                server.close();
                connection.destroy();
                done();
            });
            server.listen(PORT, function (socket) {
                connection = net.connect(PORT);
            });
        });

    });

    describe('Event #listening', function () {

        it('should emit listening event from tcp server', function (done) {
            var server = jsonet.createServer().on('listening', function () {
                expect(server.address()).to.have.property('address', '0.0.0.0');
                expect(server.address()).to.have.property('port', PORT);
                server.close();
                done();
            });
            server.listen(PORT);
        });

    });

    describe('Event #close', function () {

        it('should emit close event from tcp server', function (done) {
            var server = jsonet.createServer().on('close', function () {
                done();
            });
            server.listen(function () {
                expect(server.address()).to.have.property('address', '0.0.0.0');
                server.close();
            });
        });

    });

    describe('Event #error', function () {

        it('should emit error event from tcp server', function (done) {
            var server1 = jsonet.createServer();
            server1.listen(PORT, function () {
                var server2 = jsonet.createServer().on('error', function (e) {
                    expect(e).to.be.an.instanceof(Error);
                    server1.close();
                    done();
                });
                server2.listen(PORT);
            });
        });

    });

    describe('Event #connection', function () {

        it('should emit connection event from tcp server with valid socket', function (done) {
            var connection;
            var server = jsonet.createServer().on('connection', function (socket) {
                expect(socket).to.be.an.instanceof(jsonet.Socket);
                server.close();
                connection.destroy();
                done();
            });
            server.listen(PORT, function () {
                connection = net.connect(PORT);
            });
        });

    });

});