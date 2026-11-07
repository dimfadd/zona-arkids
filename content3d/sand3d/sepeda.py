"""Roket Kertas: a child's bicycle, written in sand3d. mm, riding along +X, Z up.
Tappable parts: roda_depan, roda_belakang, sadel, setang, pedal_*, jari_* (spokes), lonceng."""
import sand3d as s3d


def sepeda(wheel=560, base=760):
    rear, front = (-base / 2, wheel / 2), (base / 2, wheel / 2)
    rangka = frame(rear, front)
    roda_b = wheel_(f"roda_belakang", wheel, rear)
    roda_d = wheel_(f"roda_depan", wheel, front)
    setang = handlebar(front)
    sadel = saddle(rear)
    engkol = crank()
    lonceng = s3d.at(s3d.dome("lonceng", 60, 35), x=front[0] - 120, y=-160, z=980)
    s3d.material(lonceng, "chrome")
    s3d.joint("roda_belakang_putar", roda_b, s3d.local(rangka, rear[0], 0, rear[1]), kind="continuous", axis="+Y")
    s3d.joint("roda_depan_putar", roda_d, s3d.local(rangka, front[0], 0, front[1]), kind="continuous", axis="+Y")
    s3d.joint("engkol_putar", engkol, s3d.local(rangka, 0, 0, 300), kind="continuous", axis="+Y")
    return s3d.assembly("sepeda", rangka, roda_b, roda_d, setang, sadel, engkol, lonceng)


def frame(rear, front, d=34):
    """Diamond frame: seat tube, top tube, down tube, stays and fork, as one bent tube set."""
    bb = (0, 0, 300)                       # bottom bracket
    seat_top = (-110, 0, 820)
    head_top, head_bot = (front[0] - 120, 0, 860), (front[0] - 90, 0, 700)
    tubes = [
        s3d.wire("pipa_sadel", [bb, seat_top], d),
        s3d.wire("pipa_atas", [seat_top, head_top], d),
        s3d.wire("pipa_bawah", [bb, head_bot], d),
        s3d.wire("pipa_kepala", [head_bot, head_top], d + 6),
    ]
    for y in (-60, 60):
        tubes += [s3d.wire(f"rantai_{y}", [(bb[0], y, bb[2]), (rear[0], y, rear[1])], 22),
                  s3d.wire(f"tiang_{y}", [(seat_top[0], y * 0.3, seat_top[2] - 40), (rear[0], y, rear[1])], 22),
                  s3d.wire(f"garpu_{y}", [(head_bot[0], y * 0.3, head_bot[2]), (front[0], y, front[1])], 24)]
    rangka = s3d.merge(*tubes)
    s3d.material(rangka, "painted_metal", color="#c4302b")
    return s3d.group("rangka", rangka)


def wheel_(name, d, centre, spokes=8):
    """Tyre, rim, hub and a few spokes, standing upright in the XZ plane."""
    x, z = centre
    upright = s3d.Frame((x, 0, z), normal=(0, 1, 0))
    ban = s3d.at(s3d.torus(f"{name}_ban", d - 40, 40), on=upright.offset(-20))
    pelek = s3d.at(s3d.torus(f"{name}_pelek", d - 90, 16), on=upright.offset(-8))
    as_ = s3d.at(s3d.cylinder(f"{name}_as", 50, 120), on=upright.offset(-60))
    jari = [s3d.wire(f"{name}_jari_{i}", [(x, 0, z), (x + (d / 2 - 50) * c, 0, z + (d / 2 - 50) * s)], 10)
            for i, (c, s) in enumerate(_ring(spokes))]
    s3d.material(ban, "rubber", color="#2b2b2b")
    for p in [pelek, as_, *jari]:
        s3d.material(p, "chrome")
    return s3d.group(name, ban, pelek, as_, *jari)


def _ring(n):
    import math
    return [(math.cos(2 * math.pi * i / n), math.sin(2 * math.pi * i / n)) for i in range(n)]


def handlebar(front):
    x = front[0] - 130
    stem = s3d.wire("setang_batang", [(x, 0, 860), (x - 10, 0, 960)], 30)
    bar = s3d.wire("setang", [(x - 60, -230, 990), (x - 10, -200, 960), (x - 10, 200, 960), (x - 60, 230, 990)], 28, fillet=40)
    grips = [s3d.at(s3d.cylinder(f"pegangan_{side}", 40, 110), on=s3d.Frame((x - 60, sy * 230, 990), normal=(0, sy, 0)))
             for side, sy in (("kiri", 1), ("kanan", -1))]
    for p in (stem, bar):
        s3d.material(p, "chrome")
    for g in grips:
        s3d.material(g, "rubber", color="#2f7fd6")
    return s3d.group("setang_grup", stem, bar, *grips)


def saddle(rear):
    post = s3d.wire("tiang_sadel", [(-110, 0, 820), (-130, 0, 900)], 26)
    seat = s3d.at(s3d.extrude("sadel", s3d.superellipse(240, 150, n=2, taper=0.45), 50, both=True), x=-150, z=930, rz=-90)
    s3d.soften(seat, 15)
    s3d.material(post, "chrome")
    s3d.material(seat, "leather", color="#26231f")
    return s3d.group("sadel_grup", post, seat)


def crank():
    gear = s3d.at(s3d.gear("gir", 32, 4, 8), on=s3d.Frame((0, -75, 300), normal=(0, 1, 0)))
    s3d.material(gear, "chrome")
    parts = [gear]
    for side, sy, k in (("kanan", -1, 1), ("kiri", 1, -1)):
        arm = s3d.wire(f"lengan_{side}", [(0, sy * 85, 300), (k * 150, sy * 85, 300 - k * 60)], 22)
        pedal = s3d.at(s3d.box(f"pedal_{side}", 100, 70, 25), x=k * 150, y=sy * 130, z=300 - k * 60)
        s3d.material(arm, "chrome")
        s3d.material(pedal, "plastic", color="#2b2b2b")
        parts += [arm, pedal]
    return s3d.group("engkol", *parts)


if __name__ == "__main__":
    import sys
    s3d.export(sepeda(), sys.argv[1] if len(sys.argv) > 1 else "sepeda.glb")
