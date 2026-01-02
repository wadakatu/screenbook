import { ssr, ssrHydrationKey, escape, createComponent } from 'solid-js/web';
import { A } from './components-D15TTHey.mjs';
import 'solid-js';
import './routing-DDvTknO6.mjs';

var a = ["<main", "><h1>Welcome to SolidStart</h1><p>This is a SolidStart example with Screenbook integration.</p><nav><ul><li>", "</li><li>", "</li></ul></nav></main>"];
function p() {
  return ssr(a, ssrHydrationKey(), escape(createComponent(A, { href: "/about", children: "About" })), escape(createComponent(A, { href: "/users", children: "Users" })));
}

export { p as default };
//# sourceMappingURL=index.mjs.map
