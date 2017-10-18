# Devis       


<img  src="https://avatars3.githubusercontent.com/u/21971184?v=4&amp;s=200" href="http://devisjs.surge.sh" width="250" />

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

# Running a PM2 instance with Devis
<div align="center">
  <a href="http://pm2.keymetrics.io">
    <img width=710px src="https://github.com/unitech/pm2/raw/master/pres/pm2.20d3ef.png">
  </a>

<br/>
</div>
PM2 is a production process manager for Node.js applications with a built-in load balancer. It allows you to keep applications alive forever, to reload them without downtime and to facilitate common system admin tasks.

-**Install pm2**:
```bash
$ npm install pm2 -g
```

-**Start the microservice with pm2**:
Let's go back to the previous example, Instead of running the command line: 
```bash
$ node server.js 
```

We will run the following command:
```bash
$ pm2 start app.js
```

### Commands overview

```bash
# General
$ npm install pm2 -g            # Install PM2
$ pm2 start app.js              # Start, Daemonize and auto-restart application (Node)
$ pm2 start app.py              # Start, Daemonize and auto-restart application (Python)
$ pm2 start npm -- start        # Start, Daemonize and auto-restart Node application

# Cluster Mode (Node.js only)
$ pm2 start app.js -i 4         # Start 4 instances of application in cluster mode
                                # it will load balance network queries to each app
$ pm2 reload all                # Zero Second Downtime Reload
$ pm2 scale [app-name] 10       # Scale Cluster app to 10 process

# Process Monitoring
$ pm2 list                      # List all processes started with PM2
$ pm2 monit                     # Display memory and cpu usage of each app
$ pm2 show [app-name]           # Show all informations about application

# Log management
$ pm2 logs                      # Display logs of all apps
$ pm2 logs [app-name]           # Display logs for a specific app
$ pm2 logs --json               # Logs in JSON format
$ pm2 flush
$ pm2 reloadLogs

# Process State Management
$ pm2 start app.js --name="api" # Start application and name it "api"
$ pm2 start app.js -- -a 34     # Start app and pass option "-a 34" as argument
$ pm2 start app.js --watch      # Restart application on file change
$ pm2 start script.sh           # Start bash script
$ pm2 start app.json            # Start all applications declared in app.json
$ pm2 reset [app-name]          # Reset all counters
$ pm2 stop all                  # Stop all apps
$ pm2 stop 0                    # Stop process with id 0
$ pm2 restart all               # Restart all apps
$ pm2 gracefulReload all        # Graceful reload all apps in cluster mode
$ pm2 delete all                # Kill and delete all apps
$ pm2 delete 0                  # Delete app with id 0

# Startup/Boot management
$ pm2 startup                   # Detect init system, generate and configure pm2 boot on startup
$ pm2 save                      # Save current process list
$ pm2 resurrect                 # Restore previously save processes
$ pm2 unstartup                 # Disable and remove startup system

$ pm2 update                    # Save processes, kill PM2 and restore processes
$ pm2 generate                  # Generate a sample json configuration file

# Deployment
$ pm2 deploy app.json prod setup    # Setup "prod" remote server
$ pm2 deploy app.json prod          # Update "prod" remote server
$ pm2 deploy app.json prod revert 2 # Revert "prod" remote server by 2

# Module system
$ pm2 module:generate [name]    # Generate sample module with name [name]
$ pm2 install pm2-logrotate     # Install module (here a log rotation system)
$ pm2 uninstall pm2-logrotate   # Uninstall module
$ pm2 publish                   # Increment version, git push and npm publish
```
**Click on the picture for more information**<a href="https://github.com/Unitech/pm2">
  <img width=70px src="https://github.com/unitech/pm2/raw/master/pres/pm2.20d3ef.png">
</a>