/**
 * Season 1 as the map shows it (from docs/episodes/musim-1.md). Only E01 is playable today;
 * the others are shown honestly as "Segera hadir". The `belajar` lines describe what the episode
 * teaches as it is built now, not as planned, for the playable one.
 */
export interface Episode {
  no: number;
  judul: string;
  ikon: keyof typeof IKON;
  siap: boolean;
  menit?: string;
  belajar: { baca: string; hitung: string; warnai: string; tulis?: string };
}

export const MUSIM_1: Episode[] = [
  { no: 1, judul: "Sapi ke Rumah Budi", ikon: "sapi", siap: true, menit: "5-8 menit",
    belajar: { warnai: "Sapi", hitung: "Kaki, tanduk, mangga (1-5)", baca: "RU·MAH, SA·PU" } },
  { no: 2, judul: "Astronot Roket Kertas", ikon: "roket", siap: false,
    belajar: { warnai: "Roket", hitung: "Hitung mundur 5-1", baca: "TO·TO, BA·TU", tulis: "T, O" } },
  { no: 3, judul: "Kupu-kupu di Kebun Nenek", ikon: "kupu", siap: false,
    belajar: { warnai: "Kupu-kupu", hitung: "Sama banyak, 1-6", baca: "KU·PU, KA·KI", tulis: "K, U" } },
  { no: 4, judul: "Bola Jatuh ke Kolam", ikon: "bola", siap: false,
    belajar: { warnai: "Bola dan lele", hitung: "Lebih banyak, lebih sedikit", baca: "LE·LE, BO·LA", tulis: "L, E" } },
  { no: 5, judul: "Belanja di Warung", ikon: "roti", siap: false,
    belajar: { warnai: "Roti", hitung: "Satu lawan satu, 1-8", baca: "RO·TI, SU·SU", tulis: "R, I" } },
  { no: 6, judul: "Perahu Kertas ke Pulau", ikon: "perahu", siap: false,
    belajar: { warnai: "Perahu", hitung: "Mengelompokkan, 1-9", baca: "TO·PI, PA·PA", tulis: "PA" } },
  { no: 7, judul: "Petak Umpet di Hutan", ikon: "rusa", siap: false,
    belajar: { warnai: "Rusa", hitung: "Urutan 1-10", baca: "RU·SA, MA·TA", tulis: "MA" } },
  { no: 8, judul: "Delman ke Taman Baca", ikon: "kuda", siap: false,
    belajar: { warnai: "Kuda", hitung: "Bingkai sepuluh", baca: "KU·DA, BU·KU", tulis: "DA, BU" } },
  { no: 9, judul: "Ulang Tahun Budi", ikon: "kue", siap: false,
    belajar: { warnai: "Baju pesta", hitung: "Titik dadu 1-6", baca: "ME·JA, DA·DU", tulis: "JU" } },
  { no: 10, judul: "Pawai Kura-kura", ikon: "kura", siap: false,
    belajar: { warnai: "Kura-kura", hitung: "Mengurutkan 1-10", baca: "KU·RA", tulis: "SAPI" } },
];

