import { ssr, ssrHydrationKey, escape, createComponent } from 'solid-js/web';
import { A } from './components-5qVGEn7f.mjs';
import 'solid-js';
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

var a = ["<main", "><h1>Welcome to SolidStart</h1><p>This is a SolidStart example with Screenbook integration.</p><nav><ul><li>", "</li><li>", "</li></ul></nav></main>"];
function p() {
  return ssr(a, ssrHydrationKey(), escape(createComponent(A, { href: "/about", children: "About" })), escape(createComponent(A, { href: "/users", children: "Users" })));
}

export { p as default };
//# sourceMappingURL=index4.mjs.map
