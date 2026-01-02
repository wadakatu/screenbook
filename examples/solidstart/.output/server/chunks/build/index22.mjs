import { ssr, ssrHydrationKey, escape, createComponent } from 'solid-js/web';
import { M as Me } from '../nitro/nitro.mjs';
import { A } from './components-5qVGEn7f.mjs';
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
import 'solid-js';
import 'solid-js/web/storage';

var m = ["<main", "><h1>User Detail</h1><p>Viewing user with ID: <!--$-->", "<!--/--></p><!--$-->", "<!--/--></main>"];
function f() {
  const e = Me();
  return ssr(m, ssrHydrationKey(), escape(e.id), escape(createComponent(A, { href: "/users", children: "Back to Users" })));
}

export { f as default };
//# sourceMappingURL=index22.mjs.map
