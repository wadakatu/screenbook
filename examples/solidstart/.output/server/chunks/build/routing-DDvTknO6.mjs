import { useContext, createContext, createMemo, createSignal, createRenderEffect, on, runWithOwner, getOwner, startTransition, resetErrorBoundaries, batch, untrack, createComponent } from 'solid-js';
import { isServer, getRequestEvent } from 'solid-js/web';

function ge() {
  let t = /* @__PURE__ */ new Set();
  function e(r) {
    return t.add(r), () => t.delete(r);
  }
  let n = false;
  function s(r, o) {
    if (n) return !(n = false);
    const a = { to: r, options: o, defaultPrevented: false, preventDefault: () => a.defaultPrevented = true };
    for (const c of t) c.listener({ ...a, from: c.location, retry: (f) => {
      f && (n = true), c.navigate(r, { ...o, resolve: false });
    } });
    return !a.defaultPrevented;
  }
  return { subscribe: e, confirm: s };
}
let M;
function Q() {
  (!window.history.state || window.history.state._depth == null) && window.history.replaceState({ ...window.history.state, _depth: window.history.length - 1 }, ""), M = window.history.state._depth;
}
isServer || Q();
function Fe(t) {
  return { ...t, _depth: window.history.state && window.history.state._depth };
}
function qe(t, e) {
  let n = false;
  return () => {
    const s = M;
    Q();
    const r = s == null ? null : M - s;
    if (n) {
      n = false;
      return;
    }
    r && e(r) ? (n = true, window.history.go(-r)) : t();
  };
}
const ye = /^(?:[a-z0-9]+:)?\/\//i, we = /^\/+|(\/)\/+$/g, ve = "http://sr";
function E(t, e = false) {
  const n = t.replace(we, "$1");
  return n ? e || /^[?#]/.test(n) ? n : "/" + n : "";
}
function q(t, e, n) {
  if (ye.test(e)) return;
  const s = E(t), r = n && E(n);
  let o = "";
  return !r || e.startsWith("/") ? o = s : r.toLowerCase().indexOf(s.toLowerCase()) !== 0 ? o = s + r : o = r, (o || "/") + E(e, !o);
}
function Re(t, e) {
  if (t == null) throw new Error(e);
  return t;
}
function Pe(t, e) {
  return E(t).replace(/\/*(\*.*)?$/g, "") + E(e);
}
function V(t) {
  const e = {};
  return t.searchParams.forEach((n, s) => {
    s in e ? Array.isArray(e[s]) ? e[s].push(n) : e[s] = [e[s], n] : e[s] = n;
  }), e;
}
function xe(t, e, n) {
  const [s, r] = t.split("/*", 2), o = s.split("/").filter(Boolean), a = o.length;
  return (c) => {
    const f = c.split("/").filter(Boolean), h = f.length - a;
    if (h < 0 || h > 0 && r === void 0 && !e) return null;
    const l = { path: a ? "" : "/", params: {} }, m = (d) => n === void 0 ? void 0 : n[d];
    for (let d = 0; d < a; d++) {
      const p = o[d], y = p[0] === ":", v = y ? f[d] : f[d].toLowerCase(), C = y ? p.slice(1) : p.toLowerCase();
      if (y && $(v, m(C))) l.params[C] = v;
      else if (y || !$(v, C)) return null;
      l.path += `/${v}`;
    }
    if (r) {
      const d = h ? f.slice(-h).join("/") : "";
      if ($(d, m(r))) l.params[r] = d;
      else return null;
    }
    return l;
  };
}
function $(t, e) {
  const n = (s) => s === t;
  return e === void 0 ? true : typeof e == "string" ? n(e) : typeof e == "function" ? e(t) : Array.isArray(e) ? e.some(n) : e instanceof RegExp ? e.test(t) : false;
}
function be(t) {
  const [e, n] = t.pattern.split("/*", 2), s = e.split("/").filter(Boolean);
  return s.reduce((r, o) => r + (o.startsWith(":") ? 2 : 3), s.length - (n === void 0 ? 0 : 1));
}
function Y(t) {
  const e = /* @__PURE__ */ new Map(), n = getOwner();
  return new Proxy({}, { get(s, r) {
    return e.has(r) || runWithOwner(n, () => e.set(r, createMemo(() => t()[r]))), e.get(r)();
  }, getOwnPropertyDescriptor() {
    return { enumerable: true, configurable: true };
  }, ownKeys() {
    return Reflect.ownKeys(t());
  }, has(s, r) {
    return r in t();
  } });
}
function Z(t) {
  let e = /(\/?\:[^\/]+)\?/.exec(t);
  if (!e) return [t];
  let n = t.slice(0, e.index), s = t.slice(e.index + e[0].length);
  const r = [n, n += e[1]];
  for (; e = /^(\/\:[^\/]+)\?/.exec(s); ) r.push(n += e[1]), s = s.slice(e[0].length);
  return Z(s).reduce((o, a) => [...o, ...r.map((c) => c + a)], []);
}
const Ae = 100, Ce = createContext(), ee = createContext(), W = () => Re(useContext(Ce), "<A> and 'use' router primitives can be only used inside a Route."), Ee = () => useContext(ee) || W().base, We = (t) => {
  const e = Ee();
  return createMemo(() => e.resolvePath(t()));
}, $e = (t) => {
  const e = W();
  return createMemo(() => {
    const n = t();
    return n !== void 0 ? e.renderPath(n) : n;
  });
}, Ie = () => W().location, Me = () => W().params;
function Le(t, e = "") {
  const { component: n, preload: s, load: r, children: o, info: a } = t, c = !o || Array.isArray(o) && !o.length, f = { key: t, component: n, preload: s || r, info: a };
  return te(t.path).reduce((h, l) => {
    for (const m of Z(l)) {
      const d = Pe(e, m);
      let p = c ? d : d.split("/*", 1)[0];
      p = p.split("/").map((y) => y.startsWith(":") || y.startsWith("*") ? y : encodeURIComponent(y)).join("/"), h.push({ ...f, originalPath: l, pattern: p, matcher: xe(p, !c, t.matchFilters) });
    }
    return h;
  }, []);
}
function Se(t, e = 0) {
  return { routes: t, score: be(t[t.length - 1]) * 1e4 - e, matcher(n) {
    const s = [];
    for (let r = t.length - 1; r >= 0; r--) {
      const o = t[r], a = o.matcher(n);
      if (!a) return null;
      s.unshift({ ...a, route: o });
    }
    return s;
  } };
}
function te(t) {
  return Array.isArray(t) ? t : [t];
}
function Oe(t, e = "", n = [], s = []) {
  const r = te(t);
  for (let o = 0, a = r.length; o < a; o++) {
    const c = r[o];
    if (c && typeof c == "object") {
      c.hasOwnProperty("path") || (c.path = "");
      const f = Le(c, e);
      for (const h of f) {
        n.push(h);
        const l = Array.isArray(c.children) && c.children.length === 0;
        if (c.children && !l) Oe(c.children, h.pattern, n, s);
        else {
          const m = Se([...n], s.length);
          s.push(m);
        }
        n.pop();
      }
    }
  }
  return n.length ? s : s.sort((o, a) => a.score - o.score);
}
function I(t, e) {
  for (let n = 0, s = t.length; n < s; n++) {
    const r = t[n].matcher(e);
    if (r) return r;
  }
  return [];
}
function _e(t, e, n) {
  const s = new URL(ve), r = createMemo((l) => {
    const m = t();
    try {
      return new URL(m, s);
    } catch {
      return console.error(`Invalid path ${m}`), l;
    }
  }, s, { equals: (l, m) => l.href === m.href }), o = createMemo(() => r().pathname), a = createMemo(() => r().search, true), c = createMemo(() => r().hash), f = () => "", h = on(a, () => V(r()));
  return { get pathname() {
    return o();
  }, get search() {
    return a();
  }, get hash() {
    return c();
  }, get state() {
    return e();
  }, get key() {
    return f();
  }, query: n ? n(h) : Y(h) };
}
let R;
function De() {
  return R;
}
function Ue(t, e, n, s = {}) {
  const { signal: [r, o], utils: a = {} } = t, c = a.parsePath || ((i) => i), f = a.renderPath || ((i) => i), h = a.beforeLeave || ge(), l = q("", s.base || "");
  if (l === void 0) throw new Error(`${l} is not a valid base path`);
  l && !r().value && o({ value: l, replace: true, scroll: false });
  const [m, d] = createSignal(false);
  let p;
  const y = (i, u) => {
    u.value === v() && u.state === L() || (p === void 0 && d(true), R = i, p = u, startTransition(() => {
      p === u && (C(p.value), ne(p.state), resetErrorBoundaries(), isServer || U[1]((g) => g.filter((P) => P.pending)));
    }).finally(() => {
      p === u && batch(() => {
        R = void 0, i === "navigate" && ae(p), d(false), p = void 0;
      });
    }));
  }, [v, C] = createSignal(r().value), [L, ne] = createSignal(r().state), S = _e(v, L, a.queryWrapper), O = [], U = createSignal(isServer ? ce() : []), z = createMemo(() => typeof s.transformUrl == "function" ? I(e(), s.transformUrl(S.pathname)) : I(e(), S.pathname)), H = () => {
    const i = z(), u = {};
    for (let g = 0; g < i.length; g++) Object.assign(u, i[g].params);
    return u;
  }, re = a.paramsWrapper ? a.paramsWrapper(H, e) : Y(H), K = { pattern: l, path: () => l, outlet: () => null, resolvePath(i) {
    return q(l, i);
  } };
  return createRenderEffect(on(r, (i) => y("native", i), { defer: true })), { base: K, location: S, params: re, isRouting: m, renderPath: f, parsePath: c, navigatorFactory: oe, matches: z, beforeLeave: h, preloadRoute: ie, singleFlight: s.singleFlight === void 0 ? true : s.singleFlight, submissions: U };
  function se(i, u, g) {
    untrack(() => {
      if (typeof u == "number") {
        u && (a.go ? a.go(u) : console.warn("Router integration does not support relative routing"));
        return;
      }
      const P = !u || u[0] === "?", { replace: _, resolve: x, scroll: j, state: b } = { replace: false, resolve: !P, scroll: true, ...g }, A = x ? i.resolvePath(u) : q(P && S.pathname || "", u);
      if (A === void 0) throw new Error(`Path '${u}' is not a routable path`);
      if (O.length >= Ae) throw new Error("Too many redirects");
      const T = v();
      if (A !== T || b !== L()) if (isServer) {
        const k = getRequestEvent();
        k && (k.response = { status: 302, headers: new Headers({ Location: A }) }), o({ value: A, replace: _, scroll: j, state: b });
      } else h.confirm(A, g) && (O.push({ value: T, replace: _, scroll: j, state: L() }), y("navigate", { value: A, state: b }));
    });
  }
  function oe(i) {
    return i = i || useContext(ee) || K, (u, g) => se(i, u, g);
  }
  function ae(i) {
    const u = O[0];
    u && (o({ ...i, replace: u.replace, scroll: u.scroll }), O.length = 0);
  }
  function ie(i, u) {
    const g = I(e(), i.pathname), P = R;
    R = "preload";
    for (let _ in g) {
      const { route: x, params: j } = g[_];
      x.component && x.component.preload && x.component.preload();
      const { preload: b } = x;
      u && b && runWithOwner(n(), () => b({ params: j, location: { pathname: i.pathname, search: i.search, hash: i.hash, query: V(i), state: null, key: "" }, intent: "preload" }));
    }
    R = P;
  }
  function ce() {
    const i = getRequestEvent();
    return i && i.router && i.router.submission ? [i.router.submission] : [];
  }
}
function ze(t, e, n, s) {
  const { base: r, location: o, params: a } = t, { pattern: c, component: f, preload: h } = s().route, l = createMemo(() => s().path);
  f && f.preload && f.preload();
  const m = h ? h({ params: a, location: o, intent: R || "initial" }) : void 0;
  return { parent: e, pattern: c, path: l, outlet: () => f ? createComponent(f, { params: a, location: o, data: m, get children() {
    return n();
  } }) : n(), resolvePath(p) {
    return q(r.path(), p, l());
  } };
}

export { $e as $, Ce as C, De as D, E, Fe as F, Ie as I, Me as M, Oe as O, Q, Ue as U, We as W, I as a, ee as e, ge as g, qe as q, ve as v, ze as z };
//# sourceMappingURL=routing-DDvTknO6.mjs.map
