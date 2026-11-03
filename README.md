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

devis.push({ role: "math", cmd: "sum" }, async ({ left, right }) => left + right);

devis.push({ role: "math", cmd: "divide" }, async ({ left, right }) => {
    if (right === 0) throw new Error("division by zero");
    return left / right;
});

devis.listen({ host: "127.0.0.1", port: 3030 });
```

`client.js` connects to it and calls both:

```javascript
const devis = require("devis");

devis.setName("client").connect({ id: "math", host: "127.0.0.1", port: 3030 }, async () => {
    console.log(await devis.call({ clientId: "math", role: "math", cmd: "sum" }, { left: 1, right: 2 })); // 3

    try {
        await devis.call({ clientId: "math", role: "math", cmd: "divide" }, { left: 1, right: 0 });
    } catch (err) {
        console.log(err.message); // division by zero
    }
    devis.close();
});
```

```bash
node math.js
node client.js   # in another terminal
```

`clientId` is the `id` given to `connect`: it tells Devis which connection to send the call to.

## Handlers

A handler either returns its result (or a Promise of it), or calls `done(err, result)`:

```javascript
devis.push({ role: "users", cmd: "get" }, async ({ id }) => db.users.findOne({ id }));

devis.push({ role: "users", cmd: "count" }, (args, done) => {
    db.users.count((err, count) => done(err, count));
});
```

A handler that takes only `args` is treated as returning its result. A thrown error or a rejected Promise reaches the caller as an error, locally or over the network.

## Calls

`call` returns a Promise when no callback is given. With a callback, it returns the instance so calls can be chained:

```javascript
const user = await devis.call({ role: "users", cmd: "get" }, { id: 1 });

devis.call({ role: "users", cmd: "get" }, { id: 1 }, (err, user) => { /* ... */ });
```

Calls on the same connection run in parallel: a slow handler does not delay the others.

## How matching works

* A call matches a handler when its pattern has the **same keys and values**. Key order does not matter, but `{ role: "math" }` does not match `{ role: "math", cmd: "sum" }`.
* Registering the same pattern twice throws `This pattern already exists`.
* Calling a pattern nobody registered fails with `No handle found`: the Promise rejects, or the call throws when a callback is given. On a remote service, the error is sent back to the caller and the service keeps running.
* `require("devis")` returns one instance per process, so every file of a service shares the same patterns.

## Failures and timeouts

A remote call fails instead of waiting forever:

| Error | When |
| --- | --- |
| `request timed out` | No answer within the connection `timeout` (30 s by default, `0` disables it). |
| `connection closed` | The connection dropped while the call was waiting. The next call reconnects. |
| `No transport found` | No connection was opened with this `clientId`. |

```javascript
devis.connect({ id: "payments", host: "payments", port: 3030, timeout: 2000 });
```

## Recipes

### Call a handler in the same process

```javascript
const devis = require("devis");

devis.push({ role: "greeter", cmd: "hello" }, async ({ name }) => "Hello " + name);

console.log(await devis.call({ role: "greeter", cmd: "hello" }, { name: "Ada" })); // Hello Ada
```

### Split a service into modules

Export the instance from a module, then load its patterns with `use` (the path is relative to the calling file):

```javascript
// services/users.js
const devis = require("devis");

devis.push({ role: "users", cmd: "get" }, async ({ id }) => ({ id, name: "Ada" }));

module.exports = devis;
```

```javascript
// index.js
const devis = require("devis").use("./services/users");

