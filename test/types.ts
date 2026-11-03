// Compiled with tsc --noEmit: a wrong declaration in devis.d.ts breaks npm test.
import devis = require("../devis");

devis.setName("math").setLogger(null).push({ role: "math", cmd: "sum" }, (args, done) => {
	done(null, args.left + args.right);
});

devis.push({ role: "users", cmd: "get" }, async (args) => ({ id: args.id }));

async function main(): Promise<number> {
	const sum: number = await devis.call<number>({ role: "math", cmd: "sum" }, { left: 1, right: 2 });
	return sum;
}

devis.connect({ id: "math", host: "127.0.0.1", port: 3030, timeout: 5000 }, (err) => {
	devis.call({ clientId: "math", role: "math", cmd: "sum" }, { left: 1, right: 2 }, (err, result) => result).close("math");
});

devis.connect({ id: "users", path: "/tmp/users.sock", reconnect: false });
devis.call({ role: "users", cmd: "get" }, { id: 1 }).then((user) => user);

devis.listen({ path: "/tmp/devis.sock" }).close(() => main());

// @ts-expect-error connect needs an id, used as clientId.
devis.connect({ host: "127.0.0.1", port: 3030 });

// @ts-expect-error patterns are objects.
devis.push("math", () => undefined);

// @ts-expect-error a call without callback returns a Promise, not the instance.
devis.call({ role: "math" }).setName("x");

// @ts-expect-error reconnect is a boolean.
devis.connect({ id: "math", port: 3030, reconnect: 1 });
