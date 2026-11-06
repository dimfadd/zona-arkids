"""Single source of truth for the prototype sheets.

Coordinates are millimetres on an A4 portrait page (210 x 297).
Everything the browser needs (marker corners, piece boxes, hinge lines,
tap regions, masks) is exported to config.json by build_assets.py.
"""

PAGE_W, PAGE_H = 210.0, 297.0
MARKER = 20.0            # marker side (7x7 cells)
CELL = MARKER / 7
MARKER_POS = {           # top-left of each marker
    "tl": (10.0, 10.0),
    "tr": (PAGE_W - 10 - MARKER, 10.0),
    "bl": (10.0, PAGE_H - 10 - MARKER),
    "br": (PAGE_W - 10 - MARKER, PAGE_H - 10 - MARKER),
}

# Per-buyer QR code: [x, y, size] in mm. Same place on every sheet, >= 5 mm from the BR marker.
QR_BOX = [157.0, 236.0, 22.0]

SHEETS = {
    "warna-sapi": {"ids": {"tl": 101, "tr": 202, "bl": 303, "br": 404}},
    "tebal-sapi": {"ids": {"tl": 515, "tr": 626, "bl": 737, "br": 848}},
}

ID_PATTERNS = [[1, 0, 0, 0, 0], [1, 0, 1, 1, 1], [0, 1, 0, 0, 1], [0, 1, 1, 1, 0]]


def marker_bits(marker_id):
    """7x7 grid, 1 = white. Border black, inner 5x5 encodes 10-bit id."""
    grid = [[0] * 7 for _ in range(7)]
    for r in range(5):
        word = (marker_id >> (2 * (4 - r))) & 3
        for c in range(5):
            grid[r + 1][c + 1] = ID_PATTERNS[word][c]
    return grid


# ---------------------------------------------------------------- cow art
# Local coordinates: box 170 x 180, feet resting on y = 170.
COW_BOX_W, COW_BOX_H = 170.0, 180.0
COW_FEET_Y = 168.0

# Drawn back to front. Each entry: (kind, svg path d). kind 'fill' parts are
# white areas the child colours; 'detail' are lines/dots only.
COW_PARTS = [
    # far legs (slightly higher, partly behind body)
    ("leg", "M38 110 C37 130 37 146 38 160 L49 160 C50 146 50 130 49 110 Z"),
    ("hoof", "M38 160 L49 160 L50 166 C46 167.5 41 167.5 37 166 Z"),
    ("leg", "M101 110 C100 130 100 146 101 160 L112 160 C113 146 113 130 112 110 Z"),
    ("hoof", "M101 160 L112 160 L113 166 C109 167.5 104 167.5 100 166 Z"),
    # tail
    ("part", "M30 72 C20 80 16 96 18 116 C19 122 21 126 22 128 "
             "L25 127 C23 120 22 112 23 100 C24 88 28 80 35 76 Z"),
    ("part", "M22 125 C15 128 14 138 19 141 C22 136 25 136 28 140 C31 134 29 127 24 125 Z"),
    # near legs
    ("leg", "M52 112 C51 132 51 150 52 162 L64 162 C65 150 65 132 64 112 Z"),
    ("hoof", "M52 162 L64 162 L65 168 C61 169.6 55 169.6 51 168 Z"),
    ("leg", "M114 112 C113 132 113 150 114 162 L126 162 C127 150 127 132 126 112 Z"),
    ("hoof", "M114 162 L126 162 L127 168 C123 169.6 117 169.6 113 168 Z"),
    # udder
    ("part", "M78 119 C78 129 82 132 87 132 C92 132 96 129 96 119 Z"),
    # body
    ("part", "M34 70 C34 56 46 50 62 50 L112 50 C126 50 136 58 136 74 "
             "L136 102 C136 116 126 122 112 122 L58 122 C42 122 32 114 32 100 Z"),
    # ears and horns (behind head)
    ("part", "M124 50 C114 44 108 46 106 52 C112 57 120 57 127 55 Z"),
    ("part", "M154 50 C164 44 170 46 172 52 C166 57 158 57 151 55 Z"),
    ("part", "M131 42 C127 37 126 31 129 27 C132 31 135 35 137 41 Z"),
    ("part", "M147 42 C151 37 152 31 149 27 C146 31 143 35 141 41 Z"),
    # head
    ("part", "M123 56 C123 44 130 37 139 37 C148 37 155 44 155 56 "
             "C155 68 151 82 139 84 C127 82 123 68 123 56 Z"),
    # snout
    ("part", "M121 82 C121 72 129 69 139 69 C149 69 157 72 157 82 "
             "C157 92 149 96 139 96 C129 96 121 92 121 82 Z"),
]

