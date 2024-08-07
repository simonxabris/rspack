/**
 * The following code is from
 * https://github.com/webpack/loader-runner
 *
 * MIT Licensed
 * Author Tobias Koppers @sokra
 * Copyright (c) JS Foundation and other contributors
 * https://github.com/webpack/loader-runner/blob/main/LICENSE
 */

var LoaderLoadingError = require("./LoaderLoadingError");
/** @type {undefined | import('node:url')} */
var url;

// @ts-expect-error
module.exports = function loadLoader(loader, callback) {
	if (loader.type === "module") {
		try {
			if (url === undefined) url = require("url");
			var loaderUrl = url.pathToFileURL(loader.path);
			/** @type {Promise<any>} */
			var modulePromise = eval(
				"import(" + JSON.stringify(loaderUrl.toString()) + ")"
			);
			modulePromise.then(module => {
				handleResult(loader, module, callback);
			}, callback);
			return;
		} catch (e) {
			callback(e);
		}
	} else {
		try {
			var module = require(loader.path);
		} catch (e) {
			// it is possible for node to choke on a require if the FD descriptor
			// limit has been reached. give it a chance to recover.
			// @ts-expect-error
			if (e instanceof Error && e.code === "EMFILE") {
				// @ts-expect-error
				var retry = loadLoader.bind(null, loader, callback);
				if (typeof setImmediate === "function") {
					// node >= 0.9.0
					return setImmediate(retry);
				} else {
					// node < 0.9.0
					return process.nextTick(retry);
				}
			}
			return callback(e);
		}
		return handleResult(loader, module, callback);
	}
};

// @ts-expect-error
function handleResult(loader, module, callback) {
	if (typeof module !== "function" && typeof module !== "object") {
		return callback(
			new LoaderLoadingError(
				"Module '" +
					loader.path +
					"' is not a loader (export function or es6 module)"
			)
		);
	}
	loader.normal = typeof module === "function" ? module : module.default;
	loader.pitch = module.pitch;
	loader.raw = module.raw;
	if (
		typeof loader.normal !== "function" &&
		typeof loader.pitch !== "function"
	) {
		return callback(
			new LoaderLoadingError(
				"Module '" +
					loader.path +
					"' is not a loader (must have normal or pitch function)"
			)
		);
	}
	callback();
}
