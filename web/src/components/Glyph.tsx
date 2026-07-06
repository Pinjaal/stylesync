// Garment silhouette shown when an item has no processed image yet.
// Keeps the closet looking intentional instead of showing "no image".

const PATHS: Record<string, React.ReactNode> = {
  tee: (
    <path d="M36 19 L27 15 L11 27 L18 41 L30 36 L30 82 Q30 86 34 86 L66 86 Q70 86 70 82 L70 36 L82 41 L89 27 L73 15 L64 19 Q50 30 36 19 Z" />
  ),
  sweater: (
    <path d="M36 19 L26 15 L9 31 L15 67 L27 63 L27 82 Q27 86 31 86 L69 86 Q73 86 73 82 L73 63 L85 67 L91 31 L74 15 L64 19 Q50 30 36 19 Z" />
  ),
  shirt: (
    <path d="M37 18 L27 15 L11 27 L18 41 L30 36 L30 82 Q30 86 34 86 L66 86 Q70 86 70 82 L70 36 L82 41 L89 27 L73 15 L63 18 L54 26 L50 24 L46 26 Z" />
  ),
  blazer: (
    <path d="M35 18 L26 15 L10 29 L17 43 L29 38 L29 84 Q29 87 33 87 L67 87 Q71 87 71 84 L71 38 L83 43 L90 29 L74 15 L65 18 L50 40 Z" />
  ),
  pants: <path d="M31 15 H69 L67 30 L64 88 H52.5 L50 47 L47.5 88 H36 L33 30 Z" />,
  jeans: <path d="M32 15 H68 L66 30 L63 88 H52.5 L50 48 L47.5 88 H37 L34 30 Z" />,
  shorts: <path d="M31 18 H69 L67 32 L65 60 H53 L50 44 L47 60 H35 L33 32 Z" />,
  dress: (
    <path d="M38 15 L30 19 L37 34 L28 86 H72 L63 34 L70 19 L62 15 Q50 26 38 15 Z" />
  ),
  skirt: <path d="M32 30 H68 L77 84 H23 Z" />,
  sneaker: (
    <path d="M13 62 Q13 53 22 51 L41 46 Q47 45 51 51 L60 61 L83 63 Q90 65 90 71 Q90 77 83 77 L20 77 Q13 77 13 70 Z" />
  ),
  heel: (
    <path d="M24 40 H33 L37 66 H74 Q80 66 80 72 L80 74 H40 L38 88 H33 L33 74 L28 74 Z" />
  ),
  bag: (
    <>
      <path
        d="M37 46 Q37 26 50 26 Q63 26 63 46"
        fill="none"
        stroke="currentColor"
        strokeWidth={4}
      />
      <path d="M27 44 H73 Q77 44 76 48 L73 82 Q73 86 69 86 H31 Q27 86 27 82 L24 48 Q23 44 27 44 Z" />
    </>
  ),
  cap: (
    <>
      <path d="M18 62 Q18 40 50 40 Q80 40 80 60 Q80 62 78 62 Z" />
      <path d="M18 62 H90 Q93 66 87 68 L20 68 Q17 68 17 64 Z" />
    </>
  ),
}

// Map a free-text category/subcategory to a glyph key.
export function glyphFor(category?: string | null, subcategory?: string | null): string {
  const s = `${subcategory ?? ''} ${category ?? ''}`.toLowerCase()
  if (/(dress|gown|kurti|kurta)/.test(s)) return 'dress'
  if (/(skirt|lehenga)/.test(s)) return 'skirt'
  if (/(jean|denim)/.test(s)) return 'jeans'
  if (/short/.test(s)) return 'shorts'
  if (/(pant|trouser|chino|legging|bottom)/.test(s)) return 'pants'
  if (/(blazer|jacket|coat|outer)/.test(s)) return 'blazer'
  if (/(sweater|knit|hoodie|cardigan)/.test(s)) return 'sweater'
  if (/(shirt|button)/.test(s)) return 'shirt'
  if (/(heel|sandal|pump)/.test(s)) return 'heel'
  if (/(sneaker|shoe|boot|footwear|trainer)/.test(s)) return 'sneaker'
  if (/(bag|purse|clutch|potli|tote)/.test(s)) return 'bag'
  if (/(cap|hat|beanie)/.test(s)) return 'cap'
  return 'tee'
}

// Bucket a free-text category into the closet's filter chips.
export function bucketFor(category?: string | null, subcategory?: string | null): string {
  const s = `${subcategory ?? ''} ${category ?? ''}`.toLowerCase()
  if (/(dress|gown|kurti|kurta|jumpsuit)/.test(s)) return 'Dresses'
  if (/(blazer|jacket|coat|outer|cardigan)/.test(s)) return 'Outerwear'
  if (/(jean|pant|trouser|chino|short|skirt|legging|lehenga|bottom)/.test(s))
    return 'Bottoms'
  if (/(heel|sandal|pump|sneaker|shoe|boot|footwear|trainer)/.test(s)) return 'Shoes'
  if (/(bag|purse|clutch|potli|tote|backpack)/.test(s)) return 'Bags'
  if (/(shirt|tee|top|blouse|sweater|knit|hoodie|tank|kurta)/.test(s)) return 'Tops'
  return 'Other'
}

export function Glyph({
  category,
  subcategory,
  color = '#b09a86',
  className,
}: {
  category?: string | null
  subcategory?: string | null
  color?: string
  className?: string
}) {
  const key = glyphFor(category, subcategory)
  return (
    <svg viewBox="0 0 100 100" className={className} style={{ color }} aria-hidden>
      {PATHS[key]}
    </svg>
  )
}