devis.call({ role: "users", cmd: "get" }, { id: 1 }).then((user) => {
    console.log(user); // { id: 1, name: 'Ada' }
});
```

### Use a Unix socket or a named pipe

`listen` and `connect` take the same options as Node.js `net`, so pass `path` instead of `host` and `port`:

```javascript
// server
devis.push({ role: "ping" }, async () => "pong");
devis.listen({ path: "/tmp/devis-math.sock" });  // Windows: { path: "\\\\.\\pipe\\devis-math" }
```

```javascript
// client
devis.connect({ id: "local", path: "/tmp/devis-math.sock" }, async () => {
    console.log(await devis.call({ clientId: "local", role: "ping" })); // pong
});
```

### Shut down cleanly

`close()` without an id closes every connection and server, then calls back once the ports are released:

```javascript
process.on("SIGTERM", () => devis.close(() => process.exit(0)));
```

### Send logs elsewhere, or silence them

Devis logs connections and errors to the console. Pass any object with `info` and `error` methods, such as pino or winston, or `null` to silence it:

```javascript
devis.setLogger(pino());
devis.setLogger(null);
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

async function main() {
    await devis.call({ role: "mongodb", action: "connect" }, { url: "mongodb://localhost:27017/shop" });
    await devis.call({ role: "mongodb", action: "insert" }, { collection: "books", type: "many", data: [{ title: "Dune" }, { title: "Hyperion" }], close: false });
    const books = await devis.call({ role: "mongodb", action: "find" }, { collection: "books", query: {} });
    console.log(books.map((book) => book.title)); // [ 'Dune', 'Hyperion' ]
}

main();
```

More runnable examples, including Redis and RabbitMQ, are in [Devis-Examples](https://github.com/Devisjs/Devis-Examples). To start a new project, use [generator-devis](https://github.com/Devisjs/generator-devis).

## TypeScript

Types ship with the package:

```typescript
import devis = require("devis");

const sum = await devis.call<number>({ role: "math", cmd: "sum" }, { left: 1, right: 2 });
```

## API

| Method | Description |
| --- | --- |
| `push(pattern, handler)` | Registers `handler` for `pattern`. The handler returns its result or calls `done(err, result)`. |
| `call(pattern, [args], [callback])` | Calls the handler matching `pattern` with `args` (default `{}`). Returns a Promise without `callback`. Add `clientId` to the pattern to call a remote service. |
| `listen(options, [callback])` | Exposes the registered patterns. `options` are `net` options: `{ host, port }` or `{ path }`. |
| `connect(options, [callback])` | Connects to a remote service. `options.id` is required and unique; it is the `clientId` used by `call`. `options.timeout` is in milliseconds. |
| `close([id])`, `close([callback])` | Closes the connection `id`, or every connection and server. |
| `use(path)` | Loads the patterns of a module exporting a Devis instance, relative to the calling file. |
| `plug(name)` | Loads the patterns of an installed plugin. |
| `setName(name)` | Names the instance; used in logs and in `log()`. |
| `setLogger(logger)` | Sends logs to `logger.info` and `logger.error`; `null` silences them. |
| `log()` | Writes the local patterns to `<name>-log.txt`. |

Every method except a callback-less `call` returns the instance, so calls can be chained.

## Upgrading from 3.x

* `call` without a callback returns a Promise, and handlers can be `async`.
* Pattern key order no longer matters.
* Calls on one connection run in parallel. They fail with `request timed out` after 30 s by default, and with `connection closed` when the connection drops; in 3.x they waited forever.
* A remote result of `0`, `""` or `null` reaches the caller. In 3.x it was reported as `No handle found`.
* `call` no longer removes `clientId` from the pattern object you pass, nor adds fields to your `args`.
* A call to an unknown `clientId` fails with `No transport found` instead of `No handle found`.
* `usePath` and `getFunctions` are removed. `usePath` only worked on Wakanda Server.
* The wire format is unchanged: 3.x and 4.x services and clients can talk to each other. Over the wire, a 3.x service still matches keys in order.

## Upgrading from 2.x

* Node.js 22 or later is required.
* devisPattern 2 is plain JavaScript, so CMake and a C++ toolchain are no longer needed to install Devis.
* Each microservice now has its own pattern table. In 2.x, two matchers in the same process could resolve each other's patterns to the wrong handler.

## License

MIT
