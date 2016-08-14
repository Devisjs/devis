JavaScript Object Networking (jsonet)
======
[![Build Status](https://travis-ci.org/dotdecimal/jsonet.png?branch=master)](https://travis-ci.org/dotdecimal/jsonet)
[![Coverage Status](https://coveralls.io/repos/dotdecimal/jsonet/badge.png)](https://coveralls.io/r/dotdecimal/jsonet)

JavaScript Object Network messaging server/client for Node.js

This library provides a server and a socket class (with APIs that are very similar to the net package in Node.js) which communicate by sending each other JSON messages.

You "write" JSON objects to the socket, and the "message" events on the other end of the socket emits the JSON object you wrote.

## Installation

    $ npm install jsonet

## Example

``` javascript
var port = 8212;

// Create server
var server = jsonet.createServer(function (socket) {

	// Write messages received by server to console
	socket.on('message', function (message) {
		console.log(message);
		socket.write({
			boo: 'baz'
		});
	});
});

// Listen to port
server.listen(port, function () {

	// Connect to server with new client socket
	var client = jsonet.createSocket();
	
	// Write messages received by client to console
	client.on('message', function (message) {
		console.log(message);
	});
	
	// Connect and write message to server
	client.connect(port, function () {
		client.write({
			foo: 'bar'
		});
	});
});
```

## Factories

### jsonet.createServer([options], [connectionListener])
Creates a new TCP server. The ```connectionListener``` argument is automatically set as a listener for the 'connection' event.

See Node.js documentation for [net.createServer([options], [connectionListener])](http://nodejs.org/api/net.html#net_net_createserver_options_connectionlistener) for more details.

**TODO: Complete remaining Factory documentation**

## Server

### server.listen(port, [host], [backlog], [callback])
Begin accepting connections on the specified ```port``` and ```host```. If the ```host``` is omitted, the server will accept connections directed to any IPv4 address (```INADDR_ANY```). A port value of zero will assign a random port.

Backlog is the maximum length of the queue of pending connections. The actual length will be determined by your OS through sysctl settings such as ```tcp_max_syn_backlog``` and ```somaxconn``` on linux. The default value of this parameter is 511 (not 512).

This function is asynchronous. When the server has been bound, 'listening' event will be emitted. The last parameter callback will be added as an listener for the 'listening' event.

One issue some users run into is getting ```EADDRINUSE``` errors. This means that another server is already running on the requested port. One way of handling this would be to wait a second and then try again. 

See Node.js documentation for [server.listen(port, [host], [backlog], [callback])](http://nodejs.org/api/net.html#net_server_listen_port_host_backlog_callback) for more details.

**TODO: Complete remaining Server documentation**

## Socket

**TODO: Complete Socket documentation**

## Protocol

If you would like to implement the protocol yourself, the server will expect the following in order in the byte stream:

1. A 32-bit unsigned big-endian integer with 174021652 as the value. This is the protocol signature, if a message is sent without this signature a protocol error will be raised.
2. A 32-bit unsigned big-endian integer with the length of the message being sent as the value.
3. A UTF-8 string with the stringified JSON as the value (the message).