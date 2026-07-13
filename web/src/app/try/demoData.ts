import type { LookItem } from '@/app/(app)/outfit/_components/LookCollage'

export interface DemoItem extends LookItem {
  label: string
  bucket: string
}

// A sample wardrobe so guests can experience the stylist without uploading anything.
// imageUrl is null → the app renders the garment-silhouette glyph (brand-consistent).
export const DEMO_ITEMS: DemoItem[] = [
  { id: 'cream-tee', label: 'Cream cotton tee', category: 'top', subcategory: 'tee', colors: ['beige'], imageUrl: null, bucket: 'Tops' },
  { id: 'sage-shirt', label: 'Sage linen shirt', category: 'top', subcategory: 'shirt', colors: ['sage'], imageUrl: null, bucket: 'Tops' },
  { id: 'oat-sweater', label: 'Oat knit sweater', category: 'top', subcategory: 'sweater', colors: ['khaki'], imageUrl: null, bucket: 'Tops' },
  { id: 'rosewood-blazer', label: 'Rosewood blazer', category: 'outerwear', subcategory: 'blazer', colors: ['maroon'], imageUrl: null, bucket: 'Outerwear' },
  { id: 'denim-jacket', label: 'Denim jacket', category: 'outerwear', subcategory: 'jacket', colors: ['denim'], imageUrl: null, bucket: 'Outerwear' },
  { id: 'leather-jacket', label: 'Leather jacket', category: 'outerwear', subcategory: 'jacket', colors: ['charcoal'], imageUrl: null, bucket: 'Outerwear' },
  { id: 'indigo-jeans', label: 'Indigo straight jeans', category: 'bottom', subcategory: 'jeans', colors: ['navy'], imageUrl: null, bucket: 'Bottoms' },
  { id: 'camel-trousers', label: 'Camel trousers', category: 'bottom', subcategory: 'trousers', colors: ['camel'], imageUrl: null, bucket: 'Bottoms' },
  { id: 'olive-cargos', label: 'Olive cargos', category: 'bottom', subcategory: 'trousers', colors: ['olive'], imageUrl: null, bucket: 'Bottoms' },
  { id: 'berry-dress', label: 'Berry slip dress', category: 'dress', subcategory: 'slip dress', colors: ['berry'], imageUrl: null, bucket: 'Dresses' },
  { id: 'black-heels', label: 'Black block heels', category: 'footwear', subcategory: 'heel', colors: ['black'], imageUrl: null, bucket: 'Shoes' },
  { id: 'canvas-sneakers', label: 'Canvas sneakers', category: 'footwear', subcategory: 'sneaker', colors: ['grey'], imageUrl: null, bucket: 'Shoes' },
]

const BY_ID = new Map(DEMO_ITEMS.map((i) => [i.id, i]))
export function demoItems(ids: string[]): DemoItem[] {
  return ids.map((id) => BY_ID.get(id)).filter(Boolean) as DemoItem[]
}

export interface DemoLook {
  title: string
  reasoning: string
  tips: string[]
  match: number
  itemIds: string[]
}

export const OCCASIONS = ['Casual', 'Work', 'Party', 'Date'] as const

export const DEMO_LOOKS: Record<string, DemoLook[]> = {
  Casual: [
    { title: 'Easy weekend', match: 94, itemIds: ['cream-tee', 'indigo-jeans', 'canvas-sneakers', 'denim-jacket'],
      reasoning: 'Cream tee with indigo denim and clean sneakers, a denim jacket on top — relaxed but pulled-together.', tips: ['Cuff the jeans once', 'Push the sleeves up'] },
    { title: 'Soft & tonal', match: 90, itemIds: ['oat-sweater', 'camel-trousers', 'canvas-sneakers'],
      reasoning: 'Oat knit with camel trousers keeps it warm and tonal — quiet, comfy, and effortless.', tips: ['Tuck the front loosely'] },
  ],
  Work: [
    { title: 'Quiet-luxury Monday', match: 96, itemIds: ['sage-shirt', 'camel-trousers', 'black-heels'],
      reasoning: 'Sage shirt and camel trousers, heeled for the office — calm, tailored, and easy to wear.', tips: ['Roll the cuffs', 'Tuck it in'] },
    { title: 'Sharp & simple', match: 91, itemIds: ['cream-tee', 'rosewood-blazer', 'indigo-jeans', 'black-heels'],
      reasoning: 'A rosewood blazer over a cream tee and dark denim — smart-casual that still means business.', tips: ['Blazer sleeves pushed up'] },
  ],
  Party: [
    { title: 'After-hours', match: 95, itemIds: ['berry-dress', 'leather-jacket', 'black-heels'],
      reasoning: 'Berry slip dress with a leather jacket and black heels — a little bold, a lot cool.', tips: ['Add gold hoops', 'Leave the jacket open'] },
    { title: 'Edgy night out', match: 89, itemIds: ['cream-tee', 'olive-cargos', 'leather-jacket', 'canvas-sneakers'],
      reasoning: 'Olive cargos and a leather jacket over a cream tee — relaxed but with an edge for the evening.', tips: ['Half-tuck the tee'] },
  ],
  Date: [
    { title: 'Date-night charm', match: 93, itemIds: ['berry-dress', 'denim-jacket', 'black-heels'],
      reasoning: 'The berry slip with a relaxed denim jacket and heels — romantic but easy.', tips: ['Swap to gold jewellery'] },
    { title: 'Understated', match: 90, itemIds: ['sage-shirt', 'indigo-jeans', 'black-heels'],
      reasoning: 'Sage shirt, dark denim, heels — understated and effortless for a dinner date.', tips: ['Front-tuck the shirt'] },
  ],
}
