// page-flip 2.0.7 does not cancel its RAF loop on destroy. Keep this small,
// version-checked fix reproducible until upstream ships a lifecycle fix.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
const path = new URL(
  "../node_modules/page-flip/dist/js/page-flip.browser.js",
  import.meta.url,
);
if (existsSync(path)) {
  const source = readFileSync(path, "utf8");
  const before =
    "start(){this.update();const t=e=>{this.render(e),requestAnimationFrame(t)};requestAnimationFrame(t)}";
  const after =
    "start(){this.stopped=false;this.update();const t=e=>{if(this.stopped)return;this.render(e);this.frameId=requestAnimationFrame(t)};this.frameId=requestAnimationFrame(t)}stop(){this.stopped=true;cancelAnimationFrame(this.frameId);this.animation=null}";
  if (source.includes(before))
    writeFileSync(path, source.replace(before, after));
  else if (!source.includes(after))
    throw new Error(
      "Page-flip changed: review its animation cleanup before building.",
    );
}