COW_DETAILS = [
    # spots on body (outlines to colour)
    ("spot", "M48 62 C56 58 66 60 68 68 C70 77 62 84 54 82 C46 80 42 70 48 62 Z"),
    ("spot", "M86 54 C94 52 104 54 104 62 C104 70 96 72 90 70 C84 68 80 58 86 54 Z"),
    ("spot", "M92 90 C100 86 112 90 112 100 C112 108 102 112 94 108 C86 104 86 94 92 90 Z"),
    # forehead patch
    ("spot", "M133 40 C137 38 143 38 146 41 C146 47 141 52 138 52 C134 50 131 45 133 40 Z"),
]
# eyes / nostrils / mouth drawn as small strokes or dots
COW_EYES = [(132.5, 58.0), (147.5, 58.0)]
COW_NOSTRILS = [(132.0, 80.0), (146.0, 80.0)]
COW_MOUTH = "M131 88 C135 91.5 143 91.5 147 88"

# Tap regions for counting legs (local coords, centre + radius) - near legs
# first is not required; order is the visual left-to-right order.
COW_LEGS = [
    {"cx": 43.5, "cy": 140.0, "r": 11.0},
    {"cx": 58.0, "cy": 145.0, "r": 11.0},
    {"cx": 106.5, "cy": 140.0, "r": 11.0},
    {"cx": 120.0, "cy": 145.0, "r": 11.0},
]

# Counting questions on the cow (sheet 1). Item = one thing the child taps,
# centre + radius in cow-local coords. Questions only ask about things drawn as
# outlines, so the answer does not depend on how the child coloured them.
COW_COUNT = [
    {"id": "kaki", "prompt": "Ada berapa kaki sapi?", "noun": "Kaki sapi",
     "items": [{"cx": l["cx"], "cy": l["cy"], "r": l["r"]} for l in COW_LEGS]},
    {"id": "corak", "prompt": "Ada berapa corak bulat di badan sapi?", "noun": "Corak di badan sapi",
     "items": [{"cx": 56.0, "cy": 71.0, "r": 10.0}, {"cx": 94.0, "cy": 62.0, "r": 8.0},
               {"cx": 100.0, "cy": 99.0, "r": 10.0}]},
    {"id": "mata", "prompt": "Ada berapa mata sapi?", "noun": "Mata sapi",
     "items": [{"cx": 132.5, "cy": 58.0, "r": 5.0}, {"cx": 147.5, "cy": 58.0, "r": 5.0}]},
    {"id": "tanduk", "prompt": "Ada berapa tanduk sapi?", "noun": "Tanduk sapi",
     "items": [{"cx": 131.0, "cy": 35.0, "r": 6.0}, {"cx": 147.0, "cy": 35.0, "r": 6.0}]},
    {"id": "kuping", "prompt": "Ada berapa kuping sapi?", "noun": "Kuping sapi",
     "items": [{"cx": 115.0, "cy": 51.0, "r": 7.0}, {"cx": 163.0, "cy": 51.0, "r": 7.0}]},
    {"id": "ekor", "prompt": "Ada berapa ekor sapi?", "noun": "Ekor sapi",
     "items": [{"cx": 22.0, "cy": 118.0, "r": 10.0}]},
]

# ---------------------------------------------------------------- layouts
# Sheet 1: cow box placed on page, scale 1.
SHEET1_COW = {"x": 20.0, "y": 32.0, "scale": 1.0}

# Sheet 2: small cow + four letter tiles.
SHEET2_COW = {"x": 60.0, "y": 22.0, "scale": 0.52}
TILE_W, TILE_H = 40.0, 54.0
TILE_Y = 148.0
_GAP_IN, _GAP_SYL = 5.0, 16.0
_x0 = (PAGE_W - (4 * TILE_W + 2 * _GAP_IN + _GAP_SYL)) / 2
LETTERS = [
    {"ch": "S", "x": _x0},
    {"ch": "A", "x": _x0 + TILE_W + _GAP_IN},
    {"ch": "P", "x": _x0 + 2 * TILE_W + _GAP_IN + _GAP_SYL},
    {"ch": "I", "x": _x0 + 3 * TILE_W + 2 * _GAP_IN + _GAP_SYL},
]
SYLLABLES = [{"text": "SA", "letters": [0, 1], "say": ["es", "a", "sa"]},
             {"text": "PI", "letters": [2, 3], "say": ["pe", "i", "pi"]}]
WORD = {"text": "SAPI", "say": "sapi"}
