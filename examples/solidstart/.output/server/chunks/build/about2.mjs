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

var a = ["<main", "><h1>About</h1><p>This is a simple SolidStart application demonstrating Screenbook.</p><!--$-->", "<!--/--></main>"];
function c() {
  return ssr(a, ssrHydrationKey(), escape(createComponent(A, { href: "/", children: "Back to Home" })));
}

export { c as default };
//# sourceMappingURL=about2.mjs.map
