"""Build sheet SVG/PDF, masks, simulated coloured photos and config.json."""
import base64, io, json, math, os, subprocess, sys
import numpy as np
from PIL import Image, ImageFilter
import sheets as S

OUT = os.path.join(os.path.dirname(__file__), "build")
os.makedirs(OUT, exist_ok=True)
APP_URL = os.environ.get("APP_URL", "")

INK = "#26231f"
LINE = 1.5
FONT = "'Fredoka', 'Poppins', sans-serif"


# ------------------------------------------------------------------ pieces
def cow_group(tx, ty, sc, fills=None, lines=True, only_silhouette=False, margin=0.0):
    """Return <g> for the cow. fills: dict kind->colour for simulated colouring."""
    out = [f'<g transform="translate({tx} {ty}) scale({sc})">']
    if only_silhouette:
        # union of all parts, dilated by margin (in page mm -> local units)
        sw = 2 * margin / sc
        for kind, d in S.COW_PARTS:
            out.append(f'<path d="{d}" fill="#000" stroke="#000" stroke-width="{sw:.3f}" '
                       f'stroke-linejoin="round" stroke-linecap="round"/>')
        out.append("</g>")
        return "\n".join(out)
    lw = LINE / sc
    for kind, d in S.COW_PARTS:
        f = (fills or {}).get(kind, "#fff") if fills is not None else "#fff"
        st = f'stroke="{INK}" stroke-width="{lw:.3f}" stroke-linejoin="round"' if lines else 'stroke="none"'
        out.append(f'<path d="{d}" fill="{f}" {st}/>')
    for kind, d in S.COW_DETAILS:
        f = (fills or {}).get(kind, "none") if fills is not None else "none"
        st = f'stroke="{INK}" stroke-width="{lw*0.85:.3f}" stroke-linejoin="round"' if lines else 'stroke="none"'
        out.append(f'<path d="{d}" fill="{f}" {st}/>')
    if lines:
        for (x, y) in S.COW_EYES:
            out.append(f'<ellipse cx="{x}" cy="{y}" rx="2.4" ry="3" fill="{INK}"/>')
            out.append(f'<circle cx="{x+0.8}" cy="{y-1.1}" r="0.8" fill="#fff"/>')
        for (x, y) in S.COW_NOSTRILS:
            out.append(f'<ellipse cx="{x}" cy="{y}" rx="2.2" ry="1.6" fill="{INK}"/>')
        out.append(f'<path d="{S.COW_MOUTH}" fill="none" stroke="{INK}" stroke-width="{lw*0.85:.3f}" stroke-linecap="round"/>')
    out.append("</g>")
    return "\n".join(out)


def marker_svg(x, y, mid):
    g = S.marker_bits(mid)
    c = S.CELL
    parts = [f'<rect x="{x-c:.3f}" y="{y-c:.3f}" width="{S.MARKER+2*c:.3f}" height="{S.MARKER+2*c:.3f}" fill="#fff"/>',
             f'<rect x="{x}" y="{y}" width="{S.MARKER}" height="{S.MARKER}" fill="#000"/>']
    for r in range(7):
        for cc in range(7):
            if g[r][cc]:
                parts.append(f'<rect x="{x+cc*c:.3f}" y="{y+r*c:.3f}" width="{c+0.02:.3f}" height="{c+0.02:.3f}" fill="#fff"/>')
    return "\n".join(parts)


def qr_svg(url, x, y, size):
    if not url:
        return ""
    import qrcode
    q = qrcode.QRCode(border=0, error_correction=qrcode.constants.ERROR_CORRECT_M)
    q.add_data(url); q.make(fit=True)
    m = q.get_matrix(); n = len(m); c = size / n
    rects = [f'<rect x="{x+j*c:.3f}" y="{y+i*c:.3f}" width="{c+0.03:.3f}" height="{c+0.03:.3f}"/>'
             for i in range(n) for j in range(n) if m[i][j]]
    return f'<g fill="#000">{"".join(rects)}</g>'


