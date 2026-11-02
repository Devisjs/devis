# Devis
 <img  src="https://avatars3.githubusercontent.com/u/21971184?v=4&amp;s=200" href="http://devisjs.surge.sh" width="250" />

>A microservices framework for Node.js

<p align="center">
  <a href="https://www.npmjs.com/package/devis"><img src="https://img.shields.io/npm/v/devis.svg" alt="Version"></a>
  <a href="https://www.npmjs.com/package/devis"><img src="https://img.shields.io/npm/l/devis.svg" alt="License"></a>
  <a href="https://github.com/Devisjs/devis/actions/workflows/ci.yml"><img src="https://github.com/Devisjs/devis/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
</p>

A microservice registers handlers under **patterns** (plain objects). Callers send a pattern and arguments; Devis routes the call to the matching handler, in the same process or over TCP, a Unix socket or a named pipe. Moving a service out of process does not change the calling code beyond adding `clientId`.

```bash
npm install devis
```

Node.js 22 or later is required.

## Quick start: a service and a client over TCP

`math.js` registers two handlers and listens on port 3030:

```javascript
const devis = require("devis");

devis.setName("math");

devis.push({ role: "math", cmd: "sum" }, (args, done) => {
    done(null, args.left + args.right);
});

devis.push({ role: "math", cmd: "divide" }, (args, done) => {
    if (args.right === 0) return done("division by zero");
    done(null, args.left / args.right);
});

devis.listen({ host: "127.0.0.1", port: 3030 });
```

`client.js` connects to it and calls both:

```javascript
const devis = require("devis");

devis.setName("client").connect({ id: "math", host: "127.0.0.1", port: 3030 }, () => {
    devis.call({ clientId: "math", role: "math", cmd: "sum" }, { left: 1, right: 2 }, (err, result) => {
        console.log(result); // 3

        devis.call({ clientId: "math", role: "math", cmd: "divide" }, { left: 1, right: 0 }, (err) => {
            console.log(err); // division by zero
            devis.close("math");
        });
    });
});
```

```bash
node math.js
node client.js   # in another terminal
```

`clientId` is the `id` given to `connect`: it tells Devis which connection to send the call to.

## How matching works

* A call matches a handler only when its pattern is **identical**: same keys, same values, same key order. `{ role: "math" }` does not match `{ role: "math", cmd: "sum" }`.
* Registering the same pattern twice throws `This pattern already exists`.
* Calling a pattern nobody registered throws `No handle found`.
* `require("devis")` returns one instance per process, so every file of a service shares the same patterns.

## Recipes

### Call a handler in the same process

```javascript
const devis = require("devis");

devis.push({ role: "greeter", cmd: "hello" }, (args, done) => {
    done(null, "Hello " + args.name);
});

devis.call({ role: "greeter", cmd: "hello" }, { name: "Ada" }, (err, result) => {
    console.log(result); // Hello Ada
});
```

### Split a service into modules

Export the instance from a module, then load its patterns with `use` (the path is relative to the calling file):

```javascript
// services/users.js
const devis = require("devis");

devis.push({ role: "users", cmd: "get" }, (args, done) => {
    done(null, { id: args.id, name: "Ada" });
});

module.exports = devis;
```

```javascript
// index.js
const devis = require("devis").use("./services/users");

devis.call({ role: "users", cmd: "get" }, { id: 1 }, (err, user) => {
    console.log(user); // { id: 1, name: 'Ada' }
});
```

### Use a Unix socket or a named pipe

`listen` and `connect` take the same options as Node.js `net`, so pass `path` instead of `host` and `port`:

```javascript
// server
devis.push({ role: "ping" }, (args, done) => done(null, "pong"));
devis.listen({ path: "/tmp/devis-math.sock" });  // Windows: { path: "\\\\.\\pipe\\devis-math" }
```

```javascript
// client
devis.connect({ id: "local", path: "/tmp/devis-math.sock" }, () => {
    devis.call({ clientId: "local", role: "ping" }, {}, (err, result) => {
        console.log(result); // pong
    });
});
```

### Add storage or messaging with a plugin

`plug` loads the patterns of an installed plugin:

| Plugin | Patterns |
| --- | --- |
| [devis-mongo-client](https://github.com/Devisjs/devis-mongo-client) | `{ role: "mongodb", action: "connect" \| "insert" \| "find" \| "update" \| "delete" \| ... }` |
| [devis-pub_sub-redis](https://github.com/Devisjs/devis-pub_sub-redis) | `{ role: "pub" \| "sub", action: "create" }`, `{ transport: "pub/sub", action: "subscribe" \| "pubslish" }` |
| [devis_rabbitmq](https://github.com/Devisjs/devis_rabbitmq) | adds `listenMQ`, `clientMQ` and `callMQ` to call services through RabbitMQ |

```bash
npm install devis devis-mongo-client
```

```javascript
const devis = require("devis").plug("devis-mongo-client");

function call(action, args) {
    return new Promise((resolve, reject) => {
        devis.call({ role: "mongodb", action }, args, (err, res) => (err ? reject(err) : resolve(res)));
    });
}

async function main() {
    await call("connect", { url: "mongodb://localhost:27017/shop" });
    await call("insert", { collection: "books", type: "many", data: [{ title: "Dune" }, { title: "Hyperion" }], close: false });
    const books = await call("find", { collection: "books", query: {} });
    console.log(books.map((book) => book.title)); // [ 'Dune', 'Hyperion' ]
}

main();
```

More runnable examples, including Redis and RabbitMQ, are in [Devis-Examples](https://github.com/Devisjs/Devis-Examples). To start a new project, use [generator-devis](https://github.com/Devisjs/generator-devis).

## API

| Method | Description |
| --- | --- |
| `push(pattern, handler)` | Registers `handler(args, done)` for `pattern`. Call `done(err, result)` to answer. |
| `call(pattern, [args], callback)` | Calls the handler matching `pattern` with `args` (default `{}`). Add `clientId` to the pattern to call a remote service. `callback(err, result)`. |
| `listen(options, [callback])` | Exposes the registered patterns. `options` are `net` options: `{ host, port }` or `{ path }`. |
| `connect(options, [callback])` | Connects to a remote service. `options.id` is required and unique; it is the `clientId` used by `call`. |
| `close(id)` | Closes the connection `id`. |
| `use(path)` | Loads the patterns of a module exporting a Devis instance, relative to the calling file. |
| `plug(name)` | Loads the patterns of an installed plugin. |
| `setName(name)` | Names the instance; used in logs and in `log()`. |
| `log()` | Writes the local patterns to `<name>-log.txt`. |

Every method returns the instance, so calls can be chained.

## Upgrading from 2.x

* Node.js 22 or later is required.
* devisPattern 2 is plain JavaScript, so CMake and a C++ toolchain are no longer needed to install Devis.
* Each microservice now has its own pattern table. In 2.x, two matchers in the same process could resolve each other's patterns to the wrong handler.
* An error returned by a remote handler now reaches the caller's callback. In 2.x and 3.0.0 the client treated it as a missing pattern and threw `No handle found`.

## License

MIT
