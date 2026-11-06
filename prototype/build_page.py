"""Assemble the single-file web app (artifact body + standalone HTML)."""
import base64, json, os

ROOT = os.path.dirname(os.path.abspath(__file__))
B = os.path.join(ROOT, "build")
DIST = os.path.join(ROOT, "dist")
os.makedirs(os.path.join(DIST, "standalone"), exist_ok=True)


def read(p):
    return open(os.path.join(ROOT, p), encoding="utf-8").read()


def jpg_uri(p):
    return "data:image/jpeg;base64," + base64.b64encode(open(os.path.join(B, p), "rb").read()).decode()


cfg = json.load(open(os.path.join(B, "config.json")))
html = read("src/template.html")
html = html.replace("{{CONFIG}}", json.dumps(cfg, separators=(",", ":")).replace("</", "<\\/"))
html = html.replace("{{DEMO_WARNA}}", jpg_uri("photo-warna.jpg")).replace("{{DEMO_TEBAL}}", jpg_uri("photo-tebal.jpg"))
html = html.replace("{{ARUCO}}", read("vendor/aruco-bundle.js"))
html = html.replace("{{CORE}}", read("src/core.js"))
html = html.replace("{{APP}}", read("src/app.js"))

open(os.path.join(DIST, "gambarku-hidup.html"), "w", encoding="utf-8").write(html)
standalone = ('<!doctype html><html lang="id"><head><meta charset="utf-8">'
              '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
              '<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}'
              'body{margin:0}img{max-width:100%}[hidden]{display:none!important}</style></head><body>'
              + html + "</body></html>")
open(os.path.join(DIST, "standalone", "index.html"), "w", encoding="utf-8").write(standalone)
print("page bytes", len(html))
