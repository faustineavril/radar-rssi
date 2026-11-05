"""Régénère index.html et embed.html à partir de content/editions.json et content/images.json.
Usage : python3 tools/build.py"""
import json, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ed = {e["year"]: e for e in json.load(open(os.path.join(ROOT, "content/editions.json"), encoding="utf-8"))}
meta = json.load(open(os.path.join(ROOT, "content/images.json")))
items = []
for m in meta:
    y = m["year"]
    it = {"year": y, "src": f"images/radar-{y}.webp", "width": m["w"], "height": m["h"],
          "alt": f"Radar du RSSI {y} : sujets de cybersécurité classés par maturité (mature, en tendance, émergent)",
          "zoomSrc": f"images/radar-{y}-hd.webp",
          "focus": ed[y]["focus"], "summary": ed[y]["summary"]}
    if m["w"] > 900:
        it["srcset"] = f"images/radar-{y}-900.webp 900w, images/radar-{y}.webp {m['w']}w"
    items.append(it)
opts = {"label": "Radar RSSI", "focusLabel": "Focus de l’année", "autoplayPages": 4,
        "hint": "Faites défiler pour remonter le temps"}
data = json.dumps({"options": opts, "items": items}, ensure_ascii=False, indent=2)
nos = "\n".join(
    f'      <figure><img src="images/radar-{m["year"]}.webp" width="{m["w"]}" height="{m["h"]}" loading="lazy" alt="Radar du RSSI {m["year"]}">'
    f'<figcaption><strong>{m["year"]} · {ed[m["year"]]["focus"]}</strong><br>{ed[m["year"]]["summary"]}</figcaption></figure>' for m in meta)
embed = f'''<!-- ===== Radar Book : début du bloc à intégrer ===== -->
<section class="wrb" data-radar-book aria-labelledby="wrb-title" aria-roledescription="rétrospective">
  <a class="wrb-skip" href="#apres-radars">Passer la rétrospective des radars</a>
  <div class="wrb-sticky">
    <header class="wrb-head">
      <div>
        <p class="wrb-kicker">Radar du RSSI · 2011 → 2026</p>
        <h2 class="wrb-title" id="wrb-title">15 ans de recul sur <em>les priorités des RSSI</em></h2>
      </div>
    </header>
  </div>
  <script type="application/json" class="wrb-data">
{data}
  </script>
  <noscript>
    <div class="wrb-noscript">
{nos}
    </div>
  </noscript>
</section>
<div id="apres-radars" tabindex="-1"></div>
<!-- ===== Radar Book : fin du bloc ===== -->'''
open(os.path.join(ROOT, "embed.html"), "w", encoding="utf-8").write(
    '<link rel="stylesheet" href="radar-book.css">\n' + embed + '\n<script src="radar-book.js" defer></script>\n')
tpl = open(os.path.join(ROOT, "tools/page.template.html"), encoding="utf-8").read()
analyse = open(os.path.join(ROOT, "content/analyse.html"), encoding="utf-8").read()
open(os.path.join(ROOT, "index.html"), "w", encoding="utf-8").write(tpl.replace("<!--EMBED-->", embed).replace("<!--ANALYSE-->", analyse))
open(os.path.join(ROOT, "embed-analyse.html"), "w", encoding="utf-8").write(
    '<link rel="stylesheet" href="retro.css">\n' + analyse + '<script src="retro.js" defer></script>\n')
print("ok:", len(items), "éditions")
