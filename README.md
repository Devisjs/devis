# Devis       


<img  src="https://8zzp5w.dm2302.livefilestore.com/y3mfmEBf29sGXflOWN_Hk0yFy3debRCUbdQiTEuttJh0bAg3axpzhmJspRFdOnaLwKylPPYewtA8M-z1_RO2YgjBkOU75s18kvWdqPeT5z7wXXdjKBu3tPeKu4L_FFGn_R5UKIH6LspIBhy-JMYBVT6vT0GusOzoPkbBdXGxN0rnNk?width=600&height=600&cropmode=none" href="http://devisjs.surge.sh" width="250" />

>A microservices framework for Node.js

<p align="center">
  <a href="https://www.npmjs.com/package/devis"><img src="https://img.shields.io/npm/dt/devis.svg" alt="Downloads"></a>
  <a href="https://www.npmjs.com/package/devis"><img src="https://img.shields.io/npm/v/devis.svg" alt="Version"></a>
  <a href="https://www.npmjs.com/package/devis"><img src="https://img.shields.io/npm/l/devis.svg" alt="License"></a>
<a href="http://travis-ci.org/Devisjs/devis"><img src="https://travis-ci.org/Devisjs/devis.svg?branch=master" alt=""></a>
  <a href="https://www.bithound.io/github/Devisjs/devis"><img src="https://www.bithound.io/github/Devisjs/devis/badges/score.svg" alt="bitHound Overall Score"></a>
  <br>
  
  
</p>

Devis is a framework for writing microservices and organizing the business logic of your app. You can break down your app into "stuff that happens", rather than focusing on data models or managing dependencies.

Devis provides:

- **pattern matching:** a wonderfully flexible way to handle business requirements

- **transport independence:** how messages get to the right server is not something you should have to worry about

Use this module to define commands that work by taking in some JSON, and, optionally, returning some JSON. The command to run is selected by pattern-matching on the the input JSON. There are built-in and optional sets of commands that help you build Minimum Viable Products: data storage, user management, distributed logic, caching, logging, etc. And you can define your own product by breaking it into a set of commands - "stuff that happens". That's pretty much it.

**Requirements:**

*Remember* that Devis is based on devispattern that is an addon written in c ++.


It's necessary, before using Devis to install:
- [CMake](http://www.cmake.org/download/)(*.msi version for windows: You must check the addition of the path for all users, And restart your computer after installation)
- A proper C/C++ compiler toolchain of the given platform
    - **Windows**:
        - [Visual C++ Build Tools](http://landinghub.visualstudio.com/visual-cpp-build-tools)
        or a recent version of Visual C++ will do ([the free Community](https://www.visualstudio.com/products/visual-studio-community-vs) version works well)             
    - **Unix/linux-gnu**:
        - Clang or GCC
        - Ninja or Make (Ninja will be picked if both present)
        - Xcode with command line tools if you are under **mac os**
        
## Install

To install, simply use npm.

```
npm install devis
```

### Example:

-**plugin.js**:

```javascript

var devis=require("devis");

devis.add({
  action: 'game',
  cmd:'play'
}, function(args,done) {

  done(null,args.name+" is playing game now");
});
devis.add({
  action: 'game',
  cmd:'pause'
}, function(args, done) {

  done(null,args.name+" pause the game");
});


module.exports = devis;
```

-**index.js**:

```javascript
let devis=require("devis");
devis.act({ action: 'game', cmd: 'pause' },{name:"foo"}, function (err, result) {
  if (err) throw err;
  console.log(result);
});


devis.act({action: 'gamer', cmd: 'play' },{name:"foo"}, function (err, result) {
  if (err) throw err;
  console.log(result);
})
```

In this code,

The `devis.add` method adds a new pattern, and the function to execute whenever that pattern occurs.

The `devis.act` method accepts an object, and runs the command, if any, that matches.

This is a _very convenient way of combining a pattern and parameter data_.

# Use network

Devis makes this really easy. Let's put configuration out on the network into its own process:

-**core.js**:

```javascript
var devis=require("devis");

devis.add({
  action: 'game',
  cmd:'play'
}, function(args,done) {

  done(null,{ result: 'play' });
});
devis.add({
  action: 'game',
  cmd:'pause'
}, function(args, done) {

  done(null,{ result: 'pause' });
});
```

-**server.js**:

```javascript
var devis=require("devis");
devis.use("./core")
.listen({
  host:'127.0.0.1',
  port:3030
})
```
![alt tag](https://scontent-mrs1-1.xx.fbcdn.net/v/t1.0-9/14064278_10207296496633095_6807725511734547690_n.jpg?oh=eff0d8e8ec9bac59b82d0e20af45b6d8&oe=584F240F)

The `listen` method starts a web server that listens for JSON messages. When these arrive, they are submitted to the local Devis instance, and executed as actions in the normal way. The result is then returned to the client. You can use Http,Tcp,Unix Socket or Named Pipes.

The client code looks like this:

-**Client.js**:

```javascript
var devis=require("devis")
.client({
  host:'127.0.0.1',
  port:3030,
  id:1
}).setName('client');

devis.act({ clientId:1,action: 'game', cmd: 'play' }, function (err,result) {
    if (err) throw err;
    console.log(result);
});

devis.act({clientId:1,action: 'game', cmd: 'pause' }, function (err,result) {
    if (err) throw err;
    console.log(result);
});
```
![alt tag](https://scontent-mrs1-1.xx.fbcdn.net/v/t1.0-9/14063796_10207296496553093_5124476474447040595_n.jpg?oh=d8374fc6176cfd662fa84dbddbe187e9&oe=58486A3C)

On the client-side, calling `devis.client()` means that Devis will send any actions it cannot match locally out over the network. In this case, the configuration server will match the `action: 'game', cmd: 'play'` and `action: 'game', cmd: 'pause'` pattern and return the configuration data.

It's imperative to define a unique identifier for each Microservice consumed as client and add the ClientId when calling each remote propertie

###Other examples:
we will take the previous example and add a Unix socket (UNIX or GNU/LINUX) and a Named Pipes (WINDOWS) instead of HTTP or TCP:

-**Unix socket**:
```javascript
//server side:
devis.listen({path:'/tmp/mysoscket.sock'});
//Client side:
devis.client({id:1, path:'/tmp/mysoscket.sock'}).setName("client");
```
-**Named pipes**:
```javascript
//Server side:
devis.listen({path:'\\\\\.\\pipe\\mynamedpipe'});
//Client side:
devis.client({id:1, path:'\\\\\.\\pipe\\mynamedpipe'}).setName("client");
```