def letter_tile(L, fills=None, trace=None):
    x, y, w, h = L["x"], S.TILE_Y, S.TILE_W, S.TILE_H
    out = [f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="5" fill="#fff" stroke="#b9b2a6" stroke-width="0.5" stroke-dasharray="1.6 1.4"/>']
    # baseline guides
    out.append(f'<line x1="{x+3}" x2="{x+w-3}" y1="{y+h-9}" y2="{y+h-9}" stroke="#cfc8bc" stroke-width="0.4"/>')
    out.append(f'<line x1="{x+3}" x2="{x+w-3}" y1="{y+9}" y2="{y+9}" stroke="#e1dbd0" stroke-width="0.4"/>')
    # dashed letter to trace
    out.append(f'<text x="{x+w/2}" y="{y+h-9}" text-anchor="middle" font-family="{FONT}" font-weight="500" '
               f'font-size="50" fill="#f1ede6" stroke="#8f877b" stroke-width="0.55" stroke-dasharray="1.5 1.3">{L["ch"]}</text>')
    if trace:  # simulated child tracing
        out.append(f'<text x="{x+w/2+0.6}" y="{y+h-9.4}" text-anchor="middle" font-family="{FONT}" font-weight="500" '
                   f'font-size="50" fill="none" stroke="{trace}" stroke-width="2.6" stroke-linejoin="round" '
                   f'stroke-linecap="round" transform="rotate(-1.2 {x+w/2} {y+h/2})">{L["ch"]}</text>')
    return "\n".join(out)


def page(sheet_key, colored=False):
    sh = S.SHEETS[sheet_key]
    body = [f'<rect width="{S.PAGE_W}" height="{S.PAGE_H}" fill="#fff"/>']
    for k, (x, y) in S.MARKER_POS.items():
        body.append(marker_svg(x, y, sh["ids"][k]))

    fills = None
    if colored:
        fills = {"part": "#f2a33a", "leg": "#f2a33a", "hoof": "#5b4636", "spot": "#7a4b2a"}

    if sheet_key == "warna-sapi":
        body.append(f'<text x="105" y="22" text-anchor="middle" font-family="{FONT}" font-weight="700" font-size="13" fill="{INK}">Sapi</text>')
        body.append(f'<text x="105" y="30.5" text-anchor="middle" font-family="{FONT}" font-weight="500" font-size="4.6" fill="#6d6559">Lembar 1 · Mewarnai</text>')
        c = S.SHEET1_COW
        # ground (not part of the cut-out)
        gy = c["y"] + S.COW_FEET_Y * c["scale"]
        body.append(f'<path d="M24 {gy+1} C60 {gy-2} 150 {gy-2} 186 {gy+1}" fill="none" stroke="{INK}" stroke-width="0.9" stroke-linecap="round"/>')
        for gx in (30, 52, 150, 172):
            body.append(f'<path d="M{gx} {gy} l2 -6 l2 6 l2 -5 l1.5 5" fill="none" stroke="{INK}" stroke-width="0.8" stroke-linejoin="round"/>')
        body.append(cow_group(c["x"], c["y"], c["scale"], fills=fills))
        tip_y = 224
        body.append(f'<text x="105" y="{tip_y}" text-anchor="middle" font-family="{FONT}" font-weight="600" font-size="5.2" fill="{INK}">Warnai sapinya sesukamu!</text>')
    else:
        body.append(f'<text x="105" y="21" text-anchor="middle" font-family="{FONT}" font-weight="700" font-size="10" fill="{INK}">Tebalkan Hurufnya</text>')
        body.append(f'<text x="105" y="29" text-anchor="middle" font-family="{FONT}" font-weight="500" font-size="4.6" fill="#6d6559">Lembar 2 · Menulis</text>')
        c = S.SHEET2_COW
        gy = c["y"] + S.COW_FEET_Y * c["scale"]
        body.append(f'<path d="M58 {gy+0.8} C80 {gy-1} 130 {gy-1} 152 {gy+0.8}" fill="none" stroke="{INK}" stroke-width="0.7" stroke-linecap="round"/>')
        body.append(cow_group(c["x"], c["y"], c["scale"], fills=fills))
        body.append(f'<text x="105" y="{S.TILE_Y-7}" text-anchor="middle" font-family="{FONT}" font-weight="600" font-size="5.2" fill="{INK}">Tebalkan huruf di bawah ini</text>')
        body.append(f'<text x="105" y="{S.TILE_Y+S.TILE_H+11}" text-anchor="middle" font-family="{FONT}" font-weight="500" font-size="4.4" fill="#6d6559">Sudah? Ayo eja bersama Ayah/Bunda!</text>')
        for L in S.LETTERS:
            body.append(letter_tile(L, trace="#2f5fa8" if colored else None))
        tip_y = 222
    # parent instructions + QR
    qr = qr_svg(APP_URL, 157, 236, 22) if APP_URL else ""
    tx = 40
    steps = ["Untuk Ayah/Bunda:",
             "1. Setelah selesai, buka aplikasinya (pindai QR ini).",
             "2. Ketuk Pindai, foto seluruh halaman dari atas.",
             "3. Pastikan 4 kotak hitam di pojok ikut terfoto.",
             "Jangan warnai kotak hitam di pojok ya."]
    for i, s in enumerate(steps):
        w = "600" if i == 0 else "500"
        col = INK if i < 4 else "#b0442a"
        body.append(f'<text x="{tx}" y="{246+i*6}" font-family="{FONT}" font-weight="{w}" font-size="3.9" fill="{col}">{s}</text>')
    if qr:
        body.append(qr)
    body.append(f'<text x="105" y="{S.PAGE_H-5}" text-anchor="middle" font-family="{FONT}" font-weight="500" font-size="2.8" fill="#9a9184">Prototipe · Gambarku Hidup · Level 1</text>')
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{S.PAGE_W}mm" height="{S.PAGE_H}mm" '
            f'viewBox="0 0 {S.PAGE_W} {S.PAGE_H}">\n' + "\n".join(body) + "\n</svg>")


