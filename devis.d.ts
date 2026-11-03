declare namespace devis {
	type Pattern = Record<string, unknown>;
	type Args = Record<string, any>;
	type Done = (err?: unknown, result?: unknown) => void;
	type Callback<T = any> = (err: any, result?: T) => void;
	/** Calls done(err, result), or takes only args and returns the result or a Promise of it. */
	type Handler = (args: any, done: Done) => unknown;

	interface Logger {
		info(message: string): void;
		error(message: string): void;
	}

	interface ListenOptions {
		host?: string;
		port?: number;
		path?: string;
	}

	interface ConnectOptions extends ListenOptions {
		/** Name used as clientId in call(). */
		id: string | number;
		/** Milliseconds before a pending call fails with "request timed out"; 0 disables it. Default 30000. */
		timeout?: number;
		/** Reconnect after a drop, waiting 1 s then up to 30 s between attempts. Default true. */
		reconnect?: boolean;
	}

	interface Devis {
		name: string;
		setName(name: string): this;
		setLogger(logger: Logger | null): this;
		push(pattern: Pattern, handler: Handler): this;
		call<T = any>(pattern: Pattern, args?: Args): Promise<T>;
		call<T = any>(pattern: Pattern, callback: Callback<T>): this;
		call<T = any>(pattern: Pattern, args: Args, callback: Callback<T>): this;
		listen(options: ListenOptions, callback?: Callback<string>): this;
		connect(options: ConnectOptions, callback?: Callback<string>): this;
		close(id: string | number): this;
		close(callback?: () => void): this;
		use(path: string): this;
		plug(name: string): this;
		log(): this;
	}
}

declare const devis: devis.Devis;
export = devis;
