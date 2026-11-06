/**
 * The cow line art the child colours on screen. Same drawing as prototype/sheets.py
 * (local units, side view, head to the right). Every closed shape belongs to a region;
 * the colour a child paints inside a region is carried over to that part of the 3D cow.
 */

export type RegionKey =
  | "badan" | "kepala" | "moncong" | "kuping" | "tanduk" | "kaki" | "kuku" | "ekor" | "ambing" | "corak";

/** Drawing area in local units (covers tail tuft to ears, horns to hooves). */
export const VIEW = { x: 8, y: 20, w: 172, h: 156 };

/** Back to front: later shapes cover earlier ones, exactly as in the printed sheet. */
export const SHAPES: { region: RegionKey; d: string }[] = [
  // far legs
  { region: "kaki", d: "M38 110 C37 130 37 146 38 160 L49 160 C50 146 50 130 49 110 Z" },
  { region: "kuku", d: "M38 160 L49 160 L50 166 C46 167.5 41 167.5 37 166 Z" },
  { region: "kaki", d: "M101 110 C100 130 100 146 101 160 L112 160 C113 146 113 130 112 110 Z" },
  { region: "kuku", d: "M101 160 L112 160 L113 166 C109 167.5 104 167.5 100 166 Z" },
  // tail
  { region: "ekor", d: "M30 72 C20 80 16 96 18 116 C19 122 21 126 22 128 L25 127 C23 120 22 112 23 100 C24 88 28 80 35 76 Z" },
  { region: "ekor", d: "M22 125 C15 128 14 138 19 141 C22 136 25 136 28 140 C31 134 29 127 24 125 Z" },
  // near legs
  { region: "kaki", d: "M52 112 C51 132 51 150 52 162 L64 162 C65 150 65 132 64 112 Z" },
  { region: "kuku", d: "M52 162 L64 162 L65 168 C61 169.6 55 169.6 51 168 Z" },
  { region: "kaki", d: "M114 112 C113 132 113 150 114 162 L126 162 C127 150 127 132 126 112 Z" },
  { region: "kuku", d: "M114 162 L126 162 L127 168 C123 169.6 117 169.6 113 168 Z" },
  // udder
  { region: "ambing", d: "M78 119 C78 129 82 132 87 132 C92 132 96 129 96 119 Z" },
  // body
  { region: "badan", d: "M34 70 C34 56 46 50 62 50 L112 50 C126 50 136 58 136 74 L136 102 C136 116 126 122 112 122 L58 122 C42 122 32 114 32 100 Z" },
  // ears and horns (behind the head)
  { region: "kuping", d: "M124 50 C114 44 108 46 106 52 C112 57 120 57 127 55 Z" },
  { region: "kuping", d: "M154 50 C164 44 170 46 172 52 C166 57 158 57 151 55 Z" },
  { region: "tanduk", d: "M131 42 C127 37 126 31 129 27 C132 31 135 35 137 41 Z" },
  { region: "tanduk", d: "M147 42 C151 37 152 31 149 27 C146 31 143 35 141 41 Z" },
  // head and snout
  { region: "kepala", d: "M123 56 C123 44 130 37 139 37 C148 37 155 44 155 56 C155 68 151 82 139 84 C127 82 123 68 123 56 Z" },
  { region: "moncong", d: "M121 82 C121 72 129 69 139 69 C149 69 157 72 157 82 C157 92 149 96 139 96 C129 96 121 92 121 82 Z" },
  // spots and forehead patch (drawn over body and head)
  { region: "corak", d: "M48 62 C56 58 66 60 68 68 C70 77 62 84 54 82 C46 80 42 70 48 62 Z" },
  { region: "corak", d: "M86 54 C94 52 104 54 104 62 C104 70 96 72 90 70 C84 68 80 58 86 54 Z" },
  { region: "corak", d: "M92 90 C100 86 112 90 112 100 C112 108 102 112 94 108 C86 104 86 94 92 90 Z" },
  { region: "corak", d: "M133 40 C137 38 143 38 146 41 C146 47 141 52 138 52 C134 50 131 45 133 40 Z" },
];

export const EYES: [number, number][] = [[132.5, 58], [147.5, 58]];
export const NOSTRILS: [number, number][] = [[132, 80], [146, 80]];
export const MOUTH = "M131 88 C135 91.5 143 91.5 147 88";

export const REGIONS: RegionKey[] = ["badan", "kepala", "moncong", "kuping", "tanduk", "kaki", "kuku", "ekor", "ambing", "corak"];

/** Colour of a part the child left blank: the paper itself, or the natural colour of small parts. */
export const UNPAINTED: Record<RegionKey, string> = {
  badan: "#f4f1ea", kepala: "#f4f1ea", moncong: "#f2cfc4", kuping: "#f4f1ea", tanduk: "#efe3c4",
  kaki: "#f4f1ea", kuku: "#5a4a3f", ekor: "#f4f1ea", ambing: "#f3c3cd", corak: "#5a4a3f",
};

/** Crayon box. Content colours for the child's drawing, not UI colours. */
export const CRAYONS: { name: string; hex: string }[] = [
  { name: "merah", hex: "#e0392b" },
  { name: "oranye", hex: "#f28c28" },
  { name: "kuning", hex: "#f7c925" },
  { name: "hijau", hex: "#3ea055" },
  { name: "biru", hex: "#2f7fd6" },
  { name: "biru muda", hex: "#7cc4ef" },
  { name: "ungu", hex: "#8a5cc2" },
  { name: "merah muda", hex: "#f39bb6" },
  { name: "cokelat", hex: "#8b5a2b" },
  { name: "hitam", hex: "#2b2b2b" },
];
