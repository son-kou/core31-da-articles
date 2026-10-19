// Thematic grouping for the home page. Titles and the U00–U30 order are never changed; this only decides which shelf a unit sits on.
export const GROUPS: { key: string; zh: string; da: string; units: string[] }[] = [
  { key: 'hverdag', zh: '日常生活与人际关系', da: 'Hverdag og relationer', units: ['U01', 'U02', 'U03', 'U04', 'U05', 'U11', 'U28'] },
  { key: 'arbejde', zh: '工作、教育与制度', da: 'Arbejde og uddannelse', units: ['U06', 'U07', 'U08', 'U09', 'U13'] },
  { key: 'kultur', zh: '社会、文化与历史', da: 'Samfund, kultur og historie', units: ['U00', 'U18', 'U19', 'U20', 'U21', 'U23', 'U25', 'U26'] },
  { key: 'politik', zh: '政治、经济与国际事务', da: 'Politik, økonomi og verden', units: ['U10', 'U14', 'U15', 'U22', 'U27', 'U29'] },
  { key: 'viden', zh: '科技、媒体、科学与推理', da: 'Teknologi, medier og viden', units: ['U12', 'U16', 'U17', 'U24', 'U30'] },
];

export function groupOf(unit: string) {
  return GROUPS.find((g) => g.units.includes(unit));
}
