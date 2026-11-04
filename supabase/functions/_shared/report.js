// node_modules/zod/v4/core/util.js
function e(e) {
	let t = Object.values(e).filter((e) => typeof e == "number");
	return Object.entries(e).filter(([e, n]) => t.indexOf(+e) === -1).map(([e, t]) => t);
}
function t(e, t = "|") {
	return e.map((e) => ue(e)).join(t);
}
function n(e, t) {
	return typeof t == "bigint" ? t.toString() : t;
}
var r = class {
	constructor(e) {
		this._getter = e, this._value = void 0;
	}
	get value() {
		let e = this._getter;
		return e !== void 0 && (this._value = e(), this._getter = void 0), this._value;
	}
};
function i(e) {
	return new r(e);
}
function a(e) {
	return e == null;
}
function o(e) {
	let t = +!!e.startsWith("^"), n = e.endsWith("$") ? e.length - 1 : e.length;
	return e.slice(t, n);
}
function s(e, t) {
	let n = e / t, r = Math.round(n), i = 4 * 2 ** -52 * Math.max(Math.abs(n), 1);
	return Math.abs(n - r) < i ? 0 : n - r;
}
var c = /* @__PURE__*/ Symbol("evaluating");
function l(e, t, n) {
	let r;
	Object.defineProperty(e, t, {
		get() {
			if (r !== c) return r === void 0 && (r = c, r = n()), r;
		},
		set(n) {
			Object.defineProperty(e, t, { value: n });
		},
		configurable: !0
	});
}
function u(e, t, n) {
	Object.defineProperty(e, t, {
		value: n,
		writable: !0,
		enumerable: !0,
		configurable: !0
	});
}
function d(e) {
	let t = Object.getOwnPropertyDescriptor(e, "shape");
	return t?.get ? t.get.raw : t?.value;
}
function f(e) {
	return d(e._zod.def) ?? e._zod.def.shape;
}
function p(e, t, n) {
	Object.defineProperty(e, t, {
		get() {
			let e = n();
			return u(this, t, e), e;
		},
		enumerable: !0,
		configurable: !0
	});
}
function m(e, t, n) {
	t in e ? u(e, t, n) : e[t] = n;
}
function h(e, t, n, r) {
	let i = f(t);
	for (let a of n) {
		let n = Object.getOwnPropertyDescriptor(i, a);
		n.enumerable && (n.get ? p(e, a, () => {
			let e = t._zod.def.shape[a];
			return r ? r(e, a) : e;
		}) : m(e, a, r ? r(n.value, a) : n.value));
	}
}
function ee(e, t) {
	for (let n of Reflect.ownKeys(t)) {
		let r = Object.getOwnPropertyDescriptor(t, n);
		r.enumerable && (r.get ? p(e, n, () => t[n]) : m(e, n, r.value));
	}
}
function g(...e) {
	let t = {};
	for (let n of e) {
		let e = Object.getOwnPropertyDescriptors(n);
		Object.assign(t, e);
	}
	return Object.defineProperties({}, t);
}
function te(e) {
	return JSON.stringify(e);
}
function ne(e) {
	return e.toLowerCase().trim().replace(/[^\w\s-]/g, "").replace(/[\s_-]+/g, "-").replace(/^-+|-+$/g, "");
}
var re = "captureStackTrace" in Error ? Error.captureStackTrace : (...e) => {};
function ie(e) {
	return typeof e == "object" && !!e && !Array.isArray(e);
}
var ae = /* @__PURE__*/ i(() => {
	if (T.jitless || typeof navigator < "u" && navigator?.userAgent?.includes("Cloudflare")) return !1;
	try {
		return Function(""), !0;
	} catch {
		return !1;
	}
});
function oe(e) {
	if (ie(e) === !1) return !1;
	let t = e.constructor;
	if (t === void 0 || typeof t != "function") return !0;
	let n = t.prototype;
	return ie(n) !== !1 && Object.prototype.hasOwnProperty.call(n, "isPrototypeOf") !== !1;
}
function se(e) {
	return oe(e) ? { ...e } : Array.isArray(e) ? [...e] : e instanceof Map ? new Map(e) : e instanceof Set ? new Set(e) : e;
}
var ce = /* @__PURE__*/ new Set([
	"string",
	"number",
	"symbol"
]);
function le(e) {
	return e.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function _(e, t, n) {
	let r = new e._zod.constr(t ?? e._zod.def);
	return (!t || n?.parent) && (r._zod.parent = e), r;
}
function v(e) {
	let t = e;
	if (!t) return {};
	if (typeof t == "string") return { error: () => t };
	if (t?.message !== void 0) {
		if (t?.error !== void 0) throw Error("Cannot specify both `message` and `error` params");
		t.error = t.message;
	}
	return delete t.message, typeof t.error == "string" ? {
		...t,
		error: () => t.error
	} : t;
}
function ue(e) {
	return typeof e == "bigint" ? e.toString() + "n" : typeof e == "string" ? `"${e}"` : `${e}`;
}
function de(e) {
	return Object.keys(e).filter((t) => e[t]._zod.optin !== void 0 && e[t]._zod.optout === "optional");
}
var fe = {
	safeint: [-(2 ** 53 - 1), 2 ** 53 - 1],
	int32: [-2147483648, 2147483647],
	uint32: [0, 4294967295],
	float32: [-34028234663852886e22, 34028234663852886e22],
	float64: [-Number.MAX_VALUE, Number.MAX_VALUE]
}, pe = {
	int64: [/* @__PURE__*/ BigInt("-9223372036854775808"), /* @__PURE__*/ BigInt("9223372036854775807")],
	uint64: [/* @__PURE__*/ BigInt(0), /* @__PURE__*/ BigInt("18446744073709551615")]
};
function me(e, t) {
	let n = e._zod.def, r = n.checks;
	if (r && r.length > 0) throw Error(".pick() cannot be used on object schemas containing refinements");
	let i = {};
	return h(i, e, he(e, t)), _(e, g(n, {
		shape: i,
		checks: []
	}));
}
function he(e, t) {
	let n = f(e), r = [];
	for (let e of Reflect.ownKeys(t)) {
		if (!Object.getOwnPropertyDescriptor(n, e)?.enumerable) throw Error(`Unrecognized key: "${String(e)}"`);
		t[e] && r.push(e);
	}
	return r;
}
function ge(e, t) {
	let n = e._zod.def, r = n.checks;
	if (r && r.length > 0) throw Error(".omit() cannot be used on object schemas containing refinements");
	let i = new Set(he(e, t)), a = {};
	return h(a, e, Reflect.ownKeys(f(e)).filter((e) => !i.has(e))), _(e, g(n, {
		shape: a,
		checks: []
	}));
}
function _e(e, t) {
	if (!oe(t)) throw Error("Invalid input to extend: expected a plain object");
	let n = e._zod.def.checks;
	if (n && n.length > 0) {
		let n = f(e);
		for (let e of Reflect.ownKeys(t)) if (Object.getOwnPropertyDescriptor(n, e) !== void 0) throw Error("Cannot overwrite keys on object schemas containing refinements. Use `.safeExtend()` instead.");
	}
	return _(e, g(e._zod.def, { shape: ve(e, t) }));
}
function ve(e, t) {
	let n = {};
	return h(n, e, Reflect.ownKeys(f(e))), ee(n, t), n;
}
function ye(e, t) {
	if (!oe(t)) throw Error("Invalid input to safeExtend: expected a plain object");
	return _(e, g(e._zod.def, { shape: ve(e, t) }));
}
function be(e, t) {
	if (!t?._zod?.def) throw Error("Invalid input to merge: expected an object schema. To merge a plain shape, use `.extend()`.");
	if (e._zod.def.checks?.length) throw Error(".merge() cannot be used on object schemas containing refinements. Use .safeExtend() instead.");
	let n = {};
	return h(n, e, Reflect.ownKeys(f(e))), h(n, t, Reflect.ownKeys(f(t))), _(e, g(e._zod.def, {
		shape: n,
		get catchall() {
			return t._zod.def.catchall;
		},
		checks: t._zod.def.checks ?? []
	}));
}
function xe(e, t, n, r = "partial") {
	let i = t._zod.def.checks;
	if (i && i.length > 0) throw Error(`.${r}() cannot be used on object schemas containing refinements`);
	let a = n ? new Set(he(t, n)) : void 0, o = {};
	return h(o, t, Reflect.ownKeys(f(t)), e && ((t, n) => a && !a.has(n) ? t : new e({
		type: "optional",
		innerType: t
	}))), _(t, g(t._zod.def, {
		shape: o,
		checks: []
	}));
}
function Se(e, t, n) {
	let r = n ? new Set(he(t, n)) : void 0, i = {};
	return h(i, t, Reflect.ownKeys(f(t)), (t, n) => r && !r.has(n) ? t : new e({
		type: "nonoptional",
		innerType: t
	})), _(t, g(t._zod.def, { shape: i }));
}
function y(e, t = 0) {
	if (e.aborted === !0) return !0;
	for (let n = t; n < e.issues.length; n++) if (e.issues[n]?.continue !== !0) return !0;
	return !1;
}
function Ce(e, t = 0) {
	if (e.aborted === !0) return !0;
	for (let n = t; n < e.issues.length; n++) if (e.issues[n]?.continue === !1) return !0;
	return !1;
}
function we(e, t) {
	return t.map((t) => {
		var n;
		return (n = t).path ?? (n.path = []), t.path.unshift(e), t;
	});
}
function Te(e) {
	return typeof e == "string" ? e : e?.message;
}
function Ee(e) {
	let t = [];
	for (let n of e ?? []) {
		let e = n._zod.def;
		if (!/_(length|size)$|_equals$/.test(e.check)) break;
		let r = e.maximum ?? e.length ?? e.size;
		r >= 0 && t.push([r, n]);
	}
	return t;
}
function De(e, t, n) {
	var r;
	for (let i = t; i < e.length; i++) (r = e[i]).schema ?? (r.schema = n);
}
function Oe(e, t, n) {
	var r;
	let i = e.inst?._zod?.traits;
	i?.has("$ZodType") && (i.has("$ZodCheck") ? (r = e).schema ?? (r.schema = e.inst) : e.schema = e.inst);
	let a = e.schema === e.inst ? void 0 : e.schema?._zod.def?.error, o = e.message ? e.message : Te(e.inst?._zod.def?.error?.(e)) ?? Te(a?.(e)) ?? Te(t?.error?.(e)) ?? Te(n.customError?.(e)) ?? Te(n.localeError?.(e)) ?? "Invalid input", s = {};
	for (let t of Object.keys(e)) t !== "inst" && t !== "schema" && t !== "continue" && t !== "input" && t !== "__proto__" && (s[t] = e[t]);
	return s.path ??= [], s.message = o, t?.reportInput && (s.input = e.input), s;
}
var ke = /[\uD800-\uDBFF]/;
function Ae(e) {
	let t = e.length;
	if (!ke.test(e)) return t;
	let n = t;
	for (let r = 0; r < t - 1; r++) (e.charCodeAt(r) & 64512) == 55296 && (e.charCodeAt(r + 1) & 64512) == 56320 && (n--, r++);
	return n;
}
function je(e) {
	return Array.isArray(e) ? "array" : typeof e == "string" ? "string" : "unknown";
}
function Me(e) {
	let t = typeof e;
	switch (t) {
		case "number": return Number.isNaN(e) ? "nan" : "number";
		case "object": {
			if (e === null) return "null";
			if (Array.isArray(e)) return "array";
			let t = e;
			if (t && Object.getPrototypeOf(t) !== Object.prototype && "constructor" in t && t.constructor) return t.constructor.name;
		}
	}
	return t;
}
function Ne(...e) {
	let [t, n, r] = e;
	return typeof t == "string" ? {
		message: t,
		code: "custom",
		input: n,
		inst: r
	} : { ...t };
}
function Pe(e, t) {
	for (let n in t) {
		let r = Object.getOwnPropertyDescriptor(t, n);
		r.get ? Object.defineProperty(e, n, {
			...r,
			enumerable: !1
		}) : Le(e, n, r.value);
	}
}
function b(e, t, n, r = !0) {
	return Object.defineProperty(e, t, {
		configurable: !0,
		writable: !0,
		enumerable: r,
		value: n
	}), n;
}
function Fe(e, t, n) {
	return b(e, t, n, !1);
}
/* @__NO_SIDE_EFFECTS__ */
function Ie(e, t) {
	for (let n in e) {
		let r = e[n];
		Object.defineProperty(t, n, {
			configurable: !0,
			enumerable: !0,
			get() {
				return b(this, n, r(this));
			},
			set(e) {
				b(this, n, e);
			}
		});
	}
	return t;
}
function Le(e, t, n) {
	Object.defineProperty(e, t, {
		configurable: !0,
		get() {
			return this == null ? n : b(this, t, n.bind(this));
		},
		set(e) {
			b(this, t, e);
		}
	});
}
function Re(e, t) {
	let n = Object.getPrototypeOf(e);
	return t in n ? void 0 : n;
}
var ze, x = !1, Be = {
	configurable: !0,
	get() {
		x = !0;
	}
};
function S(e, t, n) {
	let r = Object.getPrototypeOf(e._zod);
	t in r && ze !== e._zod ? ze = void 0 : (ze = e._zod, Object.defineProperty(r, t, {
		configurable: !0,
		get() {
			Object.defineProperty(this, t, Be);
			let e = x;
			x = !1;
			try {
				let r = n(this);
				return x ? delete this[t] : Object.defineProperty(this, t, {
					configurable: !0,
					writable: !0,
					value: r
				}), x ||= e, r;
			} catch (n) {
				throw delete this[t], x ||= e, n;
			}
		},
		set(e) {
			Object.defineProperty(this, t, {
				configurable: !0,
				writable: !0,
				value: e
			});
		}
	}));
}
function Ve(e, t, n, r) {
	let i = Re(e, t);
	i && Object.defineProperty(i, t, {
		configurable: !0,
		get() {
			let e = {
				configurable: !0,
				writable: !0,
				enumerable: r,
				value: void 0
			};
			return Object.defineProperty(this, t, e), e.value = n(this), Object.defineProperty(this, t, e), e.value;
		},
		set(e) {
			Object.defineProperty(this, t, {
				configurable: !0,
				writable: !0,
				enumerable: r,
				value: e
			});
		}
	});
}
var He = "~constantCatch";
function Ue(e) {
	let t = () => e;
	return t[He] = !0, t;
}
// node_modules/zod/v4/core/core.js
var We, Ge = {
	value: void 0,
	enumerable: !1
}, Ke = "captureStackTrace" in Error ? Error : null;
function qe(e) {
	let t = Ke;
	if (t) {
		let n = t.stackTraceLimit;
		if (typeof n == "number") {
			try {
				t.stackTraceLimit = 0;
			} catch {
				return Ke = null, new e();
			}
			try {
				return new e();
			} finally {
				t.stackTraceLimit = n;
			}
		}
	}
	return new e();
}
/* @__NO_SIDE_EFFECTS__ */
function C(e, t, n, r) {
	let i = {};
	function a(e) {
		this.def = e, this.constr = d, this.traits = /* @__PURE__ */ new Set();
	}
	a.prototype = i;
	let o = n, s = o && /* @__PURE__ */ new WeakSet();
	function c(n, r) {
		if (!n._zod) {
			Ge.value = new a(r);
			try {
				Object.defineProperty(n, "_zod", Ge);
			} finally {
				Ge.value = void 0;
			}
		} else if (n._zod.traits.has(e)) return;
		if (n._zod.traits.add(e), t(n, r), s) {
			let e = Object.getPrototypeOf(n), t = n._zod.constr.prototype, r = e;
			for (; r && r !== t;) r = Object.getPrototypeOf(r);
			let i = r ?? e;
			s.has(i) || (s.add(i), Pe(i, o));
		}
		let i = d.prototype;
		for (let e in i) Object.prototype.hasOwnProperty.call(i, e) && (e in n || (n[e] = i[e].bind(n)));
	}
	let l = r?.Parent ?? Object;
	class u extends l {}
	Object.defineProperty(u, "name", { value: e });
	function d(e) {
		let t = r?.Parent ? qe(u) : this;
		c(t, e);
		let n = t._zod.deferred;
		if (n) {
			for (let e of n) e();
			t._zod.deferred = void 0;
		}
		let i = globalThis.__zod_globalConfig?.postProcessor;
		return i && i(t), t;
	}
	return Object.defineProperty(d, "init", { value: c }), Object.defineProperty(d, Symbol.hasInstance, { value: (t) => r?.Parent && t instanceof r.Parent ? !0 : t?._zod?.traits?.has(e) }), Object.defineProperty(d, "name", { value: e }), d;
}
var w = class extends Error {
	constructor() {
		super("Encountered Promise during synchronous parse. Use .parseAsync() instead.");
	}
}, Je = class extends Error {
	constructor(e) {
		super(`Encountered unidirectional transform during encode: ${e}`), this.name = "ZodEncodeError";
	}
};
(We = globalThis).__zod_globalConfig ?? (We.__zod_globalConfig = {});
var T = globalThis.__zod_globalConfig;
function E(e) {
	return e && Object.assign(T, e), T;
}
// node_modules/zod/v4/core/errors.js
function Ye() {
	let e = this._zod;
	return e.message ??= JSON.stringify(e.def, n, 2), e.message;
}
function Xe(e) {
	this._zod.message = e;
}
var Ze = {
	get: Ye,
	set: Xe,
	enumerable: !0,
	configurable: !0
}, Qe = {
	value: void 0,
	enumerable: !1
}, $e = /* @__PURE__ */ new WeakSet([Object.prototype, Error.prototype]), et = /* @__PURE__ */ C("$ZodError", (e, t) => {
	e.name = "$ZodError", Qe.value = t, Object.defineProperty(e, "issues", Qe), Qe.value = void 0, Object.defineProperty(e, "message", Ze);
	let n = Object.getPrototypeOf(e);
	$e.has(n) || ($e.add(n), Object.defineProperty(n, "toString", {
		configurable: !0,
		enumerable: !1,
		get() {
			let e = () => this.message;
			return Object.defineProperty(this, "toString", {
				value: e,
				configurable: !0,
				writable: !0
			}), e;
		},
		set(e) {
			Object.defineProperty(this, "toString", {
				value: e,
				configurable: !0,
				writable: !0
			});
		}
	}));
});
function tt(e, t, n) {
	return Object.prototype.hasOwnProperty.call(e, t) || (t === "__proto__" ? Object.defineProperty(e, t, {
		value: n(),
		writable: !0,
		enumerable: !0,
		configurable: !0
	}) : e[t] = n()), e[t];
}
function nt(e, t = (e) => e.message) {
	let n = {}, r = [];
	for (let i of e.issues) i.path.length > 0 ? tt(n, i.path[0], () => []).push(t(i)) : r.push(t(i));
	return {
		formErrors: r,
		fieldErrors: n
	};
}
function rt(e, t = (e) => e.message) {
	let n = { _errors: [] }, r = (e, i = []) => {
		for (let a of e.issues) if (a.code === "invalid_union" && a.errors.length) a.errors.map((e) => r({ issues: e }, [...i, ...a.path]));
		else if (a.code === "invalid_key") r({ issues: a.issues }, [...i, ...a.path]);
		else if (a.code === "invalid_element") r({ issues: a.issues }, [...i, ...a.path]);
		else {
			let e = [...i, ...a.path];
			if (e.length === 0) n._errors.push(t(a));
			else {
				let r = n, i = 0;
				for (; i < e.length;) {
					let n = e[i], o = i === e.length - 1;
					if (n === "_errors") {
						o && r._errors.push(t(a)), i++;
						continue;
					}
					Object.prototype.hasOwnProperty.call(r, n) || Object.defineProperty(r, n, {
						value: { _errors: [] },
						enumerable: !0,
						writable: !0,
						configurable: !0
					});
					let s = r[n];
					o && s._errors.push(t(a)), r = s, i++;
				}
			}
		}
	};
	return r(e), n;
}
// node_modules/zod/v4/core/parse.js
function it(e, t) {
	return {
		callee: t?.callee ?? e,
		Err: t?.Err
	};
}
var at = (e) => {
	let t = (n, r, i, a) => {
		let o = i ? {
			...i,
			async: !1
		} : { async: !1 }, s = n._zod.run({
			value: r,
			issues: []
		}, o);
		if (s instanceof Promise) throw new w();
		if (s.issues.length) {
			let n = new ((a?.Err) ?? e)(s.issues.map((e) => Oe(e, o, E())));
			throw re(n, a?.callee ?? t), n;
		}
		return s.value;
	};
	return t;
}, ot = (e) => {
	let t = async (n, r, i, a) => {
		let o = i ? {
			...i,
			async: !0
		} : { async: !0 }, s = n._zod.run({
			value: r,
			issues: []
		}, o);
		if (s instanceof Promise && (s = await s), s.issues.length) {
			let n = new ((a?.Err) ?? e)(s.issues.map((e) => Oe(e, o, E())));
			throw re(n, a?.callee ?? t), n;
		}
		return s.value;
	};
	return t;
}, st = (e) => (t, n, r) => {
	let i = r ? {
		...r,
		async: !1
	} : { async: !1 }, a = t._zod.run({
		value: n,
		issues: []
	}, i);
	if (a instanceof Promise) throw new w();
	return a.issues.length ? ct(e, a.issues, i) : {
		success: !0,
		data: a.value
	};
};
function ct(e, t, n) {
	let r;
	return {
		success: !1,
		get error() {
			return r || (r = new e(t.map((e) => Oe(e, n, E()))), t = void 0, n = void 0), r;
		},
		set error(e) {
			r = e, t = void 0, n = void 0;
		}
	};
}
var lt = (e) => async (t, n, r) => {
	let i = r ? {
		...r,
		async: !0
	} : { async: !0 }, a = t._zod.run({
		value: n,
		issues: []
	}, i);
	return a instanceof Promise && (a = await a), a.issues.length ? ct(e, a.issues, i) : {
		success: !0,
		data: a.value
	};
}, ut = /* @__PURE__ */ Symbol.for("zod.compile.invalid"), dt = /* @__PURE__ */ Symbol.for("zod.compile.fallback"), ft = ((e, t, n) => {
	let r = e._zod.bag.validator;
	if (r !== void 0) {
		if (r(t) !== ut) return !0;
		if (r.definite === !0 && n === void 0) return !1;
	}
	return pt(e, t, n);
});
function pt(e, t, n) {
	let r = n ? {
		...n,
		async: !1,
		abortEarly: !0
	} : {
		async: !1,
		abortEarly: !0
	}, i = e._zod.bag.fallbackRun, a;
	if (i ? (r[dt] = !0, a = i({
		value: t,
		issues: []
	}, r)) : a = e._zod.run({
		value: t,
		issues: []
	}, r), a instanceof Promise) throw new w();
	return a.issues.length === 0;
}
var mt = async (e, t, n) => {
	let r = n ? {
		...n,
		async: !0,
		abortEarly: !0
	} : {
		async: !0,
		abortEarly: !0
	}, i = e._zod.run({
		value: t,
		issues: []
	}, r);
	return i instanceof Promise && (i = await i), i.issues.length === 0;
}, ht = (e) => {
	let t = at(e), n = (e, r, i, a) => {
		let o = i ? {
			...i,
			direction: "backward"
		} : { direction: "backward" };
		return t(e, r, o, it(n, a));
	};
	return n;
}, gt = (e) => {
	let t = at(e), n = (e, r, i, a) => t(e, r, i, it(n, a));
	return n;
}, _t = (e) => {
	let t = ot(e), n = async (e, r, i, a) => {
		let o = i ? {
			...i,
			direction: "backward"
		} : { direction: "backward" };
		return await t(e, r, o, it(n, a));
	};
	return n;
}, vt = (e) => {
	let t = ot(e), n = async (e, r, i, a) => await t(e, r, i, it(n, a));
	return n;
}, yt = (e) => (t, n, r) => {
	let i = r ? {
		...r,
		direction: "backward"
	} : { direction: "backward" };
	return st(e)(t, n, i);
}, bt = (e) => (t, n, r) => st(e)(t, n, r), xt = (e) => async (t, n, r) => {
	let i = r ? {
		...r,
		direction: "backward"
	} : { direction: "backward" };
	return lt(e)(t, n, i);
}, St = (e) => async (t, n, r) => lt(e)(t, n, r), Ct = /^[cC][0-9a-z]{6,}$/, wt = /^[0-9a-z]+$/, Tt = /^[0-7][0-9A-HJKMNP-TV-Za-hjkmnp-tv-z]{25}$/, Et = /^[0-9a-vA-V]{20}$/, Dt = /^[A-Za-z0-9]{27}$/, Ot = /^[a-zA-Z0-9_-]{21}$/;
function kt(e) {
	return RegExp(`^[a-zA-Z0-9_-]{${e}}$`);
}
var At = /^P(?:(\d+W)|(?!.*W)(?=\d|T\d)(\d+Y)?(\d+M)?(\d+D)?(T(?=\d)(\d+H)?(\d+M)?(\d+([.,]\d+)?S)?)?)$/, jt = /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$/, Mt = (e) => e ? RegExp(`^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-${e}[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})$`) : /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$/, Nt = /^(?:[A-Za-z0-9_'+\-]+\.)*[A-Za-z0-9_'+\-]*[A-Za-z0-9_+-]@(?:[A-Za-z0-9][A-Za-z0-9\-]*\.)+[A-Za-z]{2,}$/, Pt = "^(?=[\\s\\S]*[\\p{Extended_Pictographic}\\p{Regional_Indicator}\\u20E3])[\\p{Extended_Pictographic}\\p{Emoji_Component}]+$";
function Ft() {
	return new RegExp(Pt, "u");
}
var It = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/, Lt = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:))$/, Rt = /^((25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/([0-9]|[1-2][0-9]|3[0-2])$/, zt = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:))\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/, Bt = /^$|^(?:[0-9a-zA-Z+/]{4})*(?:(?:[0-9a-zA-Z+/]{2}==)|(?:[0-9a-zA-Z+/]{3}=))?$/, Vt = /^(?:[A-Za-z0-9_-]{4})*(?:[A-Za-z0-9_-]{2,3})?$/, Ht = /^https?$/, Ut = /^\+[1-9]\d{6,14}$/, Wt = "(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))";
function Gt(e) {
	return RegExp(`^${e}$`);
}
var Kt = /*@__PURE__*/ Gt(Wt);
function qt(e) {
	let t = "(?:[01]\\d|2[0-3]):[0-5]\\d";
	return typeof e.precision == "number" ? e.precision === -1 ? `${t}` : e.precision === 0 ? `${t}:[0-5]\\d` : `${t}:[0-5]\\d\\.\\d{${e.precision}}` : e.seconds ? `${t}:[0-5]\\d(?:\\.\\d+)?` : `${t}(?::[0-5]\\d(?:\\.\\d+)?)?`;
}
function Jt(e) {
	return RegExp(`^${qt(e)}$`);
}
function Yt(e) {
	let t = ["Z"];
	e.offset && t.push("([+-](?:[01]\\d|2[0-3]):[0-5]\\d)");
	let n = `${qt({
		precision: e.precision,
		seconds: !0
	})}(?:${t.join("|")})`, r = e.local ? `${n}|${qt({ precision: e.precision })}` : n;
	return RegExp(`^${Wt}T(?:${r})$`);
}
var Xt = /^[\s\S]{0,}$/, Zt = /^-?\d+(?:\.\d+)?$/, Qt = /^(?:true|false)$/i, $t = /^[^A-Z]*$/, en = /^[^a-z]*$/, D = /*@__PURE__*/ C("$ZodCheck", (e, t) => {
	var n;
	e._zod ??= {}, e._zod.def = t, (n = e._zod).onattach ?? (n.onattach = []);
}), tn = (e) => {
	let t = e.value;
	return !a(t) && t.length !== void 0;
}, nn = {
	number: "number",
	bigint: "bigint",
	object: "date"
}, rn = /*@__PURE__*/ C("$ZodCheckLessThan", (e, t) => {
	D.init(e, t);
	let n = nn[typeof t.value];
	e._zod.check = (r) => {
		(t.inclusive ? r.value <= t.value : r.value < t.value) || r.issues.push({
			origin: nn[typeof r.value] ?? n,
			code: "too_big",
			maximum: typeof t.value == "object" ? t.value.getTime() : t.value,
			input: r.value,
			inclusive: t.inclusive,
			inst: e,
			continue: !t.abort
		});
	};
}), an = /*@__PURE__*/ C("$ZodCheckGreaterThan", (e, t) => {
	D.init(e, t);
	let n = nn[typeof t.value];
	e._zod.check = (r) => {
		(t.inclusive ? r.value >= t.value : r.value > t.value) || r.issues.push({
			origin: nn[typeof r.value] ?? n,
			code: "too_small",
			minimum: typeof t.value == "object" ? t.value.getTime() : t.value,
			input: r.value,
			inclusive: t.inclusive,
			inst: e,
			continue: !t.abort
		});
	};
}), on = /*@__PURE__*/ C("$ZodCheckMultipleOf", (e, t) => {
	D.init(e, t), e._zod.check = (n) => {
		if (typeof n.value != typeof t.value) throw Error("Cannot mix number and bigint in multiple_of check.");
		(typeof n.value == "bigint" ? t.value !== BigInt(0) && n.value % t.value === BigInt(0) : s(n.value, t.value) === 0) || n.issues.push({
			origin: typeof n.value,
			code: "not_multiple_of",
			divisor: t.value,
			input: n.value,
			inst: e,
			continue: !t.abort
		});
	};
}), sn = /*@__PURE__*/ C("$ZodCheckNumberFormat", (e, t) => {
	D.init(e, t), t.format = t.format || "float64";
	let n = t.format?.includes("int"), r = n ? "int" : "number", [i, a] = fe[t.format];
	e._zod.check = (o) => {
		let s = o.value;
		if (n) {
			if (!Number.isInteger(s)) {
				o.issues.push({
					expected: r,
					format: t.format,
					code: "invalid_type",
					continue: !1,
					input: s,
					inst: e
				});
				return;
			}
			if (!Number.isSafeInteger(s)) {
				s > 0 ? o.issues.push({
					input: s,
					code: "too_big",
					maximum: 2 ** 53 - 1,
					note: "Integers must be within the safe integer range.",
					inst: e,
					origin: r,
					inclusive: !0,
					continue: !t.abort
				}) : o.issues.push({
					input: s,
					code: "too_small",
					minimum: -(2 ** 53 - 1),
					note: "Integers must be within the safe integer range.",
					inst: e,
					origin: r,
					inclusive: !0,
					continue: !t.abort
				});
				return;
			}
		}
		s < i && o.issues.push({
			origin: "number",
			input: s,
			code: "too_small",
			minimum: i,
			inclusive: !0,
			inst: e,
			continue: !t.abort
		}), s > a && o.issues.push({
			origin: "number",
			input: s,
			code: "too_big",
			maximum: a,
			inclusive: !0,
			inst: e,
			continue: !t.abort
		});
	};
}), cn = /*@__PURE__*/ C("$ZodCheckMaxLength", (e, t) => {
	var n;
	D.init(e, t), (n = e._zod.def).when ?? (n.when = tn), e._zod.check = (n) => {
		let r = n.value, i = r.length;
		if ((typeof r == "string" && i > t.maximum ? Ae(r) : i) <= t.maximum) return;
		let a = je(r);
		n.issues.push({
			origin: a,
			code: "too_big",
			maximum: t.maximum,
			inclusive: !0,
			input: r,
			inst: e,
			continue: !t.abort
		});
	};
}), ln = /*@__PURE__*/ C("$ZodCheckMinLength", (e, t) => {
	var n;
	D.init(e, t), (n = e._zod.def).when ?? (n.when = tn), e._zod.check = (n) => {
		let r = n.value, i = r.length;
		if ((typeof r == "string" && i >= t.minimum && i < t.minimum * 2 ? Ae(r) : i) >= t.minimum) return;
		let a = je(r);
		n.issues.push({
			origin: a,
			code: "too_small",
			minimum: t.minimum,
			inclusive: !0,
			input: r,
			inst: e,
			continue: !t.abort
		});
	};
}), un = /*@__PURE__*/ C("$ZodCheckLengthEquals", (e, t) => {
	var n;
	D.init(e, t), (n = e._zod.def).when ?? (n.when = tn), e._zod.check = (n) => {
		let r = n.value, i = r.length, a = typeof r == "string" && i >= t.length && i <= t.length * 2 ? Ae(r) : i;
		if (a === t.length) return;
		let o = je(r), s = a > t.length;
		n.issues.push({
			origin: o,
			...s ? {
				code: "too_big",
				maximum: t.length
			} : {
				code: "too_small",
				minimum: t.length
			},
			inclusive: !0,
			exact: !0,
			input: n.value,
			inst: e,
			continue: !t.abort
		});
	};
}), dn = /*@__PURE__*/ C("$ZodCheckStringFormat", (e, t) => {
	var n, r;
	D.init(e, t), t.pattern ? (n = e._zod).check ?? (n.check = (n) => {
		t.pattern.lastIndex = 0, t.pattern.test(n.value) || n.issues.push({
			origin: "string",
			code: "invalid_format",
			format: t.format,
			input: n.value,
			...t.pattern ? { pattern: t.pattern.toString() } : {},
			inst: e,
			continue: !t.abort
		});
	}) : (r = e._zod).check ?? (r.check = () => {});
}), fn = /*@__PURE__*/ C("$ZodCheckRegex", (e, t) => {
	dn.init(e, t), e._zod.check = (n) => {
		t.pattern.lastIndex = 0, t.pattern.test(n.value) || n.issues.push({
			origin: "string",
			code: "invalid_format",
			format: "regex",
			input: n.value,
			pattern: t.pattern.toString(),
			inst: e,
			continue: !t.abort
		});
	};
}), pn = /*@__PURE__*/ C("$ZodCheckLowerCase", (e, t) => {
	t.pattern ??= $t, dn.init(e, t);
}), mn = /*@__PURE__*/ C("$ZodCheckUpperCase", (e, t) => {
	t.pattern ??= en, dn.init(e, t);
}), hn = /*@__PURE__*/ C("$ZodCheckIncludes", (e, t) => {
	D.init(e, t);
	let n = le(t.includes);
	t.pattern = new RegExp(typeof t.position == "number" ? `^.{${t.position},}${n}` : n), e._zod.check = (n) => {
		n.value.includes(t.includes, t.position) || n.issues.push({
			origin: "string",
			code: "invalid_format",
			format: "includes",
			includes: t.includes,
			input: n.value,
			inst: e,
			continue: !t.abort
		});
	};
}), gn = /*@__PURE__*/ C("$ZodCheckStartsWith", (e, t) => {
	D.init(e, t);
	let n = RegExp(`^${le(t.prefix)}.*`);
	t.pattern ??= n, e._zod.check = (n) => {
		n.value.startsWith(t.prefix) || n.issues.push({
			origin: "string",
			code: "invalid_format",
			format: "starts_with",
			prefix: t.prefix,
			input: n.value,
			inst: e,
			continue: !t.abort
		});
	};
}), _n = /*@__PURE__*/ C("$ZodCheckEndsWith", (e, t) => {
	D.init(e, t);
	let n = RegExp(`.*${le(t.suffix)}$`);
	t.pattern ??= n, e._zod.check = (n) => {
		n.value.endsWith(t.suffix) || n.issues.push({
			origin: "string",
			code: "invalid_format",
			format: "ends_with",
			suffix: t.suffix,
			input: n.value,
			inst: e,
			continue: !t.abort
		});
	};
}), vn = /*@__PURE__*/ C("$ZodCheckOverwrite", (e, t) => {
	D.init(e, t), e._zod.check = (e) => {
		e.value = t.tx(e.value);
	};
}), yn = class {
	constructor(e = [], t = {}) {
		this.content = [], this.indent = 0, this.args = e, this.closed = t;
	}
	indented(e) {
		this.indent += 1;
		try {
			e(this);
		} finally {
			--this.indent;
		}
	}
	write(e) {
		if (typeof e == "function") {
			e(this, { execution: "sync" }), e(this, { execution: "async" });
			return;
		}
		let t = e.split("\n").filter((e) => e), n = Math.min(...t.map((e) => e.length - e.trimStart().length)), r = t.map((e) => e.slice(n)).map((e) => " ".repeat(this.indent * 2) + e);
		for (let e of r) this.content.push(e);
	}
	compile() {
		let e = Function, t = this?.content ?? [""];
		return new e(...Object.keys(this.closed), `return function (${this.args.join(", ")}) {\n${t.join("\n")}\n};`)(...Object.values(this.closed));
	}
}, bn = {
	major: 4,
	minor: 6,
	patch: 7
}, O = /*@__PURE__*/ C("$ZodType", (e, t) => {
	var n;
	e ??= {}, e._zod.def = t, e._zod.bag = e._zod.bag || {}, e._zod.version = bn;
	let r = e._zod.def.checks, i = e._zod.traits.has("$ZodCheck") ? [e, ...r ?? []] : r?.length ? [...r] : [];
	for (let t of i) for (let n of t._zod.onattach) n(e);
	if (i.length === 0) (n = e._zod).deferred ?? (n.deferred = []), e._zod.deferred?.push(() => {
		e._zod.run = e._zod.parse;
	});
	else {
		let t = (t, n, r) => {
			if (t.memo) return t;
			let i = y(t), a;
			for (let o of n) {
				if (o._zod.def.when) {
					if (Ce(t) || !o._zod.def.when(t)) continue;
				} else if (i) continue;
				let n = t.issues.length, s = o._zod.check(t);
				if (s instanceof Promise && r?.async === !1) throw new w();
				if (a || s instanceof Promise) a = (a ?? Promise.resolve()).then(async () => {
					await s, t.issues.length !== n && (De(t.issues, n, e), i ||= y(t, n));
				});
				else {
					if (t.issues.length === n) continue;
					De(t.issues, n, e), i ||= y(t, n);
				}
			}
			return a ? a.then(() => t) : t;
		}, n = (n, r, a) => {
			if (y(n)) return n.aborted = !0, n;
			let o = t(r, i, a);
			if (o instanceof Promise) {
				if (a.async === !1) throw new w();
				return o.then((t) => e._zod.parse(t, a));
			}
			return e._zod.parse(o, a);
		};
		e._zod.run = (r, a) => {
			if (a.skipChecks) return e._zod.parse(r, a);
			if (a.direction === "backward") {
				let t = e._zod.parse({
					value: r.value,
					issues: []
				}, {
					...a,
					skipChecks: !0
				});
				return t instanceof Promise ? t.then((e) => n(e, r, a)) : n(t, r, a);
			}
			let o = e._zod.parse(r, a);
			if (o instanceof Promise) {
				if (a.async === !1) throw new w();
				return o.then((e) => t(e, i, a));
			}
			return t(o, i, a);
		};
	}
}, {
	get "~standard"() {
		return Fe(this, "~standard", Cn(this));
	},
	set "~standard"(e) {
		b(this, "~standard", e);
	}
}), xn = (e, t) => e.issues.length ? { issues: e.issues.map((e) => Oe(e, t, E())) } : { value: e.value };
async function Sn(e, t) {
	let n = { async: !0 };
	return xn(await e._zod.run({
		value: t,
		issues: []
	}, n), n);
}
function Cn(e) {
	return {
		validate: (t) => {
			let n = { async: !1 };
			try {
				let r = e._zod.run({
					value: t,
					issues: []
				}, n);
				if (!(r instanceof Promise)) return xn(r, n);
			} catch {}
			return Sn(e, t);
		},
		vendor: "zod",
		version: 1
	};
}
var wn = /*@__PURE__*/ C("$ZodString", (e, t) => {
	O.init(e, t), e._zod.pattern = t.pattern ?? Xt, e._zod.parse = (n, r) => {
		if (t.coerce) try {
			n.value = String(n.value);
		} catch {}
		return typeof n.value == "string" || n.issues.push({
			expected: "string",
			code: "invalid_type",
			input: n.value,
			inst: e
		}), n;
	};
}), k = /*@__PURE__*/ C("$ZodStringFormat", (e, t) => {
	dn.init(e, t), wn.init(e, t);
}), Tn = /*@__PURE__*/ C("$ZodGUID", (e, t) => {
	t.pattern ??= jt, k.init(e, t);
}), En = /*@__PURE__*/ C("$ZodUUID", (e, t) => {
	if (t.version) {
		let e = {
			v1: 1,
			v2: 2,
			v3: 3,
			v4: 4,
			v5: 5,
			v6: 6,
			v7: 7,
			v8: 8
		}[t.version];
		if (e === void 0) throw Error(`Invalid UUID version: "${t.version}"`);
		t.pattern ??= Mt(e);
	} else t.pattern ??= Mt();
	k.init(e, t);
}), Dn = /*@__PURE__*/ C("$ZodEmail", (e, t) => {
	t.pattern ??= Nt, k.init(e, t);
});
function On(e) {
	try {
		return typeof URL < "u" && typeof URL.canParse == "function" ? URL.canParse(e) : (new URL(e), !0);
	} catch {
		return !1;
	}
}
function kn(e, t) {
	return !("normalize" in t) && !("hostname" in t) && !("protocol" in t) ? On(e) || 2 : An(e, t);
}
function An(e, t) {
	if (!t.normalize && t.protocol?.source === Ht.source && !/^https?:\/\//i.test(e)) return 1;
	try {
		if (typeof URL < "u") {
			let t = URL;
			if (typeof t.parse == "function") return t.parse(e) ?? 2;
		}
		return new URL(e);
	} catch {
		return 2;
	}
}
var jn = /[\t\n\r]/g;
function Mn(e) {
	return e.replace(jn, "");
}
function Nn(e, t) {
	return t.lastIndex = 0, t.test(e.hostname);
}
function Pn(e, t) {
	return t.lastIndex = 0, t.test(e.protocol.endsWith(":") ? e.protocol.slice(0, -1) : e.protocol);
}
var Fn = /*@__PURE__*/ C("$ZodURL", (e, t) => {
	k.init(e, t), e._zod.check = (n) => {
		try {
			let r = n.value.trim(), i = kn(r, t);
			if (i === 1) {
				n.issues.push({
					code: "invalid_format",
					format: "url",
					note: "Invalid URL format",
					input: n.value,
					inst: e,
					continue: !t.abort
				});
				return;
			}
			if (i === 2) {
				n.issues.push({
					code: "invalid_format",
					format: "url",
					input: n.value,
					inst: e,
					continue: !t.abort
				});
				return;
			}
			if (i === !0) {
				n.value = Mn(r);
				return;
			}
			t.hostname && !Nn(i, t.hostname) && n.issues.push({
				code: "invalid_format",
				format: "url",
				note: "Invalid hostname",
				pattern: t.hostname.source,
				input: n.value,
				inst: e,
				continue: !t.abort
			}), t.protocol && !Pn(i, t.protocol) && n.issues.push({
				code: "invalid_format",
				format: "url",
				note: "Invalid protocol",
				pattern: t.protocol.source,
				input: n.value,
				inst: e,
				continue: !t.abort
			}), n.value = t.normalize ? i.href : Mn(r);
			return;
		} catch {
			n.issues.push({
				code: "invalid_format",
				format: "url",
				input: n.value,
				inst: e,
				continue: !t.abort
			});
		}
	};
}), In = /*@__PURE__*/ C("$ZodEmoji", (e, t) => {
	t.pattern ??= Ft(), k.init(e, t);
}), Ln = /*@__PURE__*/ C("$ZodNanoID", (e, t) => {
	if (t.length !== void 0 && (!Number.isInteger(t.length) || t.length < 1)) throw Error(`Invalid nanoid length: ${t.length}`);
	t.pattern ??= t.length === void 0 ? Ot : kt(t.length), k.init(e, t);
}), Rn = /*@__PURE__*/ C("$ZodCUID", (e, t) => {
	t.pattern ??= Ct, k.init(e, t);
}), zn = /*@__PURE__*/ C("$ZodCUID2", (e, t) => {
	t.pattern ??= wt, k.init(e, t);
}), Bn = /*@__PURE__*/ C("$ZodULID", (e, t) => {
	t.pattern ??= Tt, k.init(e, t);
}), Vn = /*@__PURE__*/ C("$ZodXID", (e, t) => {
	t.pattern ??= Et, k.init(e, t);
}), Hn = /*@__PURE__*/ C("$ZodKSUID", (e, t) => {
	t.pattern ??= Dt, k.init(e, t);
}), Un = /*@__PURE__*/ C("$ZodISODateTime", (e, t) => {
	t.pattern ??= Yt(t), k.init(e, t);
}), Wn = /*@__PURE__*/ C("$ZodISODate", (e, t) => {
	t.pattern ??= Kt, k.init(e, t);
}), Gn = /*@__PURE__*/ C("$ZodISOTime", (e, t) => {
	t.pattern ??= Jt(t), k.init(e, t);
}), Kn = /*@__PURE__*/ C("$ZodISODuration", (e, t) => {
	t.pattern ??= At, k.init(e, t);
}), qn = /*@__PURE__*/ C("$ZodIPv4", (e, t) => {
	t.pattern ??= It, k.init(e, t);
}), Jn = /^[0-9a-fA-F:.]+$/;
function Yn(e) {
	return Jn.test(e) ? On(`http://[${e}]`) : !1;
}
var Xn = /*@__PURE__*/ C("$ZodIPv6", (e, t) => {
	t.pattern ??= Lt, k.init(e, t), e._zod.check = (n) => {
		Yn(n.value) || n.issues.push({
			code: "invalid_format",
			format: "ipv6",
			input: n.value,
			inst: e,
			continue: !t.abort
		});
	};
}), Zn = /*@__PURE__*/ C("$ZodCIDRv4", (e, t) => {
	t.pattern ??= Rt, k.init(e, t);
});
function Qn(e) {
	let t = e.split("/");
	if (t.length !== 2) return !1;
	let [n, r] = t;
	if (!r) return !1;
	let i = Number(r);
	return `${i}` !== r || i < 0 || i > 128 ? !1 : Yn(n);
}
var $n = /*@__PURE__*/ C("$ZodCIDRv6", (e, t) => {
	t.pattern ??= zt, k.init(e, t), e._zod.check = (n) => {
		Qn(n.value) || n.issues.push({
			code: "invalid_format",
			format: "cidrv6",
			input: n.value,
			inst: e,
			continue: !t.abort
		});
	};
});
function er(e) {
	if (e === "") return !0;
	if (/\s/.test(e) || e.length % 4 != 0) return !1;
	try {
		return atob(e), !0;
	} catch {
		return !1;
	}
}
var tr = /^[0-9a-zA-Z+/]*={0,2}$/, nr = /*@__PURE__*/ C("$ZodBase64", (e, t) => {
	t.pattern ??= tr, k.init(e, t), e._zod.check = (n) => {
		er(n.value) || n.issues.push({
			code: "invalid_format",
			format: "base64",
			input: n.value,
			inst: e,
			continue: !t.abort
		});
	};
}), rr = /^[A-Za-z0-9_-]*$/;
function ir(e) {
	if (!rr.test(e)) return !1;
	let t = e.replace(/[-_]/g, (e) => e === "-" ? "+" : "/");
	return er(t.padEnd(Math.ceil(t.length / 4) * 4, "="));
}
var ar = /*@__PURE__*/ C("$ZodBase64URL", (e, t) => {
	t.pattern ??= rr, k.init(e, t), e._zod.check = (n) => {
		ir(n.value) || n.issues.push({
			code: "invalid_format",
			format: "base64url",
			input: n.value,
			inst: e,
			continue: !t.abort
		});
	};
}), or = /*@__PURE__*/ C("$ZodE164", (e, t) => {
	t.pattern ??= Ut, k.init(e, t);
});
function sr(e, t = null) {
	try {
		let n = e.split(".");
		if (n.length !== 3) return !1;
		let [r] = n;
		if (!r) return !1;
		let i = JSON.parse(atob(r));
		return !("typ" in i && i?.typ !== "JWT" || !i.alg || t && (!("alg" in i) || i.alg !== t));
	} catch {
		return !1;
	}
}
var cr = /*@__PURE__*/ C("$ZodJWT", (e, t) => {
	k.init(e, t), e._zod.check = (n) => {
		sr(n.value, t.alg) || n.issues.push({
			code: "invalid_format",
			format: "jwt",
			input: n.value,
			inst: e,
			continue: !t.abort
		});
	};
}), lr = /*@__PURE__*/ C("$ZodNumber", (e, t) => {
	O.init(e, t), e._zod.pattern = Zt, e._zod.parse = (n, r) => {
		if (t.coerce) try {
			n.value = Number(n.value);
		} catch {}
		let i = n.value;
		if (typeof i == "number" && !Number.isNaN(i) && Number.isFinite(i)) return n;
		let a = typeof i == "number" ? Number.isNaN(i) ? "NaN" : Number.isFinite(i) ? void 0 : String(i) : void 0;
		return n.issues.push({
			expected: "number",
			code: "invalid_type",
			input: i,
			inst: e,
			...a ? { received: a } : {}
		}), n;
	};
}), ur = /*@__PURE__*/ C("$ZodNumberFormat", (e, t) => {
	sn.init(e, t), lr.init(e, t);
}), dr = /*@__PURE__*/ C("$ZodBoolean", (e, t) => {
	O.init(e, t), e._zod.pattern = Qt, e._zod.parse = (n, r) => {
		if (t.coerce) try {
			n.value = !!n.value;
		} catch {}
		let i = n.value;
		return typeof i == "boolean" || n.issues.push({
			expected: "boolean",
			code: "invalid_type",
			input: i,
			inst: e
		}), n;
	};
}), fr = /*@__PURE__*/ C("$ZodUnknown", (e, t) => {
	O.init(e, t), e._zod.parse = (e) => e;
}), pr = /*@__PURE__*/ C("$ZodNever", (e, t) => {
	O.init(e, t), e._zod.parse = (t, n) => (t.issues.push({
		expected: "never",
		code: "invalid_type",
		input: t.value,
		inst: e
	}), t);
});
function mr(e, t) {
	let n = Ee(e._zod.def.checks);
	if (!n.length) return;
	let r = Math.min(...n.map((e) => e[0])), i = e._zod.parse;
	e._zod.parse = (n, a) => {
		let o = t(n.value);
		if (o > r && !a?.skipChecks && a?.direction !== "backward") {
			for (let [t, r] of Ee(e._zod.def.checks)) if (o > t && r._zod.def.when(n)) {
				let t = n.issues.length;
				return r._zod.check(n), n.issues[t].continue = !1, De(n.issues, t, e), n;
			}
		}
		return i(n, a);
	};
}
var hr = (e) => Array.isArray(e) ? e.length : -1;
function gr(e, t, n) {
	e.issues.length && t.issues.push(...we(n, e.issues)), t.value[n] = e.value;
}
var _r = /*@__PURE__*/ C("$ZodArray", (e, t) => {
	O.init(e, t);
	let n = T.memoizer;
	n?.attach(e), e._zod.parse = (r, i) => {
		let a = r.value;
		if (!Array.isArray(a)) return r.issues.push({
			expected: "array",
			code: "invalid_type",
			input: a,
			inst: e
		}), r;
		r.value = n ? n.alloc(e, r, Array(a.length), i) : Array(a.length);
		let o = [], s = i?.abortEarly;
		for (let e = 0; e < a.length; e++) {
			let n = a[e], c = t.element._zod.run({
				value: n,
				issues: []
			}, i);
			if (c instanceof Promise) o.push(c.then((t) => gr(t, r, e)));
			else if (gr(c, r, e), s && c.issues.length !== 0 && y(c)) break;
		}
		return o.length ? Promise.all(o).then(() => r) : r;
	}, mr(e, hr);
});
function vr(e, t, n, r, i, a) {
	let o = n in r, s = a === "optional";
	if (o || !s || i !== "optional") {
		if (e.issues.length) {
			if (i !== void 0 && s && !o) return;
			t.issues.push(...we(n, e.issues));
		}
		!o && i === void 0 ? e.issues.length || t.issues.push({
			code: "invalid_type",
			expected: "nonoptional",
			input: void 0,
			path: [n]
		}) : e.value === void 0 ? (o || i === "defaulted" && !s) && (t.value[n] = void 0) : t.value[n] = e.value;
	}
}
var yr = [];
function br(e) {
	let t = Object.keys(e.shape), n = Object.getOwnPropertySymbols(e.shape), r = n.length ? n : yr, i = r.length ? [...t, ...r] : t;
	for (let t of i) if (!e.shape?.[t]?._zod?.traits?.has("$ZodType")) throw Error(`Invalid element at key "${String(t)}": expected a Zod schema`);
	let a = de(e.shape);
	return {
		...e,
		allKeys: i,
		symbolKeys: r,
		keySet: new Set(t),
		numKeys: t.length,
		optionalKeys: new Set(a)
	};
}
function xr(e, t, n, r, i, a, o) {
	let s = [], c = i.keySet, l = i.catchall._zod, u = l.def.type, d = l.optin, f = l.optout, p = 0;
	for (let i in t) {
		if (o && n.issues.length !== p) {
			if (y(n, p)) break;
			p = n.issues.length;
		}
		if (c.has(i)) continue;
		if (i === "__proto__") {
			u === "never" && s.push(i);
			continue;
		}
		if (u === "never") {
			s.push(i);
			continue;
		}
		let a = l.run({
			value: t[i],
			issues: []
		}, r);
		a instanceof Promise ? e.push(a.then((e) => vr(e, n, i, t, d, f))) : vr(a, n, i, t, d, f);
	}
	return s.length && n.issues.push({
		code: "unrecognized_keys",
		keys: s,
		input: t,
		inst: a,
		continue: !0
	}), e.length ? Promise.all(e).then(() => n) : n;
}
var Sr = /*@__PURE__*/ C("$ZodObject", (e, t) => {
	O.init(e, t);
	let n = Object.getOwnPropertyDescriptor(t, "shape"), r = n?.get ? n.get.raw : t.shape ?? {};
	if (r) {
		let e = () => {
			let n = { ...r };
			return Object.defineProperty(t, "shape", { value: n }), e.raw = n, n;
		};
		e.raw = r, Object.defineProperty(t, "shape", { get: e });
	}
	let a = i(() => br(t));
	S(e, "propValues", (e) => {
		let t = e.def.shape, n = {};
		for (let e in t) {
			let r = t[e]._zod;
			if (r.values) {
				Object.prototype.hasOwnProperty.call(n, e) || u(n, e, /* @__PURE__ */ new Set());
				for (let t of r.values) n[e].add(t);
				r.optin !== void 0 && n[e].add(void 0);
			}
		}
		return n;
	});
	let o = ie, s = t.catchall, c, l = T.memoizer;
	l?.attach(e), e._zod.parse = (t, n) => {
		c ??= a.value;
		let r = t.value;
		if (!o(r)) return t.issues.push({
			expected: "object",
			code: "invalid_type",
			input: r,
			inst: e
		}), t;
		t.value = l ? l.alloc(e, t, {}, n) : {};
		let i = [], u = c.shape, d = n?.abortEarly, f = t.issues.length;
		for (let e of c.allKeys) {
			if (d && t.issues.length !== f) {
				if (y(t, f)) break;
				f = t.issues.length;
			}
			if (e === "__proto__") continue;
			let a = u[e], o = a._zod.optin, s = a._zod.optout, c = a._zod.run({
				value: r[e],
				issues: []
			}, n);
			c instanceof Promise ? i.push(c.then((n) => vr(n, t, e, r, o, s))) : vr(c, t, e, r, o, s);
		}
		return s ? xr(i, r, t, n, a.value, e, d === !0) : i.length ? Promise.all(i).then(() => t) : t;
	};
}), Cr = /*@__PURE__*/ C("$ZodObjectJIT", (e, t) => {
	Sr.init(e, t);
	let n = e._zod.parse, r = i(() => br(t)), a = T.memoizer, o = (t) => {
		let n = r.value, i = n.symbolKeys, o = new yn(["payload", "ctx"], {
			shape: t,
			inst: e,
			memo: a,
			syms: i
		}), s = (e) => `shape[${e}]._zod.run({ value: input[${e}], issues: [] }, ctx)`, c = (e, t) => `
          let ${e}_ab = false;
          for (let i = 0; i < ${e}.issues.length; i++) {
            const iss = ${e}.issues[i];
            iss.path = iss.path ? [${t}, ...iss.path] : [${t}];
            payload.issues.push(iss);
            if (iss.continue !== true) ${e}_ab = true;
          }
          if (${e}_ab && ctx && ctx.abortEarly) {
            payload.value = newResult;
            return payload;
          }`;
		o.write("const input = payload.value;");
		let l = Object.create(null), u = 0;
		for (let e of n.allKeys) l[e] = `key_${u++}`;
		o.write(a ? "const newResult = memo.alloc(inst, payload, {}, ctx);" : "const newResult = {};");
		for (let e of n.allKeys) {
			if (e === "__proto__") continue;
			let n = l[e], r = typeof e == "symbol" ? `syms[${i.indexOf(e)}]` : te(e), a = `${r} in input`, u = t[e], d = u?._zod?.optin, f = d !== void 0, p = u?._zod?.optout === "optional";
			if (o.write(`const ${n} = ${s(r)};`), f && p) {
				let e = d === "optional" ? `${n}_present` : `${n}.value !== undefined || ${n}_present`;
				o.write(`
        const ${n}_present = ${a};
        if (!${n}.issues.length || ${n}_present) {
          if (${n}.issues.length) {${c(n, r)}
          }

          if (${e}) {
            newResult[${r}] = ${n}.value;
          }
        }

      `);
			} else f ? (o.write(`
        if (${n}.issues.length) {${c(n, r)}
        }
      `), d === "defaulted" ? o.write(`newResult[${r}] = ${n}.value;`) : o.write(`
        if (${n}.value !== undefined || ${a}) {
          newResult[${r}] = ${n}.value;
        }
      `)) : o.write(`
        const ${n}_present = ${a};
        if (${n}.issues.length) {${c(n, r)}
        }
        if (!${n}_present && !${n}.issues.length) {
          payload.issues.push({
            code: "invalid_type",
            expected: "nonoptional",
            input: undefined,
            path: [${r}]
          });
          if (ctx && ctx.abortEarly) {
            payload.value = newResult;
            return payload;
          }
        }

        if (${n}_present) {
          newResult[${r}] = ${n}.value;
        }

      `);
		}
		return o.write("payload.value = newResult;"), o.write("return payload;"), o.compile();
	}, s, c = ie, l = !T.jitless, u = l && ae.value, d = t.catchall, f;
	e._zod.parse = (i, a) => {
		f ??= r.value;
		let p = i.value;
		return c(p) ? l && u && a?.async === !1 && a.jitless !== !0 ? (s ||= o(t.shape), i = s(i, a), d ? xr([], p, i, a, f, e, a?.abortEarly === !0) : i) : n(i, a) : (i.issues.push({
			expected: "object",
			code: "invalid_type",
			input: p,
			inst: e
		}), i);
	};
});
function wr(e, t, n, r) {
	for (let n of e) if (n.issues.length === 0) return t.value = n.value, t;
	let i = e.filter((e) => !y(e));
	return i.length === 1 ? (t.value = i[0].value, i[0]) : (t.issues.push({
		code: "invalid_union",
		input: t.value,
		inst: n,
		errors: e.map((e) => e.issues.map((e) => Oe(e, r, E())))
	}), t);
}
var Tr = /*@__PURE__*/ C("$ZodUnion", (e, t) => {
	O.init(e, t), S(e, "optin", (e) => e.def.options.some((e) => e._zod.optin === "defaulted") ? "defaulted" : e.def.options.some((e) => e._zod.optin !== void 0) ? "optional" : void 0), S(e, "optout", (e) => e.def.options.some((e) => e._zod.optout === "optional") ? "optional" : void 0), S(e, "values", (e) => {
		if (e.def.options.every((e) => e._zod.values)) return new Set(e.def.options.flatMap((e) => Array.from(e._zod.values)));
	}), S(e, "pattern", (e) => {
		if (e.def.options.every((e) => e._zod.pattern)) {
			let t = e.def.options.map((e) => e._zod.pattern);
			return RegExp(`^(${t.map((e) => o(e.source)).join("|")})$`);
		}
	});
	let n = t.options.length === 1 ? t.options[0]._zod.run : null;
	e._zod.parse = (r, i) => {
		if (n) return n(r, i);
		let a = !1, o = [];
		for (let e of t.options) {
			let t = e._zod.run({
				value: r.value,
				issues: []
			}, i);
			if (t instanceof Promise) o.push(t), a = !0;
			else {
				if (t.issues.length === 0) return t;
				o.push(t);
			}
		}
		return a ? Promise.all(o).then((t) => wr(t, r, e, i)) : wr(o, r, e, i);
	};
});
function Er(e) {
	let t = /* @__PURE__ */ new Map();
	for (let n of e.options) {
		let r = n._zod.propValues?.[e.discriminator];
		if (!r || r.size === 0) throw Error(`Invalid discriminated union option at index "${e.options.indexOf(n)}"`);
		for (let e of r) if (t.has(e)) {
			if (e !== void 0) throw Error(`Duplicate discriminator value "${String(e)}"`);
			t.set(e, null);
		} else t.set(e, n);
	}
	return t;
}
var Dr = /*@__PURE__*/ C("$ZodDiscriminatedUnion", (e, t) => {
	t.inclusive = !1, Tr.init(e, t);
	let n = e._zod.parse;
	S(e, "propValues", (e) => {
		let t = {}, n = 0;
		for (let r of e.def.options) {
			let i = r._zod.propValues;
			if (!i || Object.keys(i).length === 0) throw Error(`Invalid discriminated union option at index "${e.def.options.indexOf(r)}"`);
			i[e.def.discriminator]?.has(void 0) && n++;
			for (let [e, n] of Object.entries(i)) {
				Object.prototype.hasOwnProperty.call(t, e) || u(t, e, /* @__PURE__ */ new Set());
				for (let r of n) t[e].add(r);
			}
		}
		return !e.def.unionFallback && n > 1 && t[e.def.discriminator]?.delete(void 0), t;
	}), t.options.forEach((e, n) => {
		let r = d(e._zod.def);
		if (r && !Object.prototype.hasOwnProperty.call(r, t.discriminator)) throw Error(`Invalid discriminated union option at index "${n}"`);
	});
	let r = i(() => Er(t));
	e._zod.parse = (i, a) => {
		let o = i.value;
		if (!ie(o)) return i.issues.push({
			code: "invalid_type",
			expected: "object",
			input: o,
			inst: e
		}), i;
		let s = o?.[t.discriminator], c = r.value.get(s);
		return c && (s !== void 0 || a.direction !== "backward") ? c._zod.run(i, a) : t.unionFallback || a.direction === "backward" ? n(i, a) : (i.issues.push({
			code: "invalid_union",
			errors: [],
			note: "No matching discriminator",
			discriminator: t.discriminator,
			options: Array.from(r.value.keys()).filter((e) => r.value.get(e) !== null),
			input: o,
			path: [t.discriminator],
			inst: e
		}), i);
	};
}), Or = /*@__PURE__*/ C("$ZodIntersection", (e, t) => {
	O.init(e, t), e._zod.parse = (e, n) => {
		let r = e.value, i = t.left._zod.run({
			value: r,
			issues: []
		}, n), a = t.right._zod.run({
			value: r,
			issues: []
		}, n);
		return i instanceof Promise || a instanceof Promise ? Promise.all([i, a]).then(([t, n]) => Ar(e, t, n)) : Ar(e, i, a);
	};
});
function kr(e, t) {
	if (e === t || e instanceof Date && t instanceof Date && +e == +t) return {
		valid: !0,
		data: e
	};
	if (oe(e) && oe(t)) {
		let n = Object.keys(t), r = Object.keys(e).filter((e) => n.indexOf(e) !== -1), i = {
			...e,
			...t
		};
		Object.prototype.hasOwnProperty.call(i, "__proto__") && delete i.__proto__;
		for (let n of r) {
			if (n === "__proto__") continue;
			let r = kr(e[n], t[n]);
			if (!r.valid) return {
				valid: !1,
				mergeErrorPath: [n, ...r.mergeErrorPath]
			};
			i[n] = r.data;
		}
		return {
			valid: !0,
			data: i
		};
	}
	if (Array.isArray(e) && Array.isArray(t)) {
		if (e.length !== t.length) return {
			valid: !1,
			mergeErrorPath: []
		};
		let n = [];
		for (let r = 0; r < e.length; r++) {
			let i = e[r], a = t[r], o = kr(i, a);
			if (!o.valid) return {
				valid: !1,
				mergeErrorPath: [r, ...o.mergeErrorPath]
			};
			n.push(o.data);
		}
		return {
			valid: !0,
			data: n
		};
	}
	return {
		valid: !1,
		mergeErrorPath: []
	};
}
function Ar(e, t, n) {
	let r = /* @__PURE__ */ new Map(), i, a = /* @__PURE__ */ new Map(), o = (e, t) => {
		let n;
		if (e.code === "unrecognized_keys" && !e.path?.length) i ??= e, n = e.keys;
		else if (e.code === "invalid_key" && e.origin === "record" && e.path?.length === 1) {
			let t = String(e.path[0]);
			a.has(t) || a.set(t, e), n = [t];
		} else return !1;
		for (let e of n) r.has(e) || r.set(e, {}), r.get(e)[t] = !0;
		return !0;
	};
	for (let n of t.issues) o(n, "l") || e.issues.push(n);
	for (let t of n.issues) o(t, "r") || e.issues.push(t);
	let s = [...r].filter(([, e]) => e.l && e.r).map(([e]) => e);
	if (s.length) {
		let t = i ? s.filter((e) => i.keys.includes(e)) : [];
		t.length && e.issues.push({
			...i,
			keys: t
		});
		for (let n of s) !t.includes(n) && a.has(n) && e.issues.push(a.get(n));
	}
	let c = kr(t.value, n.value);
	if (!c.valid) {
		if (y(e)) return e;
		throw Error(`Unmergable intersection. Error path: ${JSON.stringify(c.mergeErrorPath)}`);
	}
	return e.value = c.data, e;
}
var jr = /*@__PURE__*/ C("$ZodEnum", (t, n) => {
	O.init(t, n);
	let r = e(n.entries), i = new Set(r);
	t._zod.values = i, S(t, "pattern", (t) => {
		let n = e(t.def.entries).filter((e) => ce.has(typeof e));
		return RegExp(n.length ? `^(${n.map((e) => le(e.toString())).join("|")})$` : "^[^\\s\\S]$");
	}), t._zod.parse = (e, n) => {
		let a = e.value;
		return i.has(a) || e.issues.push({
			code: "invalid_value",
			values: r,
			input: a,
			inst: t
		}), e;
	};
}), Mr = /*@__PURE__*/ C("$ZodLiteral", (e, t) => {
	O.init(e, t);
	let n = new Set(t.values);
	e._zod.values = n, S(e, "pattern", (e) => {
		let t = e.def.values;
		return RegExp(t.length ? `^(${t.map((e) => typeof e == "string" ? le(e) : e ? le(e.toString()) : String(e)).join("|")})$` : "^[^\\s\\S]$");
	}), e._zod.parse = (r, i) => {
		let a = r.value;
		return n.has(a) || r.issues.push({
			code: "invalid_value",
			values: t.values,
			input: a,
			inst: e
		}), r;
	};
}), Nr = /*@__PURE__*/ C("$ZodTransform", (e, t) => {
	O.init(e, t), e._zod.optin = "optional", T.memoizer?.guard(e), e._zod.parse = (n, r) => {
		if (r.direction === "backward") throw new Je(e.constructor.name);
		let i = t.transform(n.value, n);
		if (r.async) return (i instanceof Promise ? i : Promise.resolve(i)).then((e) => (n.value = e, n));
		if (i instanceof Promise) throw new w();
		return n.value = i, n;
	};
});
function Pr(e, t) {
	return e.value = t.issues.length ? void 0 : t.value, e;
}
var Fr = /*@__PURE__*/ C("$ZodOptional", (e, t) => {
	O.init(e, t), S(e, "optin", (e) => e.def.innerType._zod.optin === "defaulted" ? "defaulted" : "optional"), e._zod.optout = "optional", S(e, "values", (e) => {
		let t = e.def.innerType._zod.values;
		return t ? /* @__PURE__ */ new Set([...t, void 0]) : void 0;
	}), S(e, "pattern", (e) => {
		let t = e.def.innerType._zod.pattern;
		return t ? RegExp(`^(${o(t.source)})?$`) : void 0;
	}), e._zod.parse = (e, n) => {
		if (e.value === void 0) {
			if (t.innerType._zod.optin !== "defaulted") return e;
			let r = t.innerType._zod.run({
				value: e.value,
				issues: []
			}, n);
			return r instanceof Promise ? r.then((t) => Pr(e, t)) : Pr(e, r);
		}
		return t.innerType._zod.run(e, n);
	};
}), Ir = /*@__PURE__*/ C("$ZodExactOptional", (e, t) => {
	Fr.init(e, t), S(e, "values", (e) => e.def.innerType._zod.values), S(e, "pattern", (e) => e.def.innerType._zod.pattern), e._zod.parse = (e, n) => t.innerType._zod.run(e, n);
}), Lr = /*@__PURE__*/ C("$ZodNullable", (e, t) => {
	O.init(e, t), S(e, "optin", (e) => e.def.innerType._zod.optin), S(e, "optout", (e) => e.def.innerType._zod.optout), S(e, "pattern", (e) => {
		let t = e.def.innerType._zod.pattern;
		return t ? RegExp(`^(${o(t.source)}|null)$`) : void 0;
	}), S(e, "values", (e) => e.def.innerType._zod.values ? /* @__PURE__ */ new Set([...e.def.innerType._zod.values, null]) : void 0), e._zod.parse = (e, n) => e.value === null ? e : t.innerType._zod.run(e, n);
}), Rr = /*@__PURE__*/ C("$ZodDefault", (e, t) => {
	O.init(e, t), e._zod.optin = "defaulted", S(e, "values", (e) => e.def.innerType._zod.values), e._zod.parse = (e, n) => {
		if (n.direction === "backward") return t.innerType._zod.run(e, n);
		if (e.value === void 0) return e.value = t.defaultValue, e;
		let r = t.innerType._zod.run(e, n);
		return r instanceof Promise ? r.then((e) => zr(e, t)) : zr(r, t);
	};
});
function zr(e, t) {
	return e.value === void 0 && (e.value = t.defaultValue), e;
}
var Br = /*@__PURE__*/ C("$ZodPrefault", (e, t) => {
	O.init(e, t), e._zod.optin = "defaulted", S(e, "values", (e) => e.def.innerType._zod.values), e._zod.parse = (e, n) => (n.direction === "backward" || e.value === void 0 && (e.value = t.defaultValue), t.innerType._zod.run(e, n));
}), Vr = /*@__PURE__*/ C("$ZodNonOptional", (e, t) => {
	O.init(e, t), S(e, "values", (e) => {
		let t = e.def.innerType._zod.values;
		return t ? new Set([...t].filter((e) => e !== void 0)) : void 0;
	}), e._zod.parse = (n, r) => {
		let i = t.innerType._zod.run(n, r);
		return i instanceof Promise ? i.then((t) => Hr(t, e)) : Hr(i, e);
	};
});
function Hr(e, t) {
	return !e.issues.length && e.value === void 0 && e.issues.push({
		code: "invalid_type",
		expected: "nonoptional",
		input: e.value,
		inst: t
	}), e;
}
function Ur(e, t, n, r) {
	return t.issues.length ? (e.value = n.catchValue({
		...t,
		value: e.value,
		error: { issues: t.issues.map((e) => Oe(e, r, E())) },
		input: e.value
	}), e) : (e.value = t.value, t.memo && (e.memo = !0), e);
}
var Wr = /*@__PURE__*/ C("$ZodCatch", (e, t) => {
	O.init(e, t), S(e, "optin", (e) => e.def.innerType._zod.optin === "defaulted" ? "defaulted" : "optional"), S(e, "optout", (e) => e.def.innerType._zod.optout), S(e, "values", (e) => e.def.innerType._zod.values), e._zod.parse = (e, n) => {
		if (n.direction === "backward") return t.innerType._zod.run(e, n);
		let r = t.innerType._zod.run({
			value: e.value,
			issues: []
		}, n);
		return r instanceof Promise ? r.then((r) => Ur(e, r, t, n)) : Ur(e, r, t, n);
	};
}), Gr = /*@__PURE__*/ C("$ZodPipe", (e, t) => {
	O.init(e, t), S(e, "values", (e) => e.def.in._zod.values), S(e, "optin", (e) => e.def.in._zod.optin), S(e, "optout", (e) => e.def.out._zod.optout), S(e, "propValues", (e) => e.def.in._zod.propValues), e._zod.parse = (e, n) => {
		if (n.direction === "backward") {
			let r = t.out._zod.run(e, n);
			return r instanceof Promise ? r.then((e) => Kr(e, t.in, n)) : Kr(r, t.in, n);
		}
		let r = t.in._zod.run(e, n);
		return r instanceof Promise ? r.then((e) => Kr(e, t.out, n)) : Kr(r, t.out, n);
	};
});
function Kr(e, t, n) {
	return e.issues.some((e) => e.code !== "unrecognized_keys") ? (e.aborted = !0, e) : t._zod.run({
		value: e.value,
		issues: e.issues
	}, n);
}
var qr = /*@__PURE__*/ C("$ZodReadonly", (e, t) => {
	O.init(e, t), S(e, "propValues", (e) => e.def.innerType._zod.propValues), S(e, "values", (e) => e.def.innerType._zod.values), S(e, "optin", (e) => e.def.innerType?._zod?.optin), S(e, "optout", (e) => e.def.innerType?._zod?.optout), e._zod.parse = (e, n) => {
		if (n.direction === "backward") return t.innerType._zod.run(e, n);
		let r = t.innerType._zod.run(e, n);
		return r instanceof Promise ? r.then(Jr) : Jr(r);
	};
});
function Jr(e) {
	return e.memo || (e.value = Object.freeze(e.value)), e;
}
var Yr = /*@__PURE__*/ C("$ZodLazy", (e, t) => {
	O.init(e, t), l(e._zod, "innerType", () => {
		let e = t;
		return e._cachedInner ||= t.getter(), e._cachedInner;
	}), S(e, "pattern", (e) => e.innerType?._zod?.pattern), S(e, "propValues", (e) => e.innerType?._zod?.propValues), S(e, "optin", (e) => e.innerType?._zod?.optin ?? void 0), S(e, "optout", (e) => e.innerType?._zod?.optout ?? void 0), e._zod.parse = (t, n) => e._zod.innerType._zod.run(t, n);
}), Xr = /*@__PURE__*/ C("$ZodCustom", (e, t) => {
	D.init(e, t), O.init(e, t), e._zod.parse = (e, t) => e, e._zod.check = (n) => {
		let r = n.value, i = t.fn(r);
		if (i instanceof Promise) return i.then((t) => Zr(t, n, r, e));
		Zr(i, n, r, e);
	};
});
function Zr(e, t, n, r) {
	if (!e) {
		let e = {
			code: "custom",
			input: n,
			inst: r,
			path: [...r._zod.def.path ?? []],
			continue: !r._zod.def.abort
		};
		r._zod.def.params && (e.params = r._zod.def.params), t.issues.push(Ne(e));
	}
}
// node_modules/zod/v4/core/memoizer.js
var Qr = class extends Error {
	constructor() {
		super("Cannot parse a reference cycle that closes through a transform"), this.name = "ZodCyclicError";
	}
}, $r = "~memo", ei = [];
function ti(e) {
	return typeof e == "object" && !!e;
}
function ni(e) {
	return e.map((e) => e.path ? {
		...e,
		path: e.path.slice()
	} : { ...e });
}
var ri = /*@__PURE__*/ new WeakMap(), ii = 0, ai = 1, oi = 2;
function si(e, t, n) {
	let r = ri.get(e);
	if (r !== void 0) return r ? oi : ii;
	if (t.has(e)) return oi;
	t.add(e);
	let i = ii, a = (e) => {
		if (i !== oi && e?._zod) {
			let r = si(e, t, n);
			r > i && (i = r);
		}
	}, o = (e, r) => {
		let i = ii;
		for (let a of Reflect.ownKeys(e)) {
			let o = Object.getOwnPropertyDescriptor(e, a);
			if (r && !o.enumerable) continue;
			let s = o.get ? ai : o.value?._zod ? si(o.value, t, n) : ii;
			s > i && (i = s);
		}
		return i;
	}, s = (e) => {
		e > i && (i = e);
	}, c = e._zod.def;
	switch (c.type) {
		case "object": {
			let e = d(c);
			s(e ? o(e, !0) : ai), a(c.catchall);
			break;
		}
		case "array":
			a(c.element);
			break;
		case "tuple":
			for (let e of c.items) a(e);
			a(c.rest);
			break;
		case "record":
		case "map":
			a(c.keyType), a(c.valueType);
			break;
		case "set":
			a(c.valueType);
			break;
		case "union":
			for (let e of c.options) a(e);
			break;
		case "intersection":
			a(c.left), a(c.right);
			break;
		case "optional":
		case "nullable":
		case "default":
		case "prefault":
		case "catch":
		case "readonly":
		case "nonoptional":
		case "promise":
		case "success":
			a(c.innerType);
			break;
		case "pipe":
			a(c.in), a(c.out);
			break;
		case "function":
			a(c.input), a(c.output);
			break;
		case "lazy": {
			let r = c._cachedInner ?? (n ? e._zod.innerType : void 0);
			s(r ? si(r, t, !1) : ai);
			break;
		}
		case "template_literal":
		case "string":
		case "number":
		case "int":
		case "boolean":
		case "bigint":
		case "symbol":
		case "undefined":
		case "null":
		case "void":
		case "never":
		case "any":
		case "unknown":
		case "date":
		case "nan":
		case "enum":
		case "literal":
		case "file":
		case "transform":
		case "custom": break;
		default: for (let e in c) {
			let t = Object.getOwnPropertyDescriptor(c, e);
			if (!t || t.get) continue;
			let n = t.value;
			if (n && typeof n == "object") {
				if (n._zod) a(n);
				else if (Array.isArray(n)) for (let e of n) a(e);
			}
		}
	}
	return t.delete(e), ci(e, i);
}
function ci(e, t) {
	return t !== ai && ri.set(e, t === oi), t;
}
function li(e, t) {
	let n = e.buckets.get(t);
	return n || (n = /* @__PURE__ */ new WeakMap(), e.buckets.set(t, n)), n;
}
var ui, di = [], fi = {
	alloc(e, t, n) {
		let r = ui;
		if (!r) return n;
		ui = void 0;
		let i = {
			value: n,
			issues: null
		};
		return r.set(t.value, i), di.push(i), n;
	},
	guard(e) {
		var t;
		(t = e._zod).deferred ?? (t.deferred = []), e._zod.deferred.push(() => {
			let t = e._zod.parse, n = (e, n) => {
				if (n.direction !== "backward" && mi(n, e.value)) throw new Qr();
				return t(e, n);
			};
			e._zod.parse = n, e._zod.run === t && (e._zod.run = n);
		});
	},
	attach(e) {
		var t;
		let n, r = !1, i, a;
		(t = e._zod).deferred ?? (t.deferred = []), e._zod.deferred.push(() => {
			let t = e._zod.parse, o = (s, c) => {
				if (n === void 0) {
					let i = si(e, /* @__PURE__ */ new Set(), !1);
					if (i === ii) return e._zod.parse = t, e._zod.run === o && (e._zod.run = t), t(s, c);
					i === oi || r ? n = !0 : r = !0;
				}
				let l = s.value;
				if (!ti(l)) return t(s, c);
				let u = c[$r];
				u || (u = {
					buckets: /* @__PURE__ */ new WeakMap(),
					backEdges: void 0
				}, c[$r] = u);
				let d;
				i === c ? d = a : (d = li(u, e), i = c, a = d);
				let f = d.get(l);
				if (f) return s.value = f.value, f.issues ? f.issues.length && s.issues.push(...ni(f.issues)) : (s.memo = !0, u.backEdges ?? (u.backEdges = /* @__PURE__ */ new WeakSet()), u.backEdges.add(f.value)), s;
				ui = d;
				let p = di.length, m = t(s, c);
				ui = void 0;
				let h = di.length > p ? di.pop() : void 0;
				return m instanceof Promise ? m.then((e) => (h && (h.issues = e.issues.length ? ni(e.issues) : ei), e)) : (h && (h.issues = m.issues.length ? ni(m.issues) : ei), m);
			};
			e._zod.parse = o, e._zod.run === t && (e._zod.run = o);
		});
	}
};
function pi() {
	return fi;
}
function mi(e, t) {
	let n = e[$r]?.backEdges;
	return n !== void 0 && ti(t) && n.has(t);
}
// node_modules/zod/v4/locales/en.js
var hi = () => {
	let e = {
		string: {
			unit: "characters",
			verb: "to have"
		},
		file: {
			unit: "bytes",
			verb: "to have"
		},
		array: {
			unit: "items",
			verb: "to have"
		},
		set: {
			unit: "items",
			verb: "to have"
		},
		map: {
			unit: "entries",
			verb: "to have"
		}
	};
	function n(t) {
		return e[t] ?? null;
	}
	let r = {
		regex: "input",
		email: "email address",
		url: "URL",
		emoji: "emoji",
		uuid: "UUID",
		uuidv4: "UUIDv4",
		uuidv6: "UUIDv6",
		nanoid: "nanoid",
		guid: "GUID",
		cuid: "cuid",
		cuid2: "cuid2",
		ulid: "ULID",
		xid: "XID",
		ksuid: "KSUID",
		datetime: "ISO datetime",
		date: "ISO date",
		time: "ISO time",
		duration: "ISO duration",
		ipv4: "IPv4 address",
		ipv6: "IPv6 address",
		mac: "MAC address",
		cidrv4: "IPv4 range",
		cidrv6: "IPv6 range",
		base64: "base64-encoded string",
		base64url: "base64url-encoded string",
		json_string: "JSON string",
		e164: "E.164 number",
		currency_code: "currency code",
		credit_card: "credit card number",
		iban: "IBAN",
		jwt: "JWT",
		template_literal: "input"
	}, i = { nan: "NaN" };
	function a(e, t) {
		return e === "number" && typeof t == "number" && !Number.isFinite(t) ? String(t) : i[e] ?? e;
	}
	return (e) => {
		switch (e.code) {
			case "invalid_type": return `Invalid input: expected ${a(e.expected)}, received ${a(Me(e.input), e.input)}`;
			case "invalid_value": return e.values.length === 1 ? `Invalid input: expected ${ue(e.values[0])}` : `Invalid option: expected one of ${t(e.values, "|")}`;
			case "too_big": {
				let t = e.exact ? "exactly " : e.inclusive ? "<=" : "<", r = n(e.origin);
				return r ? `Too big: expected ${e.origin ?? "value"} to have ${t}${e.maximum.toString()} ${r.unit ?? "elements"}` : `Too big: expected ${e.origin ?? "value"} to be ${t}${e.maximum.toString()}`;
			}
			case "too_small": {
				let t = e.exact ? "exactly " : e.inclusive ? ">=" : ">", r = n(e.origin);
				return r ? `Too small: expected ${e.origin} to have ${t}${e.minimum.toString()} ${r.unit}` : `Too small: expected ${e.origin} to be ${t}${e.minimum.toString()}`;
			}
			case "invalid_format": {
				let t = e;
				return t.format === "starts_with" ? `Invalid string: must start with "${t.prefix}"` : t.format === "ends_with" ? `Invalid string: must end with "${t.suffix}"` : t.format === "includes" ? `Invalid string: must include "${t.includes}"` : t.format === "regex" ? `Invalid string: must match pattern ${t.pattern}` : `Invalid ${r[t.format] ?? e.format}`;
			}
			case "not_multiple_of": return `Invalid number: must be a multiple of ${e.divisor}`;
			case "unrecognized_keys": return `Unrecognized key${e.keys.length > 1 ? "s" : ""}: ${t(e.keys, ", ")}`;
			case "invalid_key": return `Invalid key in ${e.origin}`;
			case "invalid_union": return e.options && Array.isArray(e.options) && e.options.length > 0 ? `Invalid discriminator value. Expected ${e.options.map((e) => `'${e}'`).join(" | ")}` : e.inclusive === !1 ? "Invalid input: more than one option matched" : "Invalid input";
			case "invalid_element": return `Invalid value in ${e.origin}`;
			default: return "Invalid input";
		}
	};
};
function gi() {
	return { localeError: hi() };
}
// node_modules/zod/v4/core/registries.js
var _i, vi = class {
	constructor() {
		this._map = /* @__PURE__ */ new WeakMap(), this._idmap = /* @__PURE__ */ new Map();
	}
	add(e, ...t) {
		let n = t[0];
		return this._map.set(e, n), n && typeof n == "object" && "id" in n && this._idmap.set(n.id, e), this;
	}
	clear() {
		return this._map = /* @__PURE__ */ new WeakMap(), this._idmap = /* @__PURE__ */ new Map(), this;
	}
	remove(e) {
		let t = this._map.get(e);
		return t && typeof t == "object" && "id" in t && this._idmap.delete(t.id), this._map.delete(e), this;
	}
	get(e) {
		let t = e._zod.parent;
		if (t) {
			let n = { ...this.get(t) ?? {} };
			delete n.id;
			let r = {
				...n,
				...this._map.get(e)
			};
			return Object.keys(r).length ? r : void 0;
		}
		return this._map.get(e);
	}
	has(e) {
		return this._map.has(e);
	}
};
function yi() {
	return new vi();
}
(_i = globalThis).__zod_globalRegistry ?? (_i.__zod_globalRegistry = yi());
var bi = globalThis.__zod_globalRegistry;
// node_modules/zod/v4/core/api.js
function xi(e) {
	return e.checks &&= [...e.checks], e;
}
// @__NO_SIDE_EFFECTS__
function Si(e, t) {
	return new e(xi({
		type: "string",
		...v(t)
	}));
}
// @__NO_SIDE_EFFECTS__
function Ci(e, t) {
	return new e({
		type: "string",
		format: "email",
		check: "string_format",
		abort: !1,
		...v(t)
	});
}
// @__NO_SIDE_EFFECTS__
function wi(e, t) {
	return new e({
		type: "string",
		format: "guid",
		check: "string_format",
		abort: !1,
		...v(t)
	});
}
// @__NO_SIDE_EFFECTS__
function Ti(e, t) {
	return new e({
		type: "string",
		format: "uuid",
		check: "string_format",
		abort: !1,
		...v(t)
	});
}
// @__NO_SIDE_EFFECTS__
function Ei(e, t) {
	return new e({
		type: "string",
		format: "uuid",
		check: "string_format",
		abort: !1,
		version: "v4",
		...v(t)
	});
}
// @__NO_SIDE_EFFECTS__
function Di(e, t) {
	return new e({
		type: "string",
		format: "uuid",
		check: "string_format",
		abort: !1,
		version: "v6",
		...v(t)
	});
}
// @__NO_SIDE_EFFECTS__
function Oi(e, t) {
	return new e({
		type: "string",
		format: "uuid",
		check: "string_format",
		abort: !1,
		version: "v7",
		...v(t)
	});
}
// @__NO_SIDE_EFFECTS__
function ki(e, t) {
	return new e({
		type: "string",
		format: "url",
		check: "string_format",
		abort: !1,
		...v(t)
	});
}
// @__NO_SIDE_EFFECTS__
function Ai(e, t) {
	return new e({
		type: "string",
		format: "emoji",
		check: "string_format",
		abort: !1,
		...v(t)
	});
}
// @__NO_SIDE_EFFECTS__
function ji(e, t) {
	return new e({
		type: "string",
		format: "nanoid",
		check: "string_format",
		abort: !1,
		...v(t)
	});
}
// @__NO_SIDE_EFFECTS__
function Mi(e, t) {
	return new e({
		type: "string",
		format: "cuid",
		check: "string_format",
		abort: !1,
		...v(t)
	});
}
// @__NO_SIDE_EFFECTS__
function Ni(e, t) {
	return new e({
		type: "string",
		format: "cuid2",
		check: "string_format",
		abort: !1,
		...v(t)
	});
}
// @__NO_SIDE_EFFECTS__
function Pi(e, t) {
	return new e({
		type: "string",
		format: "ulid",
		check: "string_format",
		abort: !1,
		...v(t)
	});
}
// @__NO_SIDE_EFFECTS__
function Fi(e, t) {
	return new e({
		type: "string",
		format: "xid",
		check: "string_format",
		abort: !1,
		...v(t)
	});
}
// @__NO_SIDE_EFFECTS__
function Ii(e, t) {
	return new e({
		type: "string",
		format: "ksuid",
		check: "string_format",
		abort: !1,
		...v(t)
	});
}
// @__NO_SIDE_EFFECTS__
function Li(e, t) {
	return new e({
		type: "string",
		format: "ipv4",
		check: "string_format",
		abort: !1,
		...v(t)
	});
}
// @__NO_SIDE_EFFECTS__
function Ri(e, t) {
	return new e({
		type: "string",
		format: "ipv6",
		check: "string_format",
		abort: !1,
		...v(t)
	});
}
// @__NO_SIDE_EFFECTS__
function zi(e, t) {
	return new e({
		type: "string",
		format: "cidrv4",
		check: "string_format",
		abort: !1,
		...v(t)
	});
}
// @__NO_SIDE_EFFECTS__
function Bi(e, t) {
	return new e({
		type: "string",
		format: "cidrv6",
		check: "string_format",
		abort: !1,
		...v(t)
	});
}
// @__NO_SIDE_EFFECTS__
function Vi(e, t) {
	return new e({
		type: "string",
		format: "base64",
		check: "string_format",
		abort: !1,
		...v(t)
	});
}
// @__NO_SIDE_EFFECTS__
function Hi(e, t) {
	return new e({
		type: "string",
		format: "base64url",
		check: "string_format",
		abort: !1,
		...v(t)
	});
}
// @__NO_SIDE_EFFECTS__
function Ui(e, t) {
	return new e({
		type: "string",
		format: "e164",
		check: "string_format",
		abort: !1,
		...v(t)
	});
}
// @__NO_SIDE_EFFECTS__
function Wi(e, t) {
	return new e({
		type: "string",
		format: "jwt",
		check: "string_format",
		abort: !1,
		...v(t)
	});
}
// @__NO_SIDE_EFFECTS__
function Gi(e, t) {
	return new e({
		type: "string",
		format: "datetime",
		check: "string_format",
		offset: !1,
		local: !1,
		precision: null,
		...v(t)
	});
}
// @__NO_SIDE_EFFECTS__
function Ki(e, t) {
	return new e({
		type: "string",
		format: "date",
		check: "string_format",
		...v(t)
	});
}
// @__NO_SIDE_EFFECTS__
function qi(e, t) {
	return new e({
		type: "string",
		format: "time",
		check: "string_format",
		precision: null,
		...v(t)
	});
}
// @__NO_SIDE_EFFECTS__
function Ji(e, t) {
	return new e({
		type: "string",
		format: "duration",
		check: "string_format",
		...v(t)
	});
}
// @__NO_SIDE_EFFECTS__
function Yi(e, t) {
	return new e(xi({
		type: "number",
		checks: [],
		...v(t)
	}));
}
// @__NO_SIDE_EFFECTS__
function Xi(e, t) {
	return new e({
		type: "number",
		check: "number_format",
		abort: !1,
		format: "safeint",
		...v(t)
	});
}
// @__NO_SIDE_EFFECTS__
function Zi(e, t) {
	return new e({
		type: "boolean",
		...v(t)
	});
}
// @__NO_SIDE_EFFECTS__
function Qi(e) {
	return new e({ type: "unknown" });
}
// @__NO_SIDE_EFFECTS__
function $i(e, t) {
	return new e({
		type: "never",
		...v(t)
	});
}
// @__NO_SIDE_EFFECTS__
function ea(e, t) {
	return new rn({
		check: "less_than",
		...v(t),
		value: e,
		inclusive: !1
	});
}
// @__NO_SIDE_EFFECTS__
function ta(e, t) {
	return new rn({
		check: "less_than",
		...v(t),
		value: e,
		inclusive: !0
	});
}
// @__NO_SIDE_EFFECTS__
function na(e, t) {
	return new an({
		check: "greater_than",
		...v(t),
		value: e,
		inclusive: !1
	});
}
// @__NO_SIDE_EFFECTS__
function ra(e, t) {
	return new an({
		check: "greater_than",
		...v(t),
		value: e,
		inclusive: !0
	});
}
// @__NO_SIDE_EFFECTS__
function ia(e, t) {
	return new on({
		check: "multiple_of",
		...v(t),
		value: e
	});
}
// @__NO_SIDE_EFFECTS__
function aa(e, t) {
	return new cn({
		check: "max_length",
		...v(t),
		maximum: e
	});
}
// @__NO_SIDE_EFFECTS__
function oa(e, t) {
	return new ln({
		check: "min_length",
		...v(t),
		minimum: e
	});
}
// @__NO_SIDE_EFFECTS__
function sa(e, t) {
	return new un({
		check: "length_equals",
		...v(t),
		length: e
	});
}
// @__NO_SIDE_EFFECTS__
function ca(e, t) {
	return new fn({
		check: "string_format",
		format: "regex",
		...v(t),
		pattern: e
	});
}
// @__NO_SIDE_EFFECTS__
function la(e) {
	return new pn({
		check: "string_format",
		format: "lowercase",
		...v(e)
	});
}
// @__NO_SIDE_EFFECTS__
function ua(e) {
	return new mn({
		check: "string_format",
		format: "uppercase",
		...v(e)
	});
}
// @__NO_SIDE_EFFECTS__
function da(e, t) {
	return new hn({
		check: "string_format",
		format: "includes",
		...v(t),
		includes: e
	});
}
// @__NO_SIDE_EFFECTS__
function fa(e, t) {
	return new gn({
		check: "string_format",
		format: "starts_with",
		...v(t),
		prefix: e
	});
}
// @__NO_SIDE_EFFECTS__
function pa(e, t) {
	return new _n({
		check: "string_format",
		format: "ends_with",
		...v(t),
		suffix: e
	});
}
// @__NO_SIDE_EFFECTS__
function A(e) {
	return new vn({
		check: "overwrite",
		tx: e
	});
}
// @__NO_SIDE_EFFECTS__
function ma(e) {
	return /* @__PURE__ */ A((t) => t.normalize(e));
}
// @__NO_SIDE_EFFECTS__
function ha() {
	return /* @__PURE__ */ A((e) => e.trim());
}
// @__NO_SIDE_EFFECTS__
function ga() {
	return /* @__PURE__ */ A((e) => e.toLowerCase());
}
// @__NO_SIDE_EFFECTS__
function _a() {
	return /* @__PURE__ */ A((e) => e.toUpperCase());
}
// @__NO_SIDE_EFFECTS__
function va() {
	return /* @__PURE__ */ A((e) => ne(e));
}
// @__NO_SIDE_EFFECTS__
function ya(e, t, n) {
	return new e({
		type: "array",
		element: t,
		...v(n)
	});
}
// @__NO_SIDE_EFFECTS__
function ba(e, t, n) {
	return new e({
		type: "custom",
		check: "custom",
		fn: t,
		...v(n)
	});
}
// @__NO_SIDE_EFFECTS__
function xa(e, t) {
	let n = /* @__PURE__ */ Sa((t) => (t.addIssue = (e) => {
		if (typeof e == "string") t.issues.push(Ne(e, t.value, n._zod.def));
		else {
			let r = e;
			r.fatal && (r.continue = !1), r.code ??= "custom", "input" in r || (r.input = t.value), r.inst ??= n, r.continue ??= !n._zod.def.abort, t.issues.push(Ne(r));
		}
	}, e(t.value, t)), t);
	return n;
}
// @__NO_SIDE_EFFECTS__
function Sa(e, t) {
	let n = new D({
		check: "custom",
		...v(t)
	});
	return n._zod.check = e, n;
}
// node_modules/zod/v4/core/to-json-schema.js
function Ca(e, ...t) {
	for (let n of t) for (let t of Reflect.ownKeys(n)) Object.prototype.propertyIsEnumerable.call(n, t) && u(e, t, n[t]);
	return e;
}
function wa(e) {
	let t = e?.target ?? "draft-2020-12";
	return t === "draft-4" && (t = "draft-04"), t === "draft-7" && (t = "draft-07"), {
		processors: e.processors ?? {},
		metadataRegistry: e?.metadata ?? bi,
		target: t,
		unrepresentable: e?.unrepresentable ?? "throw",
		override: e?.override ?? (() => {}),
		io: e?.io ?? "output",
		counter: 0,
		seen: /* @__PURE__ */ new Map(),
		sharedDefsExtractedFor: void 0,
		sharedEmitDoneFor: void 0,
		cycles: e?.cycles ?? "ref",
		reused: e?.reused ?? "inline",
		intersections: [],
		deferred: [],
		external: e?.external ?? void 0
	};
}
function j(e, t, n, r, i) {
	let a = typeof t.unrepresentable == "function" ? t.unrepresentable({
		zodSchema: e,
		path: r.path,
		message: i
	}) : t.unrepresentable;
	if (a === "any") return !1;
	if (a === void 0 || a === "throw") throw Error(i);
	return Object.assign(n, a), !0;
}
function M(e, t, n = {
	path: [],
	schemaPath: []
}) {
	var r;
	let i = e._zod.def, a = t.seen.get(e);
	if (a) return a.count++, n.schemaPath.includes(e) && (a.cycle = n.path), a.schema;
	let o = {
		schema: {},
		count: 1,
		cycle: void 0,
		path: n.path
	};
	t.seen.set(e, o), t.sharedDefsExtractedFor = void 0, t.sharedEmitDoneFor = void 0;
	let s = e._zod.toJSONSchema?.();
	if (s) o.schema = s;
	else {
		let r = {
			...n,
			schemaPath: [...n.schemaPath, e],
			path: n.path
		};
		if (e._zod.processJSONSchema) e._zod.processJSONSchema(t, o.schema, r);
		else {
			let n = o.schema, a = t.processors[i.type];
			if (!a) throw Error(`[toJSONSchema]: Non-representable type encountered: ${i.type}`);
			a(e, t, n, r);
		}
		let a = e._zod.parent;
		a && (o.ref ||= a, M(a, t, r), t.seen.get(a).isParent = !0);
	}
	let c = t.metadataRegistry.get(e);
	return c && Ca(o.schema, c), t.io === "input" && N(e) && (delete o.schema.examples, delete o.schema.default), t.io === "input" && "_prefault" in o.schema && ((r = o.schema).default ?? (r.default = o.schema._prefault)), delete o.schema._prefault, t.seen.get(e).schema;
}
function Ta(e) {
	return e.replace(/~/g, "~0").replace(/\//g, "~1");
}
function Ea(e, t) {
	let n = e.seen.get(t);
	if (!n) throw Error("Unprocessed schema. This is a bug in Zod.");
	if (e.external && e.sharedDefsExtractedFor === e.external) return;
	let r = /* @__PURE__ */ new Map();
	for (let t of e.seen.entries()) {
		let n = e.metadataRegistry.get(t[0])?.id;
		if (n) {
			let e = r.get(n);
			if (e && e !== t[0]) throw Error(`Duplicate schema id "${n}" detected during JSON Schema conversion. Two different schemas cannot share the same id when converted together.`);
			r.set(n, t[0]);
		}
	}
	let i = (t) => {
		let r = e.target === "draft-2020-12" ? "$defs" : "definitions";
		if (e.external) {
			let n = e.external.registry.get(t[0])?.id, i = e.external.uri ?? ((e) => e);
			if (n) return { ref: i(n) };
			let a = t[1].defId ?? t[1].schema.id ?? `schema${e.counter++}`;
			return t[1].defId = a, {
				defId: a,
				ref: `${i("__shared")}#/${r}/${Ta(a)}`
			};
		}
		let i = `#/${r}/`;
		if (t[1] === n && !t[1].schema.id) return { ref: "#" };
		let a = t[1].schema.id ?? `__schema${e.counter++}`;
		return {
			defId: a,
			ref: i + Ta(a)
		};
	}, a = (e) => {
		if (e[1].schema.$ref) return;
		let t = e[1], { ref: n, defId: r } = i(e);
		t.def = { ...t.schema }, r && (t.defId = r);
		let a = t.schema;
		for (let e in a) delete a[e];
		a.$ref = n;
	};
	if (e.cycles === "throw") for (let t of e.seen.entries()) {
		let e = t[1];
		if (e.cycle) throw Error(`Cycle detected: #/${e.cycle?.join("/")}/<root>

Set the \`cycles\` parameter to \`"ref"\` to resolve cyclical schemas with defs.`);
	}
	for (let n of e.seen.entries()) {
		let r = n[1];
		if (t === n[0]) a(n);
		else {
			if (e.external) {
				let r = e.external.registry.get(n[0])?.id;
				if (t !== n[0] && r) {
					a(n);
					continue;
				}
			}
			(e.metadataRegistry.get(n[0])?.id || r.cycle || r.count > 1 && e.reused === "ref") && a(n);
		}
	}
	e.external && (e.sharedDefsExtractedFor = e.external);
}
function Da(e) {
	let t = e.anyOf;
	if (!Array.isArray(t) || t.length === 0 || e.type !== void 0) return;
	let n = [];
	for (let e of t) {
		if (!e || typeof e != "object") return;
		Da(e);
		let t = Object.keys(e);
		if (t.length !== 1 || t[0] !== "type") return;
		let r = e.type;
		for (let e of Array.isArray(r) ? r : [r]) {
			if (typeof e != "string") return;
			n.includes(e) || n.push(e);
		}
	}
	delete e.anyOf, e.type = n.length === 1 ? n[0] : n;
}
var Oa = /* @__PURE__ */ new Set([
	"type",
	"properties",
	"required",
	"additionalProperties"
]), ka = ["oneOf", "anyOf"];
function Aa(e) {
	let t = e.additionalProperties;
	return t === void 0 || t === !1 || typeof t != "object" || !t ? null : Object.keys(t).length ? t : null;
}
function ja(e) {
	let t = [];
	for (let n of e) {
		if (typeof n != "object" || n.type !== "object") return null;
		for (let e in n) if (!Oa.has(e)) return null;
		t.push(n);
	}
	let n = {}, r = /* @__PURE__ */ new Set();
	for (let e of t) {
		for (let r in e.properties) {
			if (Object.prototype.hasOwnProperty.call(n, r)) continue;
			let e = [];
			for (let n of t) {
				let t = n.properties?.[r] ?? Aa(n);
				t != null && (e.some((e) => JSON.stringify(e) === JSON.stringify(t)) || e.push(t));
			}
			u(n, r, e.length === 1 ? e[0] : ja(e) ?? { allOf: e });
		}
		for (let t of e.required ?? []) r.add(t);
	}
	let i = {
		type: "object",
		properties: n
	};
	if (r.size && (i.required = [...r]), t.every((e) => e.additionalProperties === !1)) i.additionalProperties = !1;
	else {
		let e = [];
		for (let n of t) {
			let t = Aa(n);
			t && !e.some((e) => JSON.stringify(e) === JSON.stringify(t)) && e.push(t);
		}
		e.length === 1 ? i.additionalProperties = e[0] : e.length > 1 && (i.additionalProperties = { allOf: e });
	}
	return i;
}
function Ma(e) {
	let t = e.allOf;
	if (!Array.isArray(t) || t.length < 2) return;
	for (let t of Oa) if (t in e) return;
	let n = t.filter((e) => ka.some((t) => Array.isArray(e[t]))), r = null;
	if (!n.length) r = ja(t);
	else {
		let e = n[0], i = ka.find((t) => Array.isArray(e[t]));
		if (Object.keys(e).length !== 1) return;
		let a = t.filter((t) => t !== e), o = e[i].map((e) => ja([...a, e]));
		if (o.some((e) => !e)) return;
		r = { [i]: o };
	}
	r && (delete e.allOf, Ca(e, r));
}
function Na(e, t) {
	let n = e.seen.get(t);
	if (!n) throw Error("Unprocessed schema. This is a bug in Zod.");
	let r = (t) => {
		let n = e.seen.get(t);
		if (n.ref === null) return;
		let i = n.def ?? n.schema, a = { ...i }, o = n.ref;
		if (n.ref = null, o) {
			r(o);
			let n = e.seen.get(o), s = n.schema;
			if (s.$ref && (e.target === "draft-07" || e.target === "draft-04" || e.target === "openapi-3.0") ? (i.allOf = i.allOf ?? [], i.allOf.push(s)) : Ca(i, s), Ca(i, a), t._zod.parent === o) for (let e in i) e !== "$ref" && e !== "allOf" && (e in a || delete i[e]);
			if (s.$ref && n.def) for (let e in i) e !== "$ref" && e !== "allOf" && e in n.def && JSON.stringify(i[e]) === JSON.stringify(n.def[e]) && delete i[e];
		}
		let s = t._zod.parent;
		if (s && s !== o) {
			r(s);
			let t = e.seen.get(s);
			if (t?.schema.$ref && (i.$ref = t.schema.$ref, t.def)) for (let e in i) e !== "$ref" && e !== "allOf" && e in t.def && JSON.stringify(i[e]) === JSON.stringify(t.def[e]) && delete i[e];
		}
		e.override({
			zodSchema: t,
			jsonSchema: i,
			path: n.path ?? []
		});
	};
	if (!e.external || e.sharedEmitDoneFor !== e.external) {
		for (let t of [...e.seen.entries()].reverse()) r(t[0]);
		if (e.target !== "openapi-3.0") for (let t of e.seen.entries()) Da(t[1].def ?? t[1].schema);
		for (let t of e.deferred) t();
		if (e.intersections.length) {
			let t = /* @__PURE__ */ new Map();
			for (let n of e.seen.values()) for (let e of [n.schema, n.def]) {
				let n = e?.allOf;
				if (!Array.isArray(n)) continue;
				let r = t.get(n);
				r ? r.push(e) : t.set(n, [e]);
			}
			for (let n of e.intersections) for (let e of t.get(n) ?? []) Ma(e);
		}
	}
	let i = {};
	if (e.target === "draft-2020-12" ? i.$schema = "https://json-schema.org/draft/2020-12/schema" : e.target === "draft-07" ? i.$schema = "http://json-schema.org/draft-07/schema#" : e.target === "draft-04" ? i.$schema = "http://json-schema.org/draft-04/schema#" : e.target, e.external?.uri) {
		let n = e.external.registry.get(t)?.id;
		if (!n) throw Error("Schema is missing an `id` property");
		i.$id = e.external.uri(n);
	}
	Ca(i, n.defId ? n.schema : n.def ?? n.schema);
	let a = e.metadataRegistry.get(t)?.id;
	a !== void 0 && i.id === a && delete i.id;
	let o = e.external?.defs ?? {};
	if (!e.external || e.sharedEmitDoneFor !== e.external) for (let t of e.seen.entries()) {
		let e = t[1];
		e.def && e.defId && (e.def.id === e.defId && delete e.def.id, u(o, e.defId, e.def));
	}
	e.external && (e.sharedEmitDoneFor = e.external), e.external || Object.keys(o).length > 0 && (e.target === "draft-2020-12" ? i.$defs = o : i.definitions = o);
	try {
		let n = JSON.parse(JSON.stringify(i));
		return Object.defineProperty(n, "~standard", {
			value: {
				...t["~standard"],
				jsonSchema: {
					input: Fa(t, "input", e.processors),
					output: Fa(t, "output", e.processors)
				}
			},
			enumerable: !1,
			writable: !1
		}), n;
	} catch {
		throw Error("Error converting schema to JSON.");
	}
}
function N(e, t) {
	let n = t ?? { seen: /* @__PURE__ */ new Set() };
	if (n.seen.has(e)) return !1;
	n.seen.add(e);
	let r = e._zod.def;
	if (r.type === "transform") return !0;
	if (r.type === "array") return N(r.element, n);
	if (r.type === "set") return N(r.valueType, n);
	if (r.type === "lazy") return N(r.getter(), n);
	if (r.type === "promise" || r.type === "optional" || r.type === "nonoptional" || r.type === "nullable" || r.type === "readonly" || r.type === "default" || r.type === "prefault" || r.type === "catch") return N(r.innerType, n);
	if (r.type === "intersection") return N(r.left, n) || N(r.right, n);
	if (r.type === "record" || r.type === "map") return N(r.keyType, n) || N(r.valueType, n);
	if (r.type === "pipe") return e._zod.traits.has("$ZodCodec") ? !0 : N(r.in, n) || N(r.out, n);
	if (r.type === "object") {
		for (let e in r.shape) if (N(r.shape[e], n)) return !0;
		return !1;
	}
	if (r.type === "union") {
		for (let e of r.options) if (N(e, n)) return !0;
		return !1;
	}
	if (r.type === "tuple") {
		for (let e of r.items) if (N(e, n)) return !0;
		return !!(r.rest && N(r.rest, n));
	}
	return !1;
}
var Pa = (e, t = {}) => (n) => {
	let r = wa({
		...n,
		processors: t
	});
	return M(e, r), Ea(r, e), Na(r, e);
}, Fa = (e, t, n = {}) => (r) => {
	let { libraryOptions: i, target: a } = r ?? {}, o = wa({
		...i ?? {},
		target: a,
		io: t,
		processors: n
	});
	return M(e, o), Ea(o, e), Na(o, e);
}, P = (e, t, n) => {
	(e[t] === void 0 || n > e[t]) && (e[t] = n);
}, F = (e, t, n) => {
	(e[t] === void 0 || n < e[t]) && (e[t] = n);
}, Ia = (e, t) => {
	P(e, "minimum", t), F(e, "maximum", t);
}, La = (e, t) => {
	e.multipleOf ??= [], e.multipleOf.includes(t) || e.multipleOf.push(t);
}, Ra = (e, t) => {
	e.patterns ??= /* @__PURE__ */ new Set(), e.patterns.add(t);
}, za = (e, t) => {
	e.mime = e.mime ? e.mime.filter((e) => t.includes(e)) : [...t];
}, Ba = (e, t) => {
	e.format = t, t.includes("int") && (e.isInt = !0);
}, Va = (e, t) => P(e, "minimum", t.minimum), Ha = (e, t) => F(e, "maximum", t.maximum), Ua = (e) => (t, n) => {
	Ba(t, n.format);
	let [r, i] = e[n.format];
	P(t, "minimum", r), F(t, "maximum", i);
}, Wa = {
	greater_than: (e, t) => P(e, t.inclusive ? "minimum" : "exclusiveMinimum", t.value),
	less_than: (e, t) => F(e, t.inclusive ? "maximum" : "exclusiveMaximum", t.value),
	multiple_of: (e, t) => La(e, t.value),
	number_format: Ua(fe),
	bigint_format: Ua(pe),
	min_length: Va,
	max_length: Ha,
	length_equals: (e, t) => Ia(e, t.length),
	min_size: Va,
	max_size: Ha,
	size_equals: (e, t) => Ia(e, t.size),
	string_format: (e, t) => {
		Ba(e, t.format), t.pattern && Ra(e, t.pattern), (t.format === "base64" || t.format === "base64url") && (e.contentEncoding = t.format), (t.local || t.precision === -1) && (e.laxFormat = !0);
	},
	mime_type: (e, t) => za(e, t.mime)
};
function I(e) {
	let t = {}, n = e._zod.def, r = e._zod.traits.has("$ZodCheck") ? [e, ...n.checks ?? []] : n.checks ?? [];
	for (let e of r) Wa[e._zod.def.check]?.(t, e._zod.def);
	let i = e._zod.bag;
	i.minimum !== void 0 && P(t, "minimum", i.minimum), i.exclusiveMinimum !== void 0 && P(t, "exclusiveMinimum", i.exclusiveMinimum), i.maximum !== void 0 && F(t, "maximum", i.maximum), i.exclusiveMaximum !== void 0 && F(t, "exclusiveMaximum", i.exclusiveMaximum), i.multipleOf !== void 0 && La(t, i.multipleOf), i.format !== void 0 && (t.format ??= i.format, i.format.includes("int") && (t.isInt = !0)), i.mime && za(t, i.mime);
	for (let e of i.patterns ?? []) Ra(t, e);
	return t;
}
var Ga = {
	guid: "uuid",
	url: "uri",
	datetime: "date-time",
	json_string: "json-string",
	regex: ""
}, Ka = /* @__PURE__ */ new Map([[tr, Bt], [rr, Vt]]), qa = (e) => Ka.get(e) ?? e, Ja = (e, t, n, r) => {
	let i = n;
	i.type = "string";
	let { minimum: a, maximum: o, format: s, patterns: c, contentEncoding: l, laxFormat: u } = I(e);
	if (typeof a == "number" && (i.minLength = a), typeof o == "number" && (i.maxLength = o), s && (i.format = Ga[s] ?? s, i.format === "" && delete i.format, (s === "time" || u) && delete i.format), l && (i.contentEncoding = l), c && c.size > 0) {
		let e = [...c].map(qa);
		e.length === 1 ? i.pattern = e[0].source : e.length > 1 && (i.allOf = [...e.map((e) => ({
			...t.target === "draft-07" || t.target === "draft-04" || t.target === "openapi-3.0" ? { type: "string" } : {},
			pattern: e.source
		}))]);
	}
}, Ya = (e, t, n, r) => {
	let i = n, { minimum: a, maximum: o, multipleOf: s, exclusiveMaximum: c, exclusiveMinimum: l, isInt: u } = I(e);
	i.type = u ? "integer" : "number";
	let d = typeof l == "number" && l >= (a ?? -Infinity), f = typeof c == "number" && c <= (o ?? Infinity), p = t.target === "draft-04" || t.target === "openapi-3.0";
	if (d ? p ? (i.minimum = l, i.exclusiveMinimum = !0) : i.exclusiveMinimum = l : typeof a == "number" && (i.minimum = a), f ? p ? (i.maximum = c, i.exclusiveMaximum = !0) : i.exclusiveMaximum = c : typeof o == "number" && (i.maximum = o), s) {
		let n = /* @__PURE__ */ new Set();
		for (let a of s) Number.isFinite(a) && a !== 0 ? n.add(Math.abs(a)) : j(e, t, i, r, `A multipleOf divisor of ${a} cannot be represented in JSON Schema`);
		let [a, ...o] = n;
		a !== void 0 && (i.multipleOf = a), o.length && (i.allOf = [...i.allOf ?? [], ...o.map((e) => ({ multipleOf: e }))]);
	}
}, Xa = (e, t, n, r) => {
	n.type = "boolean";
}, Za = (e, t, n, r) => {
	n.not = {};
}, Qa = (t, n, r, i) => {
	let a = t._zod.def, o = e(a.entries);
	o.length === 0 ? r.not = {} : (o.every((e) => typeof e == "number") && (r.type = "number"), o.every((e) => typeof e == "string") && (r.type = "string"), r.enum = o);
}, $a = (e, t, n, r) => {
	let i = e._zod.def;
	if (i.values.length === 0) {
		n.not = {};
		return;
	}
	let a = [];
	for (let o of i.values) if (o === void 0) {
		if (j(e, t, n, r, "Literal `undefined` cannot be represented in JSON Schema")) return;
	} else if (typeof o == "bigint") {
		if (j(e, t, n, r, "BigInt literals cannot be represented in JSON Schema")) return;
		a.push(Number(o));
	} else a.push(o);
	if (a.length !== 0) {
		if (a.length === 1) {
			let e = a[0];
			n.type = e === null ? "null" : typeof e, t.target === "draft-04" || t.target === "openapi-3.0" ? n.enum = [e] : n.const = e;
		} else a.every((e) => typeof e == "number") && (n.type = "number"), a.every((e) => typeof e == "string") && (n.type = "string"), a.every((e) => typeof e == "boolean") && (n.type = "boolean"), a.every((e) => e === null) && (n.type = "null"), n.enum = a;
	}
}, eo = (e, t, n, r) => {
	j(e, t, n, r, "Custom types cannot be represented in JSON Schema");
}, to = (e, t, n, r) => {
	j(e, t, n, r, "Transforms cannot be represented in JSON Schema");
}, no = (e, t, n, r) => {
	let i = n, a = e._zod.def, { minimum: o, maximum: s } = I(e);
	typeof o == "number" && (i.minItems = o), typeof s == "number" && (i.maxItems = s), i.type = "array", i.items = M(a.element, t, {
		...r,
		path: [...r.path, "items"]
	});
};
function ro(e) {
	let t = e._zod.def;
	return t.type === "pipe" && t.in._zod.traits.has("$ZodTransform") ? ro(t.out) : t.type === "catch" ? ro(t.innerType) : e._zod.optin;
}
var io = (e, t, n, r) => {
	let i = n, a = e._zod.def, o = a.shape;
	if (Object.getOwnPropertySymbols(o).length && j(e, t, i, r, "Symbol keys cannot be represented in JSON Schema")) return;
	i.type = "object", i.properties = {};
	for (let e in o) u(i.properties, e, M(o[e], t, {
		...r,
		path: [
			...r.path,
			"properties",
			e
		]
	}));
	let s = [];
	for (let e of Object.keys(o)) {
		let n = a.shape[e];
		(t.io === "input" ? ro(n) === void 0 : n._zod.optout === void 0) && s.push(e);
	}
	s.length > 0 && (i.required = s), a.catchall?._zod.def.type === "never" ? i.additionalProperties = !1 : a.catchall ? a.catchall && (i.additionalProperties = M(a.catchall, t, {
		...r,
		path: [...r.path, "additionalProperties"]
	})) : t.io === "output" && (i.additionalProperties = !1);
}, ao = (e, t, n, r) => {
	let i = e._zod.def, a = i.inclusive === !1, o = i.options.map((e, n) => M(e, t, {
		...r,
		path: [
			...r.path,
			a ? "oneOf" : "anyOf",
			n
		]
	}));
	a ? n.oneOf = o : n.anyOf = o;
}, oo = (e, t, n, r) => {
	let i = e._zod.def, a = M(i.left, t, {
		...r,
		path: [
			...r.path,
			"allOf",
			0
		]
	}), o = M(i.right, t, {
		...r,
		path: [
			...r.path,
			"allOf",
			1
		]
	}), s = (e) => "allOf" in e && Object.keys(e).length === 1, c = [...s(a) ? a.allOf : [a], ...s(o) ? o.allOf : [o]];
	n.allOf = c, t.intersections.push(c);
}, so = (e, t, n, r) => {
	let i = e._zod.def, a = M(i.innerType, t, r), o = t.seen.get(e);
	t.target === "openapi-3.0" ? (o.ref = i.innerType, n.nullable = !0) : n.anyOf = [a, { type: "null" }];
}, co = (e, t, n, r) => {
	let i = e._zod.def;
	M(i.innerType, t, r);
	let a = t.seen.get(e);
	a.ref = i.innerType;
}, lo = Symbol();
function uo(e, t, n, r, i) {
	let a = !1, o = JSON.stringify(e, (e, t) => typeof t == "bigint" ? (a = !0, null) : t);
	return a ? (j(t, n, r, i, "BigInt defaults cannot be represented in JSON Schema"), lo) : JSON.parse(o);
}
var fo = (e, t, n, r) => {
	let i = e._zod.def;
	M(i.innerType, t, r);
	let a = t.seen.get(e);
	a.ref = i.innerType;
	let o = uo(i.defaultValue, e, t, n, r);
	o !== lo && (n.default = o);
}, po = (e, t, n, r) => {
	let i = e._zod.def;
	M(i.innerType, t, r);
	let a = t.seen.get(e);
	if (a.ref = i.innerType, t.io !== "input") return;
	let o = uo(i.defaultValue, e, t, n, r);
	o !== lo && (n._prefault = o);
}, mo = (e, t, n, r) => {
	let i = e._zod.def;
	M(i.innerType, t, r);
	let a = t.seen.get(e);
	a.ref = i.innerType;
	let o;
	try {
		o = i.catchValue(void 0);
	} catch {
		j(e, t, n, r, "Dynamic catch values are not supported in JSON Schema");
		return;
	}
	n.default = o;
}, ho = (e, t, n, r) => {
	let i = e._zod.def, a = i.in._zod.traits.has("$ZodTransform"), o = t.io === "input" ? a ? i.out : i.in : i.out;
	M(o, t, r);
	let s = t.seen.get(e);
	s.ref = o;
}, go = (e, t, n, r) => {
	let i = e._zod.def;
	M(i.innerType, t, r);
	let a = t.seen.get(e);
	a.ref = i.innerType, n.readOnly = !0;
}, _o = (e, t, n, r) => {
	let i = e._zod.def;
	M(i.innerType, t, r);
	let a = t.seen.get(e);
	a.ref = i.innerType;
}, vo = (e, t, n, r) => {
	let i = e._zod.innerType;
	M(i, t, r);
	let a = t.seen.get(e);
	a.ref = i;
}, yo = /* @__PURE__ */ new WeakSet([Object.prototype, Error.prototype]);
function bo(e, t, n) {
	Object.defineProperty(e, t, {
		configurable: !0,
		enumerable: !1,
		get() {
			let e = n(this);
			return Object.defineProperty(this, t, {
				value: e,
				configurable: !0,
				writable: !0
			}), e;
		},
		set(e) {
			Object.defineProperty(this, t, {
				value: e,
				configurable: !0,
				writable: !0
			});
		}
	});
}
var L = /*@__PURE__*/ C("ZodError", (e, t) => {
	et.init(e, t), e.name = "ZodError";
	let r = Object.getPrototypeOf(e);
	yo.has(r) || (yo.add(r), bo(r, "format", (e) => (t) => rt(e, t)), bo(r, "flatten", (e) => (t) => nt(e, t)), bo(r, "addIssue", (e) => (t) => {
		e.issues.push(t), e.message = JSON.stringify(e.issues, n, 2);
	}), bo(r, "addIssues", (e) => (t) => {
		e.issues.push(...t), e.message = JSON.stringify(e.issues, n, 2);
	}), Object.defineProperty(r, "isEmpty", {
		configurable: !0,
		enumerable: !1,
		get() {
			return this.issues.length === 0;
		}
	}));
}, void 0, { Parent: Error }), xo = /* @__PURE__ */ at(L), So = /* @__PURE__ */ ot(L), Co = /* @__PURE__ */ st(L), wo = /* @__PURE__ */ lt(L), To = /* @__PURE__ */ ht(L), Eo = /* @__PURE__ */ gt(L), Do = /* @__PURE__ */ _t(L), Oo = /* @__PURE__ */ vt(L), ko = /* @__PURE__ */ yt(L), Ao = /* @__PURE__ */ bt(L), jo = /* @__PURE__ */ xt(L), Mo = /* @__PURE__ */ St(L);
// node_modules/zod/v4/classic/schemas.js
function No() {
	T.localeError || E(gi());
}
function Po() {
	T.memoizer || E({ memoizer: pi() });
}
var R = /*@__PURE__*/ C("ZodType", (e, t) => (No(), O.init(e, t), e.def = t, e.type = t.type, e), {
	check(...e) {
		let t = this.def;
		return this.clone(g(t, { checks: [...t.checks ?? [], ...e.map((e) => typeof e == "function" ? { _zod: {
			check: e,
			def: { check: "custom" },
			onattach: []
		} } : e)] }), { parent: !0 });
	},
	with(...e) {
		return this.check(...e);
	},
	clone(e, t) {
		return _(this, e, t);
	},
	brand() {
		return this;
	},
	register(e, t) {
		return e.add(this, t), this;
	},
	refine(e, t) {
		return this.check(Ys(e, t));
	},
	superRefine(e, t) {
		return this.check(Xs(e, t));
	},
	overwrite(e) {
		return this.check(/* @__PURE__ */ A(e));
	},
	optional() {
		return ks(this);
	},
	exactOptional() {
		return js(this);
	},
	nullable() {
		return Ns(this);
	},
	nullish() {
		return ks(Ns(this));
	},
	nonoptional(e) {
		return zs(this, e);
	},
	array() {
		return U(this);
	},
	or(e) {
		return ys([this, e]);
	},
	and(e) {
		return Cs(this, e);
	},
	transform(e) {
		return Us(this, Ds(e));
	},
	default(e) {
		return Fs(this, e);
	},
	prefault(e) {
		return Ls(this, e);
	},
	catch(e) {
		return Vs(this, e);
	},
	pipe(e) {
		return Us(this, e);
	},
	readonly() {
		return Gs(this);
	},
	describe(e) {
		let t = this.clone();
		return bi.add(t, { description: e }), t;
	},
	meta(...e) {
		if (e.length === 0) return bi.get(this);
		let t = this.clone();
		return bi.add(t, e[0]), t;
	},
	isOptional() {
		return this.safeParse(void 0).success;
	},
	isNullable() {
		return this.safeParse(null).success;
	},
	apply(e, ...t) {
		return t.length === 0 ? e(this) : e(this, ...t);
	},
	get "~standard"() {
		return Fe(this, "~standard", {
			...Cn(this),
			jsonSchema: {
				input: Fa(this, "input"),
				output: Fa(this, "output")
			}
		});
	},
	set "~standard"(e) {
		b(this, "~standard", e);
	},
	parse: function e(t, n) {
		return xo(this, t, n, { callee: e });
	},
	parseAsync: async function e(t, n) {
		return await So(this, t, n, { callee: e });
	},
	safeParse(e, t) {
		return Co(this, e, t);
	},
	async safeParseAsync(e, t) {
		return wo(this, e, t);
	},
	get spa() {
		return this?.safeParseAsync;
	},
	set spa(e) {
		b(this, "spa", e);
	},
	validate(e, t) {
		return ft(this, e, t);
	},
	validateAsync(e, t) {
		return mt(this, e, t);
	},
	encode: function e(t, n) {
		return To(this, t, n, { callee: e });
	},
	decode: function e(t, n) {
		return Eo(this, t, n, { callee: e });
	},
	encodeAsync: async function e(t, n) {
		return await Do(this, t, n, { callee: e });
	},
	decodeAsync: async function e(t, n) {
		return await Oo(this, t, n, { callee: e });
	},
	safeEncode(e, t) {
		return ko(this, e, t);
	},
	safeDecode(e, t) {
		return Ao(this, e, t);
	},
	async safeEncodeAsync(e, t) {
		return jo(this, e, t);
	},
	async safeDecodeAsync(e, t) {
		return Mo(this, e, t);
	},
	toJSONSchema(e) {
		return Pa(this, {})(e);
	},
	get description() {
		return bi.get(this)?.description;
	},
	get _def() {
		return this._zod.def;
	}
}), Fo = /*@__PURE__*/ C("_ZodString", (e, t) => {
	wn.init(e, t), R.init(e, t), e._zod.processJSONSchema = (t, n, r) => Ja(e, t, n, r);
}, /*@__PURE__*/ Ie({
	format: (e) => I(e).format ?? null,
	minLength: (e) => I(e).minimum ?? null,
	maxLength: (e) => I(e).maximum ?? null
}, {
	regex(...e) {
		return this.check(/* @__PURE__ */ ca(...e));
	},
	includes(...e) {
		return this.check(/* @__PURE__ */ da(...e));
	},
	startsWith(...e) {
		return this.check(/* @__PURE__ */ fa(...e));
	},
	endsWith(...e) {
		return this.check(/* @__PURE__ */ pa(...e));
	},
	min(...e) {
		return this.check(/* @__PURE__ */ oa(...e));
	},
	max(...e) {
		return this.check(/* @__PURE__ */ aa(...e));
	},
	length(...e) {
		return this.check(/* @__PURE__ */ sa(...e));
	},
	nonempty(...e) {
		return this.check(/* @__PURE__ */ oa(1, ...e));
	},
	lowercase(e) {
		return this.check(/* @__PURE__ */ la(e));
	},
	uppercase(e) {
		return this.check(/* @__PURE__ */ ua(e));
	},
	trim() {
		return this.check(/* @__PURE__ */ ha());
	},
	normalize(...e) {
		return this.check(/* @__PURE__ */ ma(...e));
	},
	toLowerCase() {
		return this.check(/* @__PURE__ */ ga());
	},
	toUpperCase() {
		return this.check(/* @__PURE__ */ _a());
	},
	slugify() {
		return this.check(/* @__PURE__ */ va());
	}
})), Io = /*@__PURE__*/ C("ZodString", (e, t) => {
	wn.init(e, t), Fo.init(e, t);
}, {
	email(e) {
		return this.check(/* @__PURE__ */ Ci(Vo, e));
	},
	url(e) {
		return this.check(/* @__PURE__ */ ki(Wo, e));
	},
	jwt(e) {
		return this.check(/* @__PURE__ */ Wi(as, e));
	},
	emoji(e) {
		return this.check(/* @__PURE__ */ Ai(Go, e));
	},
	guid(e) {
		return this.check(/* @__PURE__ */ wi(Ho, e));
	},
	uuid(e) {
		return this.check(/* @__PURE__ */ Ti(Uo, e));
	},
	uuidv4(e) {
		return this.check(/* @__PURE__ */ Ei(Uo, e));
	},
	uuidv6(e) {
		return this.check(/* @__PURE__ */ Di(Uo, e));
	},
	uuidv7(e) {
		return this.check(/* @__PURE__ */ Oi(Uo, e));
	},
	nanoid(e) {
		return this.check(/* @__PURE__ */ ji(Ko, e));
	},
	cuid(e) {
		return this.check(/* @__PURE__ */ Mi(qo, e));
	},
	cuid2(e) {
		return this.check(/* @__PURE__ */ Ni(Jo, e));
	},
	ulid(e) {
		return this.check(/* @__PURE__ */ Pi(Yo, e));
	},
	base64(e) {
		return this.check(/* @__PURE__ */ Vi(ns, e));
	},
	base64url(e) {
		return this.check(/* @__PURE__ */ Hi(rs, e));
	},
	xid(e) {
		return this.check(/* @__PURE__ */ Fi(Xo, e));
	},
	ksuid(e) {
		return this.check(/* @__PURE__ */ Ii(Zo, e));
	},
	ipv4(e) {
		return this.check(/* @__PURE__ */ Li(Qo, e));
	},
	ipv6(e) {
		return this.check(/* @__PURE__ */ Ri($o, e));
	},
	cidrv4(e) {
		return this.check(/* @__PURE__ */ zi(es, e));
	},
	cidrv6(e) {
		return this.check(/* @__PURE__ */ Bi(ts, e));
	},
	e164(e) {
		return this.check(/* @__PURE__ */ Ui(is, e));
	},
	datetime(e) {
		return this.check(/* @__PURE__ */ Gi(Lo, e));
	},
	date(e) {
		return this.check(/* @__PURE__ */ Ki(Ro, e));
	},
	time(e) {
		return this.check(/* @__PURE__ */ qi(zo, e));
	},
	duration(e) {
		return this.check(/* @__PURE__ */ Ji(Bo, e));
	}
});
function z(e) {
	return /* @__PURE__ */ Si(Io, e);
}
var B = /*@__PURE__*/ C("ZodStringFormat", (e, t) => {
	k.init(e, t), Fo.init(e, t);
}), Lo = /*@__PURE__*/ C("ZodISODateTime", (e, t) => {
	Un.init(e, t), B.init(e, t);
}), Ro = /*@__PURE__*/ C("ZodISODate", (e, t) => {
	Wn.init(e, t), B.init(e, t);
}), zo = /*@__PURE__*/ C("ZodISOTime", (e, t) => {
	Gn.init(e, t), B.init(e, t);
}), Bo = /*@__PURE__*/ C("ZodISODuration", (e, t) => {
	Kn.init(e, t), B.init(e, t);
}), Vo = /*@__PURE__*/ C("ZodEmail", (e, t) => {
	Dn.init(e, t), B.init(e, t);
}), Ho = /*@__PURE__*/ C("ZodGUID", (e, t) => {
	Tn.init(e, t), B.init(e, t);
}), Uo = /*@__PURE__*/ C("ZodUUID", (e, t) => {
	En.init(e, t), B.init(e, t);
});
function V(e) {
	return /* @__PURE__ */ Ti(Uo, e);
}
var Wo = /*@__PURE__*/ C("ZodURL", (e, t) => {
	Fn.init(e, t), B.init(e, t);
}), Go = /*@__PURE__*/ C("ZodEmoji", (e, t) => {
	In.init(e, t), B.init(e, t);
}), Ko = /*@__PURE__*/ C("ZodNanoID", (e, t) => {
	Ln.init(e, t), B.init(e, t);
}), qo = /*@__PURE__*/ C("ZodCUID", (e, t) => {
	Rn.init(e, t), B.init(e, t);
}), Jo = /*@__PURE__*/ C("ZodCUID2", (e, t) => {
	zn.init(e, t), B.init(e, t);
}), Yo = /*@__PURE__*/ C("ZodULID", (e, t) => {
	Bn.init(e, t), B.init(e, t);
}), Xo = /*@__PURE__*/ C("ZodXID", (e, t) => {
	Vn.init(e, t), B.init(e, t);
}), Zo = /*@__PURE__*/ C("ZodKSUID", (e, t) => {
	Hn.init(e, t), B.init(e, t);
}), Qo = /*@__PURE__*/ C("ZodIPv4", (e, t) => {
	qn.init(e, t), B.init(e, t);
}), $o = /*@__PURE__*/ C("ZodIPv6", (e, t) => {
	Xn.init(e, t), B.init(e, t);
}), es = /*@__PURE__*/ C("ZodCIDRv4", (e, t) => {
	Zn.init(e, t), B.init(e, t);
}), ts = /*@__PURE__*/ C("ZodCIDRv6", (e, t) => {
	$n.init(e, t), B.init(e, t);
}), ns = /*@__PURE__*/ C("ZodBase64", (e, t) => {
	nr.init(e, t), B.init(e, t);
}), rs = /*@__PURE__*/ C("ZodBase64URL", (e, t) => {
	ar.init(e, t), B.init(e, t);
}), is = /*@__PURE__*/ C("ZodE164", (e, t) => {
	or.init(e, t), B.init(e, t);
}), as = /*@__PURE__*/ C("ZodJWT", (e, t) => {
	cr.init(e, t), B.init(e, t);
}), os = /*@__PURE__*/ C("ZodNumber", (e, t) => {
	lr.init(e, t), R.init(e, t), e._zod.processJSONSchema = (t, n, r) => Ya(e, t, n, r), e.isFinite = !0;
}, /*@__PURE__*/ Ie({
	minValue: (e) => {
		let { minimum: t, exclusiveMinimum: n } = I(e);
		return Math.max(t ?? -Infinity, n ?? -Infinity);
	},
	maxValue: (e) => {
		let { maximum: t, exclusiveMaximum: n } = I(e);
		return Math.min(t ?? Infinity, n ?? Infinity);
	},
	isInt: (e) => {
		let { isInt: t, multipleOf: n } = I(e);
		return !!t || !!n?.some(Number.isSafeInteger);
	},
	format: (e) => I(e).format ?? null
}, {
	gt(e, t) {
		return this.check(/* @__PURE__ */ na(e, t));
	},
	gte(e, t) {
		return this.check(/* @__PURE__ */ ra(e, t));
	},
	min(e, t) {
		return this.check(/* @__PURE__ */ ra(e, t));
	},
	lt(e, t) {
		return this.check(/* @__PURE__ */ ea(e, t));
	},
	lte(e, t) {
		return this.check(/* @__PURE__ */ ta(e, t));
	},
	max(e, t) {
		return this.check(/* @__PURE__ */ ta(e, t));
	},
	int(e) {
		return this.check(cs(e));
	},
	safe(e) {
		return this.check(cs(e));
	},
	positive(e) {
		return this.check(/* @__PURE__ */ na(0, e));
	},
	nonnegative(e) {
		return this.check(/* @__PURE__ */ ra(0, e));
	},
	negative(e) {
		return this.check(/* @__PURE__ */ ea(0, e));
	},
	nonpositive(e) {
		return this.check(/* @__PURE__ */ ta(0, e));
	},
	multipleOf(e, t) {
		return this.check(/* @__PURE__ */ ia(e, t));
	},
	step(e, t) {
		return this.check(/* @__PURE__ */ ia(e, t));
	},
	finite() {
		return this;
	}
}));
function H(e) {
	return /* @__PURE__ */ Yi(os, e);
}
var ss = /*@__PURE__*/ C("ZodNumberFormat", (e, t) => {
	ur.init(e, t), os.init(e, t);
});
function cs(e) {
	return /* @__PURE__ */ Xi(ss, e);
}
var ls = /*@__PURE__*/ C("ZodBoolean", (e, t) => {
	dr.init(e, t), R.init(e, t), e._zod.processJSONSchema = (t, n, r) => Xa(e, t, n, r);
});
function us(e) {
	return /* @__PURE__ */ Zi(ls, e);
}
var ds = /*@__PURE__*/ C("ZodUnknown", (e, t) => {
	fr.init(e, t), R.init(e, t), e._zod.processJSONSchema = (e, t, n) => void 0;
});
function fs() {
	return /* @__PURE__ */ Qi(ds);
}
var ps = /*@__PURE__*/ C("ZodNever", (e, t) => {
	pr.init(e, t), R.init(e, t), e._zod.processJSONSchema = (t, n, r) => Za(e, t, n, r);
});
function ms(e) {
	return /* @__PURE__ */ $i(ps, e);
}
var hs = /*@__PURE__*/ C("ZodArray", (e, t) => {
	Po(), _r.init(e, t), R.init(e, t), e._zod.processJSONSchema = (t, n, r) => no(e, t, n, r), e.element = t.element;
}, {
	min(e, t) {
		return this.check(/* @__PURE__ */ oa(e, t));
	},
	nonempty(e) {
		return this.check(/* @__PURE__ */ oa(1, e));
	},
	max(e, t) {
		return this.check(/* @__PURE__ */ aa(e, t));
	},
	length(e, t) {
		return this.check(/* @__PURE__ */ sa(e, t));
	},
	unwrap() {
		return this.element;
	}
});
function U(e, t) {
	return /* @__PURE__ */ ya(hs, e, t);
}
var gs = /*@__PURE__*/ C("ZodObject", (e, t) => {
	Po(), Cr.init(e, t), R.init(e, t), e._zod.processJSONSchema = (t, n, r) => io(e, t, n, r), Ve(e, "shape", (e) => e._zod.def.shape, !1);
}, {
	keyof() {
		return G(Object.keys(this._zod.def.shape));
	},
	catchall(e) {
		return this.clone(g(this._zod.def, { catchall: e }));
	},
	passthrough() {
		return this.clone(g(this._zod.def, { catchall: fs() }));
	},
	loose() {
		return this.clone(g(this._zod.def, { catchall: fs() }));
	},
	strict() {
		return this.clone(g(this._zod.def, { catchall: ms() }));
	},
	strip() {
		return this.clone(g(this._zod.def, { catchall: void 0 }));
	},
	extend(e) {
		return _e(this, e);
	},
	safeExtend(e) {
		return ye(this, e);
	},
	merge(e) {
		return be(this, e);
	},
	pick(e) {
		return me(this, e);
	},
	omit(e) {
		return ge(this, e);
	},
	partial(...e) {
		return xe(Os, this, e[0]);
	},
	exactPartial(...e) {
		return xe(As, this, e[0], "exactPartial");
	},
	required(...e) {
		return Se(Rs, this, e[0]);
	}
});
function _s(e, t) {
	return new gs({
		type: "object",
		shape: e ?? {},
		...v(t)
	});
}
function W(e, t) {
	return new gs({
		type: "object",
		shape: e,
		catchall: ms(),
		...v(t)
	});
}
var vs = /*@__PURE__*/ C("ZodUnion", (e, t) => {
	Tr.init(e, t), R.init(e, t), e._zod.processJSONSchema = (t, n, r) => ao(e, t, n, r), e.options = t.options;
});
function ys(e, t) {
	return new vs({
		type: "union",
		options: e,
		...v(t)
	});
}
var bs = /*@__PURE__*/ C("ZodDiscriminatedUnion", (e, t) => {
	vs.init(e, t), Dr.init(e, t);
});
function xs(e, t, n) {
	return new bs({
		type: "union",
		options: t,
		discriminator: e,
		...v(n)
	});
}
var Ss = /*@__PURE__*/ C("ZodIntersection", (e, t) => {
	Or.init(e, t), R.init(e, t), e._zod.processJSONSchema = (t, n, r) => oo(e, t, n, r);
});
function Cs(e, t) {
	return new Ss({
		type: "intersection",
		left: e,
		right: t
	});
}
var ws = /*@__PURE__*/ C("ZodEnum", (e, t) => {
	jr.init(e, t), R.init(e, t), e._zod.processJSONSchema = (t, n, r) => Qa(e, t, n, r), e.enum = t.entries, e.options = [...e._zod.values];
	let n = new Set(Object.keys(t.entries));
	e.extract = (e, r) => {
		let i = {};
		for (let r of e) if (n.has(r)) i[r] = t.entries[r];
		else throw Error(`Key ${r} not found in enum`);
		return new ws({
			...t,
			checks: [],
			...v(r),
			entries: i
		});
	}, e.exclude = (e, r) => {
		let i = { ...t.entries };
		for (let t of e) if (n.has(t)) delete i[t];
		else throw Error(`Key ${t} not found in enum`);
		return new ws({
			...t,
			checks: [],
			...v(r),
			entries: i
		});
	};
});
function G(e, t) {
	return new ws({
		type: "enum",
		entries: Array.isArray(e) ? Object.fromEntries(e.map((e) => [e, e])) : e,
		...v(t)
	});
}
var Ts = /*@__PURE__*/ C("ZodLiteral", (e, t) => {
	Mr.init(e, t), R.init(e, t), e._zod.processJSONSchema = (t, n, r) => $a(e, t, n, r), e.values = new Set(t.values), Object.defineProperty(e, "value", { get() {
		if (t.values.length > 1) throw Error("This schema contains multiple valid literal values. Use `.values` instead.");
		return t.values[0];
	} });
});
function K(e, t) {
	return new Ts({
		type: "literal",
		values: Array.isArray(e) ? e : [e],
		...v(t)
	});
}
var Es = /*@__PURE__*/ C("ZodTransform", (e, t) => {
	Po(), Nr.init(e, t), R.init(e, t), e._zod.processJSONSchema = (t, n, r) => to(e, t, n, r), e._zod.parse = (n, r) => {
		if (r.direction === "backward") throw new Je(e.constructor.name);
		n.addIssue = (r) => {
			if (typeof r == "string") n.issues.push(Ne(r, n.value, t));
			else {
				let t = r;
				t.fatal && (t.continue = !1), t.code ??= "custom", "input" in t || (t.input = n.value), t.inst ??= e, n.issues.push(Ne(t));
			}
		};
		let i = t.transform(n.value, n);
		return i instanceof Promise ? i.then((e) => (n.value = e, n)) : (n.value = i, n);
	};
});
function Ds(e) {
	return new Es({
		type: "transform",
		transform: e
	});
}
var Os = /*@__PURE__*/ C("ZodOptional", (e, t) => {
	Fr.init(e, t), R.init(e, t), e._zod.processJSONSchema = (t, n, r) => _o(e, t, n, r), e.unwrap = () => e._zod.def.innerType;
});
function ks(e) {
	return new Os({
		type: "optional",
		innerType: e
	});
}
var As = /*@__PURE__*/ C("ZodExactOptional", (e, t) => {
	Ir.init(e, t), R.init(e, t), e._zod.processJSONSchema = (t, n, r) => _o(e, t, n, r), e.unwrap = () => e._zod.def.innerType;
});
function js(e) {
	return new As({
		type: "optional",
		innerType: e
	});
}
var Ms = /*@__PURE__*/ C("ZodNullable", (e, t) => {
	Lr.init(e, t), R.init(e, t), e._zod.processJSONSchema = (t, n, r) => so(e, t, n, r), e.unwrap = () => e._zod.def.innerType;
});
function Ns(e) {
	return new Ms({
		type: "nullable",
		innerType: e
	});
}
var Ps = /*@__PURE__*/ C("ZodDefault", (e, t) => {
	Rr.init(e, t), R.init(e, t), e._zod.processJSONSchema = (t, n, r) => fo(e, t, n, r), e.unwrap = () => e._zod.def.innerType, e.removeDefault = e.unwrap;
});
function Fs(e, t) {
	return new Ps({
		type: "default",
		innerType: e,
		get defaultValue() {
			return typeof t == "function" ? t() : se(t);
		}
	});
}
var Is = /*@__PURE__*/ C("ZodPrefault", (e, t) => {
	Br.init(e, t), R.init(e, t), e._zod.processJSONSchema = (t, n, r) => po(e, t, n, r), e.unwrap = () => e._zod.def.innerType;
});
function Ls(e, t) {
	return new Is({
		type: "prefault",
		innerType: e,
		get defaultValue() {
			return typeof t == "function" ? t() : se(t);
		}
	});
}
var Rs = /*@__PURE__*/ C("ZodNonOptional", (e, t) => {
	Vr.init(e, t), R.init(e, t), e._zod.processJSONSchema = (t, n, r) => co(e, t, n, r), e.unwrap = () => e._zod.def.innerType;
});
function zs(e, t) {
	return new Rs({
		type: "nonoptional",
		innerType: e,
		...v(t)
	});
}
var Bs = /*@__PURE__*/ C("ZodCatch", (e, t) => {
	Wr.init(e, t), R.init(e, t), e._zod.processJSONSchema = (t, n, r) => mo(e, t, n, r), e.unwrap = () => e._zod.def.innerType, e.removeCatch = e.unwrap;
});
function Vs(e, t) {
	return new Bs({
		type: "catch",
		innerType: e,
		catchValue: typeof t == "function" ? t : Ue(t)
	});
}
var Hs = /*@__PURE__*/ C("ZodPipe", (e, t) => {
	Gr.init(e, t), R.init(e, t), e._zod.processJSONSchema = (t, n, r) => ho(e, t, n, r), e.in = t.in, e.out = t.out;
});
function Us(e, t) {
	return new Hs({
		type: "pipe",
		in: e,
		out: t
	});
}
var Ws = /*@__PURE__*/ C("ZodReadonly", (e, t) => {
	qr.init(e, t), R.init(e, t), e._zod.processJSONSchema = (t, n, r) => go(e, t, n, r), e.unwrap = () => e._zod.def.innerType;
});
function Gs(e) {
	return new Ws({
		type: "readonly",
		innerType: e
	});
}
var Ks = /*@__PURE__*/ C("ZodLazy", (e, t) => {
	Yr.init(e, t), R.init(e, t), e._zod.processJSONSchema = (t, n, r) => vo(e, t, n, r), e.unwrap = () => e._zod.def.getter();
});
function qs(e) {
	return new Ks({
		type: "lazy",
		getter: e
	});
}
var Js = /*@__PURE__*/ C("ZodCustom", (e, t) => {
	Xr.init(e, t), R.init(e, t), e._zod.processJSONSchema = (t, n, r) => eo(e, t, n, r);
});
function Ys(e, t = {}) {
	return /* @__PURE__ */ ba(Js, e, t);
}
function Xs(e, t) {
	return /* @__PURE__ */ xa(e, t);
}
// node_modules/zod/v4/classic/iso.js
function q(e) {
	return /* @__PURE__ */ Gi(Lo, e);
}
// packages/core/src/styles.ts
var Zs = "(?:-?\\d{1,5}(?:\\.\\d{1,3})?px|auto|none|normal)", Qs = RegExp(`^${Zs}(?: ${Zs}){0,15}$`), $s = /^rgba?\(\d{1,3}(?:\.\d{1,3})?, \d{1,3}(?:\.\d{1,3})?, \d{1,3}(?:\.\d{1,3})?(?:, (?:0|1|0?\.\d{1,3}))?\)$/, J = {
	display: /^(?:none|contents|block|inline|inline-block|flex|inline-flex|grid|inline-grid|table|inline-table|table-row|table-cell|table-row-group|table-header-group|table-footer-group|table-column|table-column-group|table-caption|list-item)$/,
	position: /^(?:static|relative|absolute|fixed|sticky)$/,
	"box-sizing": /^(?:content-box|border-box)$/,
	"flex-direction": /^(?:row|row-reverse|column|column-reverse)$/,
	"flex-wrap": /^(?:nowrap|wrap|wrap-reverse)$/,
	"font-family": /^(?:sans-serif|serif|monospace)$/,
	"font-weight": /^(?:[1-9]\d{0,2}|1000)$/,
	"font-style": /^(?:normal|italic|oblique)$/,
	"text-align": /^(?:start|end|left|right|center|justify)$/,
	"white-space": /^(?:normal|pre|nowrap|pre-wrap|pre-line|break-spaces)$/,
	"text-decoration-line": /^(?:none|underline|overline|line-through)(?: (?:underline|overline|line-through)){0,2}$/,
	visibility: /^(?:visible|hidden|collapse)$/,
	opacity: /^(?:0|1|0?\.\d{1,3})$/,
	"z-index": /^(?:auto|-?\d{1,9})$/,
	order: /^-?\d{1,5}$/
};
for (let e of /* @__PURE__ */ "width.height.min-width.min-height.max-width.max-height.top.right.bottom.left.margin-top.margin-right.margin-bottom.margin-left.padding-top.padding-right.padding-bottom.padding-left.font-size.line-height.letter-spacing.row-gap.column-gap.flex-basis.grid-template-columns.grid-template-rows.border-top-left-radius.border-top-right-radius.border-bottom-left-radius.border-bottom-right-radius".split(".")) J[e] = Qs;
for (let e of [
	"color",
	"background-color",
	"border-top-color",
	"border-right-color",
	"border-bottom-color",
	"border-left-color"
]) J[e] = $s;
for (let e of [
	"top",
	"right",
	"bottom",
	"left"
]) J[`border-${e}-width`] = Qs, J[`border-${e}-style`] = /^(?:none|hidden|dotted|dashed|solid|double|groove|ridge|inset|outset)$/;
for (let e of [
	"align-items",
	"align-self",
	"align-content",
	"justify-content",
	"justify-items",
	"justify-self"
]) J[e] = /^(?:normal|auto|stretch|start|end|center|flex-start|flex-end|baseline|space-between|space-around|space-evenly)$/;
for (let e of ["overflow-x", "overflow-y"]) J[e] = /^(?:visible|hidden|clip|scroll|auto)$/;
for (let e of ["flex-grow", "flex-shrink"]) J[e] = /^\d{1,3}(?:\.\d{1,3})?$/;
for (let e of [
	"grid-column-start",
	"grid-column-end",
	"grid-row-start",
	"grid-row-end"
]) J[e] = /^(?:auto|-?\d{1,3}|span \d{1,3})$/;
Object.freeze(Object.keys(J));
var ec = 4096;
function tc(e) {
	if (typeof e != "string" || e.length > 4096) return "";
	let t = /* @__PURE__ */ new Map();
	for (let n of e.split(";")) {
		let e = n.indexOf(":"), r = n.slice(0, e).trim(), i = n.slice(e + 1).trim();
		e > 0 && Object.hasOwn(J, r) && J[r].test(i) && t.set(r, i);
	}
	return [...t].map(([e, t]) => `${e}:${t}`).join(";");
}
// packages/core/src/privacy.ts
var nc = "[masked]", rc = [
	"button",
	"link",
	"textbox",
	"searchbox",
	"checkbox",
	"radio",
	"combobox",
	"spinbutton",
	"slider"
], ic = /* @__PURE__ */ "html.head.body.div.span.p.a.button.input.textarea.select.option.form.label.fieldset.legend.main.section.article.aside.header.footer.nav.ul.ol.li.dl.dt.dd.h1.h2.h3.h4.h5.h6.table.thead.tbody.tfoot.tr.td.th.caption.colgroup.col.br.hr.pre.code.strong.em.b.i.u.s.small.sub.sup.details.summary.dialog".split("."), Y = {
	nodes: 5e3,
	depth: 64,
	eventBytes: 524288
};
function ac(e) {
	if (typeof e != "string" || e.length > 8192) return "https://redacted.invalid/";
	try {
		let t = new URL(e);
		return ["http:", "https:"].includes(t.protocol) ? `${t.origin}${t.pathname === "/" ? "/" : "/[redacted]"}` : "https://redacted.invalid/";
	} catch {
		return "https://redacted.invalid/";
	}
}
// packages/core/src/replay.ts
var X = H().int().min(-1).max(0x38d7ea4c68000), Z = H().min(-0x38d7ea4c68000).max(0x38d7ea4c68000), oc = H().min(0).max(16384), sc = W({
	style: z().max(ec).refine((e) => tc(e) === e, "Replay style must use the safe presentation subset").optional(),
	type: G([
		"button",
		"checkbox",
		"color",
		"date",
		"datetime-local",
		"email",
		"file",
		"hidden",
		"image",
		"month",
		"number",
		"password",
		"radio",
		"range",
		"reset",
		"search",
		"submit",
		"tel",
		"text",
		"time",
		"url",
		"week"
	]).optional(),
	rr_width: z().regex(/^\d{1,5}(\.\d{1,3})?px$/).optional(),
	rr_height: z().regex(/^\d{1,5}(\.\d{1,3})?px$/).optional()
}), cc = {
	id: X,
	rootId: X.optional()
}, lc = qs(() => xs("type", [
	W({
		...cc,
		type: K(0),
		childNodes: U(lc).max(Y.nodes)
	}),
	W({
		...cc,
		type: K(1),
		name: K("html"),
		publicId: K(""),
		systemId: K("")
	}),
	W({
		...cc,
		type: K(2),
		tagName: G(ic),
		attributes: sc,
		childNodes: U(lc).max(Y.nodes),
		isShadow: us().optional(),
		isShadowHost: us().optional()
	}),
	W({
		...cc,
		type: K(3),
		textContent: K(nc)
	}),
	W({
		...cc,
		type: K(5),
		textContent: K("")
	})
])), uc = W({
	source: K(0),
	texts: U(W({
		id: X,
		value: K(nc)
	})).max(Y.nodes),
	attributes: U(W({
		id: X,
		attributes: sc
	})).max(Y.nodes),
	removes: U(W({
		id: X,
		parentId: X
	})).max(Y.nodes),
	adds: U(W({
		parentId: X,
		nextId: X.nullable(),
		node: lc
	})).max(Y.nodes)
}), dc = xs("type", [
	W({
		type: K(0),
		timestamp: Z,
		data: W({})
	}),
	W({
		type: K(1),
		timestamp: Z,
		data: W({})
	}),
	W({
		type: K(2),
		timestamp: Z,
		data: W({
			node: lc,
			initialOffset: W({
				left: Z,
				top: Z
			})
		})
	}),
	W({
		type: K(4),
		timestamp: Z,
		data: W({
			href: z().max(2048).refine((e) => ac(e) === e, "Replay URL must be sanitized"),
			width: oc,
			height: oc
		})
	}),
	W({
		type: K(3),
		timestamp: Z,
		data: xs("source", [
			uc,
			W({
				source: K(2),
				type: H().int().min(0).max(10),
				id: X,
				x: Z.optional(),
				y: Z.optional()
			}),
			W({
				source: K(3),
				id: X,
				x: Z,
				y: Z
			}),
			W({
				source: K(4),
				width: oc,
				height: oc
			}),
			W({
				source: K(5),
				id: X,
				text: K(nc),
				isChecked: K(!1)
			})
		])
	})
]).superRefine((e, t) => {
	new TextEncoder().encode(JSON.stringify(e)).byteLength > Y.eventBytes && t.addIssue({
		code: "custom",
		message: "Replay event exceeds its byte limit"
	});
	let n = (e.type === 2 ? [e.data.node] : e.type === 3 && e.data.source === 0 ? e.data.adds.map((e) => e.node) : []).map((e) => ({
		node: e,
		depth: 0
	})), r = 0;
	for (; n.length;) {
		let e = n.pop();
		if (++r > Y.nodes || e.depth > Y.depth) {
			t.addIssue({
				code: "custom",
				message: "Replay DOM node or depth limit exceeded"
			});
			break;
		}
		for (let t of e.node.childNodes ?? []) n.push({
			node: t,
			depth: e.depth + 1
		});
	}
});
new Set(rc);
// packages/core/src/hosted.ts
var fc = z().trim().min(1).max(80);
_s({
	id: V(),
	name: fc,
	created_at: q({ offset: !0 })
});
var pc = G([
	"open",
	"investigating",
	"resolved"
]), mc = _s({
	id: V(),
	project_id: V(),
	report_id: V(),
	title: z().min(1).max(160),
	platform: G([
		"web",
		"desktop",
		"mobile",
		"device"
	]),
	status: pc,
	lifecycle: G([
		"pending",
		"ready",
		"deleting"
	]),
	created_at: q({ offset: !0 }),
	expires_at: q({ offset: !0 }),
	lease_until: q({ offset: !0 }).nullable(),
	size_bytes: H().int().min(1).max(5242880)
});
_s({
	project_id: V(),
	public_key: V(),
	origin: z().max(300),
	enabled: us()
});
var Q = Object.freeze({
	durationMs: 3e5,
	events: 1e4,
	bytes: 5242880
}), hc = z().max(500), gc = z().max(8e3), _c = H().int().min(0).max(Q.durationMs), vc = z().max(2048).refine((e) => {
	try {
		let t = new URL(e);
		return ["http:", "https:"].includes(t.protocol) && !t.username && !t.password && !t.search && !t.hash;
	} catch {
		return !1;
	}
}, "Expected an HTTP(S) URL without credentials, query, or fragment"), $ = G([
	"available",
	"unavailable",
	"unsupported"
]), yc = xs("platform", [W({
	platform: K("web"),
	method: G([
		"chromium-extension",
		"website-sdk",
		"manual"
	])
}), W({
	platform: G([
		"desktop",
		"mobile",
		"device"
	]),
	method: K("manual")
})]), bc = W({
	atMs: _c,
	type: G([
		"click",
		"input",
		"navigation"
	]),
	target: hc,
	locator: W({
		kind: G([
			"testId",
			"role",
			"unavailable"
		]),
		value: hc
	}),
	valueMasked: us(),
	inputKind: G([
		"text",
		"password",
		"other"
	]).optional()
}), xc = W({
	atMs: _c,
	type: G(["exception", "unhandled-rejection"]),
	message: gc,
	stack: gc.optional()
}), Sc = W({
	atMs: _c,
	transport: G(["fetch", "xhr"]),
	method: G([
		"GET",
		"POST",
		"PUT",
		"PATCH",
		"DELETE",
		"HEAD",
		"OPTIONS",
		"OTHER"
	]),
	url: vc,
	status: H().int().min(0).max(599),
	outcome: G([
		"http-error",
		"network-error",
		"aborted",
		"timeout"
	])
}).refine((e) => e.outcome !== "http-error" || e.status >= 400, "HTTP failures need status >= 400"), Cc = W({
	kind: K("web"),
	page: W({ url: vc }).optional(),
	actions: U(bc).max(Q.events),
	errors: U(xc).max(1e3),
	failedRequests: U(Sc).max(1e3),
	replay: U(dc).max(Q.events).optional()
}), wc = W({
	formatVersion: ys([
		K(1),
		K(2),
		K(3),
		K(4)
	]),
	id: V(),
	source: yc,
	title: z().trim().min(1).max(160),
	description: z().max(1e4),
	capture: W({
		startedAt: q(),
		endedAt: q()
	}),
	environment: W({
		os: G([
			"Windows",
			"macOS",
			"Linux",
			"Android",
			"iOS",
			"unknown"
		]),
		browser: W({
			family: G([
				"Chromium",
				"Firefox",
				"WebKit",
				"unknown"
			]),
			majorVersion: H().int().min(1).max(999)
		}).optional(),
		viewport: W({
			width: H().int().min(1).max(16384),
			height: H().int().min(1).max(16384)
		}).optional()
	}),
	capabilities: W({
		interactions: $,
		replay: $,
		errors: $,
		requests: $,
		environment: $,
		playwright: $
	}),
	timeline: U(W({
		atMs: _c,
		kind: G([
			"capture-start",
			"interaction",
			"error",
			"request",
			"capture-stop",
			"note"
		]),
		label: hc
	})).max(Q.events),
	evidence: xs("kind", [Cc, W({ kind: K("none") })]),
	suggestedSteps: U(z().min(1).max(1e3)).max(100),
	limitations: U(z().min(1).max(1e3)).min(1).max(100)
}).superRefine((e, t) => {
	let n = Date.parse(e.capture.endedAt) - Date.parse(e.capture.startedAt), r = (e) => t.addIssue({
		code: "custom",
		message: e
	});
	(n < 0 || n > Q.durationMs) && r("Capture duration must be between 0 and 300000 ms"), e.source.platform !== "web" && e.evidence.kind !== "none" && r("Web evidence requires a web source"), e.source.platform !== "web" && (e.environment.browser || e.environment.viewport) && r("Browser environment requires a web source"), e.capabilities.playwright === "available" && (e.formatVersion < 4 || e.source.platform !== "web" || e.evidence.kind !== "web" || !e.evidence.actions.length) && r("Playwright drafts require v4 web action evidence"), e.evidence.kind === "web" && e.evidence.actions.some((t) => t.inputKind !== void 0 && (e.formatVersion < 4 || t.type !== "input")) && r("Input control metadata requires a v4 input action");
	let i = [e.timeline];
	if (e.evidence.kind === "web" && i.push(e.evidence.actions, e.evidence.errors, e.evidence.failedRequests), e.evidence.kind === "web" && e.evidence.replay) {
		if (e.formatVersion === 1 && r("Replay requires report version 2 or later"), e.formatVersion < 3) for (let t of e.evidence.replay) {
			t.type === 3 && t.data.source === 0 && t.data.attributes.some((e) => e.attributes.style !== void 0) && r("Replay presentation requires report version 3");
			let e = t.type === 2 ? [t.data.node] : t.type === 3 && t.data.source === 0 ? t.data.adds.map((e) => e.node) : [];
			for (; e.length;) {
				let t = e.pop();
				if (t.attributes?.style !== void 0) {
					r("Replay presentation requires report version 3");
					break;
				}
				e.push(...t.childNodes ?? []);
			}
		}
		i.push(e.evidence.replay.map((t) => ({ atMs: t.timestamp - Date.parse(e.capture.startedAt) }))), e.evidence.replay.some((e) => e.type === 2) !== (e.capabilities.replay === "available") && r("Replay availability must match a captured full snapshot");
	} else e.capabilities.replay === "available" && r("Replay availability requires captured replay evidence");
	for (let e of i) {
		let t = -1;
		for (let i of e) {
			if (i.atMs < t || i.atMs > n) {
				r("Events must be ordered and within capture duration");
				break;
			}
			t = i.atMs;
		}
	}
	i.reduce((e, t) => e + t.length, 0) > Q.events && r("Combined event limit exceeded");
	for (let t of [
		"interactions",
		"errors",
		"requests"
	]) {
		let n = e.evidence.kind === "web" ? e.evidence[t === "interactions" ? "actions" : t === "requests" ? "failedRequests" : "errors"] : [];
		e.evidence.kind === "none" && e.capabilities[t] === "available" && r(`${t} requires web evidence in v1`), n.length && e.capabilities[t] !== "available" && r(`${t} evidence requires an available capability`);
	}
}), Tc = class extends Error {
	code;
	constructor(e, t) {
		super(t), this.code = e, this.name = "ReportValidationError";
	}
};
function Ec(e) {
	if (e.length > Q.bytes || new TextEncoder().encode(e).byteLength > Q.bytes) throw new Tc("too-large", "Report exceeds the 5 MiB limit.");
	let t;
	try {
		t = JSON.parse(e);
	} catch {
		throw new Tc("invalid-json", "Report is not valid JSON.");
	}
	if (t && typeof t == "object" && "formatVersion" in t && t.formatVersion !== 1 && t.formatVersion !== 2 && t.formatVersion !== 3 && t.formatVersion !== 4) throw new Tc("unsupported-version", "Unsupported report version. This build supports versions 1, 2, 3 and 4.");
	let n = [{
		value: t,
		depth: 0
	}];
	for (; n.length;) {
		let e = n.pop();
		if (e.depth > 80) throw new Tc("invalid-report", "Report nesting limit exceeded.");
		if (e.value && typeof e.value == "object") for (let t of Object.values(e.value)) n.push({
			value: t,
			depth: e.depth + 1
		});
	}
	let r = wc.safeParse(t);
	if (!r.success) {
		let e = r.error.issues[0];
		throw new Tc("invalid-report", `Invalid report structure${e?.code === "custom" ? `: ${e.message}` : "."}`);
	}
	return r.data;
}
export { Q as LIMITS, Tc as ReportValidationError, mc as hostedReportSchema, Ec as parseReport };
