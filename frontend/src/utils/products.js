// Single source of truth for all product definitions.
// Labels must match processor.py's product_name_map for products that appear in row.products.
export const PRODUCTS = [
  { key: 'chini',     label: 'دوره آنلاین چینی' },
  { key: 'dakheli',   label: 'دوره آنلاین داخلی' },
  { key: 'zaban',     label: 'دوره زبان فنی' },
  { key: 'book',      label: 'کتاب زبان فنی' },
  { key: 'carman',    label: 'دستگاه دیاگ' },
  { key: 'azmoon',    label: 'آزمون' },
  { key: 'ghabooli',  label: 'قبولی' },
  { key: 'garage',    label: 'گاراژ' },
  { key: 'hoz',       label: 'دوره حضوری' },
  { key: 'kia',       label: 'دوره آنلاین کره‌ای' },
  { key: 'milyarder', label: 'دوره تعمیرکار میلیاردر' },
  { key: 'gds-tuts',  label: 'دوره GDS' },
  { key: 'gds',       label: 'نرم افزار GDS' },
  { key: 'tpms-tuts', label: 'دوره TPMS' },
  { key: 'zed',       label: 'دوره ضد سرقت' },
  { key: 'kmc',       label: 'وبینار KMC' },
  { key: 'carmap',    label: 'کارمپ' },
  { key: 'eps',       label: 'فرمان برقی حضوری' },
]

// key → default display label
export const PRODUCT_LABEL_MAP = Object.fromEntries(PRODUCTS.map(p => [p.key, p.label]))

// backend label → key (only for products in processor.py's product_name_map)
// azmoon, ghabooli, garage are NOT in product_name_map and never appear in row.products
const BACKEND_KEYS = [
  'chini','dakheli','zaban','book','carman','hoz','kia','milyarder',
  'gds-tuts','gds','tpms-tuts','zed','kmc','carmap','eps',
]
export const BACKEND_LABEL_TO_KEY = Object.fromEntries(
  PRODUCTS.filter(p => BACKEND_KEYS.includes(p.key)).map(p => [p.label, p.key])
)