def render_png(svg, path, px_per_mm):
    sp = path.replace(".png", ".svg")
    open(sp, "w").write(svg)
    w = int(S.PAGE_W * px_per_mm)
    subprocess.run(["rsvg-convert", "-w", str(w), "-o", path, sp], check=True)


def mask_png(group_svg, box, px_per_mm, path):
    """Render a silhouette mask for a page-mm box -> PNG (white = keep)."""
    x, y, w, h = box
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" width="{w*px_per_mm}" height="{h*px_per_mm}" '
           f'viewBox="{x} {y} {w} {h}"><rect x="{x}" y="{y}" width="{w}" height="{h}" fill="#fff"/>{group_svg}</svg>')
    sp = path.replace(".png", ".svg"); open(sp, "w").write(svg)
    subprocess.run(["rsvg-convert", "-o", path, sp], check=True)
    im = Image.open(path).convert("L")
    a = 255 - np.array(im)  # black silhouette -> 255
    out = Image.fromarray(a.astype(np.uint8))
    out.save(path)
    return out


def b64png(img):
    buf = io.BytesIO(); img.save(buf, "PNG", optimize=True)
    return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()


def build_config():
    cfg = {"page": [S.PAGE_W, S.PAGE_H], "sheets": {}}
    margin = 2.6
    for key, sh in S.SHEETS.items():
        markers = {}
        for k, (x, y) in S.MARKER_POS.items():
            m = S.MARKER
            markers[str(sh["ids"][k])] = [[x, y], [x + m, y], [x + m, y + m], [x, y + m]]
        pieces = []
        cow = S.SHEET1_COW if key == "warna-sapi" else S.SHEET2_COW
        sc = cow["scale"]
        m_loc = margin * (sc ** 0.5) / sc
        bx = cow["x"] - 6 * sc; by = cow["y"] + 18 * sc
        bw = (S.COW_BOX_W + 14) * sc; bh = (S.COW_FEET_Y + 1.6 + m_loc - 18) * sc
        box = [round(bx, 3), round(by, 3), round(bw, 3), round(bh, 3)]
        mp = os.path.join(OUT, f"mask-{key}-cow.png")
        mimg = mask_png(cow_group(cow["x"], cow["y"], sc, only_silhouette=True, margin=margin * (sc ** 0.5)),
                        box, 4, mp)
        legs = [{"x": round(cow["x"] + l["cx"] * sc, 2), "y": round(cow["y"] + l["cy"] * sc, 2),
                 "r": round(l["r"] * sc, 2)} for l in S.COW_LEGS]
        pieces.append({"id": "cow", "kind": "animal", "box": box,
                       "hingeY": round(by + bh, 3),
                       "mask": b64png(mimg), "legs": legs})
        if key == "tebal-sapi":
            for i, L in enumerate(S.LETTERS):
                pieces.append({"id": f"letter{i}", "kind": "letter", "ch": L["ch"], "index": i,
                               "box": [round(L["x"], 3), S.TILE_Y, S.TILE_W, S.TILE_H],
                               "hingeY": S.TILE_Y + S.TILE_H, "radius": 5})
        questions = [{"id": q["id"], "prompt": q["prompt"], "noun": q["noun"], "piece": "cow",
                      "items": [{"x": round(cow["x"] + it["cx"] * sc, 2), "y": round(cow["y"] + it["cy"] * sc, 2),
                                 "r": round(it["r"] * sc, 2)} for it in q["items"]]}
                     for q in S.COW_COUNT]
        # prompt/answer kept for the old prototype app, which only knows the legs question
        task = ({"type": "count", "prompt": "Ada berapa kaki sapi?", "answer": 4, "questions": questions}
                if key == "warna-sapi" else
                {"type": "spell", "syllables": S.SYLLABLES, "word": S.WORD})
        cfg["sheets"][key] = {"title": "Sapi" if key == "warna-sapi" else "SAPI",
                              "markers": markers, "pieces": pieces, "task": task}
    return cfg


if __name__ == "__main__":
    pngs = []
    for key in S.SHEETS:
        svg = page(key)
        open(os.path.join(OUT, f"{key}.svg"), "w").write(svg)
        render_png(svg, os.path.join(OUT, f"{key}.png"), 4)
        render_png(page(key, colored=True), os.path.join(OUT, f"{key}-colored.png"), 6)
    cfg = build_config()
    json.dump(cfg, open(os.path.join(OUT, "config.json"), "w"))
    # PDF (vector)
    svgs = [os.path.join(OUT, f"{k}.svg") for k in S.SHEETS]
    subprocess.run(["rsvg-convert", "-f", "pdf", "-o", os.path.join(OUT, "Kotak-Hidup-Sapi-Level1.pdf")] + svgs, check=True)
    print("ok", os.listdir(OUT))