/** Flat cut-paper icons with an ink outline, one per episode (64 × 64). */
const S = `stroke="#26231f" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"`;
export const IKON = {
  sapi: `<path d="M18 22 L13 10 L22 17 M46 22 L51 10 L42 17" fill="#efe3c4" ${S}/><ellipse cx="13" cy="27" rx="7" ry="4" fill="#fff" ${S}/><ellipse cx="51" cy="27" rx="7" ry="4" fill="#fff" ${S}/><path d="M18 20 Q32 12 46 20 Q50 34 44 44 H20 Q14 34 18 20Z" fill="#fff" ${S}/><path d="M24 18 Q29 16 31 21 Q29 27 24 26Z" fill="#8b5a2b"/><ellipse cx="32" cy="46" rx="14" ry="9" fill="#f39bb6" ${S}/><circle cx="26" cy="31" r="2.6" fill="#26231f"/><circle cx="38" cy="31" r="2.6" fill="#26231f"/><ellipse cx="27" cy="46" rx="2" ry="1.4" fill="#26231f"/><ellipse cx="37" cy="46" rx="2" ry="1.4" fill="#26231f"/>`,
  roket: `<path d="M32 6 Q44 16 43 38 H21 Q20 16 32 6Z" fill="#fff" ${S}/><path d="M32 6 Q40 12 42 22 H22 Q24 12 32 6Z" fill="#e5432f" ${S}/><circle cx="32" cy="29" r="5" fill="#7cc4ef" ${S}/><path d="M21 30 L13 44 L21 42Z M43 30 L51 44 L43 42Z" fill="#e5432f" ${S}/><path d="M26 38 L32 54 L38 38Z" fill="#ffc93c" ${S}/>`,
  kupu: `<path d="M31 32 Q14 8 9 22 Q8 34 31 33Z" fill="#f28c28" ${S}/><path d="M33 32 Q50 8 55 22 Q56 34 33 33Z" fill="#f28c28" ${S}/><path d="M31 34 Q14 52 18 54 Q28 54 31 36Z" fill="#8a5cc2" ${S}/><path d="M33 34 Q50 52 46 54 Q36 54 33 36Z" fill="#8a5cc2" ${S}/><ellipse cx="32" cy="34" rx="3" ry="12" fill="#26231f"/><path d="M31 23 Q27 14 24 12 M33 23 Q37 14 40 12" fill="none" ${S}/>`,
  bola: `<circle cx="32" cy="32" r="20" fill="#fff" ${S}/><path d="M12.5 28 Q32 22 51.5 28 L51.5 36 Q32 42 12.5 36Z" fill="#e5432f" ${S}/><circle cx="32" cy="32" r="20" fill="none" ${S}/>`,
  roti: `<path d="M12 30 Q12 16 32 16 Q52 16 52 30 Q52 34 48 34 V48 H16 V34 Q12 34 12 30Z" fill="#e8b46a" ${S}/><path d="M22 24 L26 30 M30 22 L34 28 M38 22 L42 28" fill="none" ${S}/>`,
  perahu: `<path d="M8 38 H56 L48 50 H16Z" fill="#fff" ${S}/><path d="M32 10 L32 38 L14 38Z" fill="#7cc4ef" ${S}/><path d="M32 16 L48 36 L32 36Z" fill="#fff" ${S}/><path d="M6 54 Q14 50 22 54 Q30 58 38 54 Q46 50 58 54" fill="none" stroke="#2f7fd6" stroke-width="2.6" stroke-linecap="round"/>`,
  rusa: `<path d="M24 20 L18 8 M18 14 L12 12 M40 20 L46 8 M46 14 L52 12" fill="none" ${S}/><ellipse cx="17" cy="26" rx="6" ry="3.5" fill="#c99a5b" ${S}/><ellipse cx="47" cy="26" rx="6" ry="3.5" fill="#c99a5b" ${S}/><path d="M22 20 Q32 14 42 20 Q44 40 36 50 H28 Q20 40 22 20Z" fill="#c99a5b" ${S}/><circle cx="27" cy="30" r="2.4" fill="#26231f"/><circle cx="37" cy="30" r="2.4" fill="#26231f"/><ellipse cx="32" cy="47" rx="4" ry="3" fill="#26231f"/>`,
  kuda: `<path d="M22 54 Q18 34 26 20 Q32 10 42 14 Q52 18 50 30 Q48 36 42 34 Q38 44 40 54Z" fill="#8b5a2b" ${S}/><path d="M26 20 Q22 14 28 10 L32 16" fill="#3a2a1c" ${S}/><circle cx="41" cy="22" r="2.4" fill="#26231f"/><path d="M28 18 Q20 30 22 44" fill="none" stroke="#3a2a1c" stroke-width="5" stroke-linecap="round"/>`,
  kue: `<path d="M14 34 H50 V52 H14Z" fill="#f39bb6" ${S}/><path d="M14 40 Q20 44 26 40 Q32 44 38 40 Q44 44 50 40" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/><path d="M30 34 V22 H34 V34Z" fill="#7cc4ef" ${S}/><path d="M32 12 Q36 17 32 20 Q28 17 32 12Z" fill="#ffc93c" ${S}/>`,
  kura: `<path d="M12 40 Q14 18 32 18 Q50 18 52 40Z" fill="#3ea055" ${S}/><path d="M22 40 L26 28 H38 L42 40 M26 28 L22 22 M38 28 L42 22" fill="none" ${S}/><circle cx="56" cy="36" r="6" fill="#9ccf7f" ${S}/><circle cx="58" cy="34" r="1.4" fill="#26231f"/><path d="M16 40 V48 H22 V40 M42 40 V48 H48 V40" fill="#9ccf7f" ${S}/>`,
};

export function ikonSvg(kind: keyof typeof IKON, size = 56) {
  return `<svg viewBox="0 0 64 64" width="${size}" height="${size}" aria-hidden="true">${IKON[kind]}</svg>`;
}
