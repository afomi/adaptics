/**
 * Capture /org: load (small), step up through each org size while orbiting toward
 * a top-down view, then slide AI automation to 100%.
 *
 * Run (server must already be up on :4010):
 *   node ~/workspace/playcap/bin/playcap.mjs scripts/captures/org_topology.mjs \
 *     --out tmp/captures/org-topology.mp4 --preset landscape --headed
 *
 * --headed matters: headless Chromium uses software WebGL and cannot keep up with
 * the 2400-node XL org, which stretches the recording to ~90 s.
 */

export const meta = {
  url: "http://localhost:4010/org",
  duration: 11,
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function setSlider(page, selector, value) {
  await page.$eval(
    selector,
    (el, v) => {
      el.value = String(v);
      el.dispatchEvent(new Event("input", { bubbles: true }));
    },
    value
  );
}

export default async function orgTopology(page, ctx) {
  await page.goto(ctx.url, { waitUntil: "load" });
  await page.waitForSelector("#org-container canvas");
  // Let the small org (the default) start to unfold, then orbit toward
  // top-down a beat or two before stepping through sizes, so small → medium →
  // large → xl is seen mostly from above.
  await sleep(400);
  await page.evaluate(() => window.org.orbitTo(0.12, 1800));
  await sleep(1400);

  for (const size of ["medium", "large", "xl"]) {
    await page.click(`#org-size [data-size="${size}"]`);
    await sleep(1400);
  }
  await sleep(400);

  // Slide AI automation 0 → 100 over ~3 s in 2% steps.
  for (let v = 0; v <= 100; v += 2) {
    await setSlider(page, "#org-ai", v);
    await sleep(50);
  }
  await sleep(1000);
}
