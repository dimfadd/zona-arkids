"""Roket Kertas: the cow, written in sand3d. Lengths in mm, the cow along X with its head at +X, Z up.
Every part a child may tap or colour has its own name: badan, kepala, moncong, kuping_*, tanduk_*,
kaki_*, kuku_*, ekor, ambing, corak_*, mata_*."""
import sand3d as s3d


def sapi(length=1500, leg_h=560):
    badan = torso(length)
    kaki = legs(length, leg_h)
    kepala = head(length)
    ekor = tail(length)
    ambing = s3d.at(s3d.sphere("ambing", 190), x=40, z=leg_h - 70)
    s3d.material(ambing, "plastic", color="#f3c3cd")
    corak = spots(length)
    return s3d.assembly("sapi", badan, *kaki, kepala, ekor, ambing, *corak)


def torso(length):
    """The barrel of the cow, drawn from above (plan) and from the side (top and bottom lines)."""
    L = length
    plan = s3d.spline([(0, 360), (0.15 * L, 600), (0.5 * L, 640), (0.85 * L, 600), (L, 380)])
    top = s3d.spline([(0, 900), (0.15 * L, 1060), (0.5 * L, 1040), (0.85 * L, 1080), (L, 980)])
    bottom = s3d.spline([(0, 760), (0.15 * L, 600), (0.5 * L, 560), (0.85 * L, 600), (L, 780)])
    badan = s3d.at(s3d.body("badan", plan, top, bottom, n=2.2), x=-L / 2, rz=-90)
    s3d.material(badan, "plastic", color="#f4f1ea")
    return badan


def legs(length, leg_h, d=150):
    """Four legs and hooves; the far pair sits a little further back, as in the drawing."""
    out = []
    for name, x, y in [("depan_dekat", 0.34, -230), ("depan_jauh", 0.24, 230),
                       ("belakang_dekat", -0.30, -230), ("belakang_jauh", -0.40, 230)]:
        kaki = s3d.at(s3d.cylinder(f"kaki_{name}", d, leg_h + 80), x=x * length, y=y, z=70)
        s3d.fillet(kaki, 20, edges="top")
        kuku = s3d.at(s3d.cylinder(f"kuku_{name}", d + 20, 90), x=x * length, y=y)
        s3d.material(kaki, "plastic", color="#f4f1ea")
        s3d.material(kuku, "plastic", color="#5a4a3f")
        out += [kaki, kuku]
    return out


def head(length, d=380):
    """Head, snout, eyes, ears and horns, grouped so the head can turn as one."""
    hx, hz = length / 2 + 120, 1150
    tengkorak = s3d.at(s3d.sphere("kepala", d), x=hx, z=hz - d / 2)
    moncong = s3d.at(s3d.body("moncong", s3d.spline([(0, 260), (90, 300), (170, 250)]),
                              s3d.spline([(0, 170), (90, 190), (170, 150)]),
                              s3d.spline([(0, -40), (90, -60), (170, -30)]), n=2.4),
                     x=hx + 120, z=hz - 230, rz=-90)
    s3d.material(tengkorak, "plastic", color="#f4f1ea")
    s3d.material(moncong, "plastic", color="#f2cfc4")
    parts = [tengkorak, moncong]
    for side, sy in (("kiri", 1), ("kanan", -1)):
        mata = s3d.at(s3d.sphere(f"mata_{side}", 60), x=hx + 150, y=sy * 110, z=hz - 120)
        s3d.material(mata, "glossy_plastic", color="#26231f")
        kuping = s3d.at(s3d.extrude(f"kuping_{side}", s3d.ellipse(220, 110), 30, both=True),
                        x=hx - 20, y=sy * 230, z=hz - 90, rx=90, rz=sy * 20)
        tanduk = s3d.at(s3d.cone(f"tanduk_{side}", 70, 190), x=hx + 10, y=sy * 95, z=hz - 40, rx=-sy * 25)
        s3d.material(kuping, "plastic", color="#f4f1ea")
        s3d.material(tanduk, "plastic", color="#efe3c4")
        parts += [mata, kuping, tanduk]
    return s3d.group("kepala_grup", *parts)


def tail(length):
    """A curved rope with a tuft, hanging from the rump."""
    x0 = -length / 2 + 20
    path = s3d.spline([(x0, 0, 960), (x0 - 120, 0, 860), (x0 - 160, 0, 650), (x0 - 140, 0, 480)])
    ekor = s3d.wire("ekor", path, 40)
    jumbai = s3d.at(s3d.sphere("ekor_jumbai", 110), x=x0 - 140, z=380)
    for p in (ekor, jumbai):
        s3d.material(p, "plastic", color="#f4f1ea")
    return s3d.group("ekor_grup", ekor, jumbai)


def spots(length, d=260):
    """Three flat spots on each side of the barrel."""
    out = []
    for i, (fx, z) in enumerate([(-0.25, 900), (0.08, 960), (0.15, 720)]):
        for side, sy in (("kiri", 1), ("kanan", -1)):
            frame = s3d.Frame((fx * length, sy * 300, z), normal=(0, sy, 0))
            c = s3d.at(s3d.dome(f"corak_{i + 1}_{side}", d, 45), on=frame)
            s3d.material(c, "plastic", color="#5a4a3f")
            out.append(c)
    return out


if __name__ == "__main__":
    import sys
    s3d.export(sapi(), sys.argv[1] if len(sys.argv) > 1 else "sapi.glb")
