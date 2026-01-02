import { ssr, ssrHydrationKey, escape, createComponent } from 'solid-js/web';
import { A } from './components-D15TTHey.mjs';
import 'solid-js';
import './routing-DDvTknO6.mjs';

var a = ["<main", "><h1>About</h1><p>This is a simple SolidStart application demonstrating Screenbook.</p><!--$-->", "<!--/--></main>"];
function c() {
  return ssr(a, ssrHydrationKey(), escape(createComponent(A, { href: "/", children: "Back to Home" })));
}

export { c as default };
//# sourceMappingURL=about.mjs.map
