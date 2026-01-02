import { ssr, ssrHydrationKey, escape, createComponent } from 'solid-js/web';
import { For } from 'solid-js';
import { A } from './components-5qVGEn7f.mjs';
import '../nitro/nitro.mjs';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'node:path';
import 'node:crypto';
import 'node:async_hooks';
import 'vinxi/lib/invariant';
import 'vinxi/lib/path';
import 'node:url';
import 'seroval';
import 'seroval-plugins/web';
import 'solid-js/web/storage';

var a = ["<main", "><h1>Users</h1><ul>", "</ul><!--$-->", "<!--/--></main>"], s = ["<li", ">", "</li>"];
const l = [{ id: 1, name: "Alice" }, { id: 2, name: "Bob" }, { id: 3, name: "Charlie" }];
function u() {
  return ssr(a, ssrHydrationKey(), escape(createComponent(For, { each: l, children: (i) => ssr(s, ssrHydrationKey(), escape(createComponent(A, { get href() {
    return `/users/${i.id}`;
  }, get children() {
    return i.name;
  } }))) })), escape(createComponent(A, { href: "/", children: "Back to Home" })));
}

export { u as default };
//# sourceMappingURL=index32.mjs.map
