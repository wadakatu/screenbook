import { ssr, ssrHydrationKey, escape, createComponent } from 'solid-js/web';
import { M as Me } from './routing-DDvTknO6.mjs';
import { A } from './components-D15TTHey.mjs';
import 'solid-js';

var m = ["<main", "><h1>User Detail</h1><p>Viewing user with ID: <!--$-->", "<!--/--></p><!--$-->", "<!--/--></main>"];
function f() {
  const e = Me();
  return ssr(m, ssrHydrationKey(), escape(e.id), escape(createComponent(A, { href: "/users", children: "Back to Users" })));
}

export { f as default };
//# sourceMappingURL=index2.mjs.map
