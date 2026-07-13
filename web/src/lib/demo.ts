import type { LookItem } from '@/app/(app)/outfit/_components/LookCollage'

// ── Shared demo data for GUEST mode (no account required) ─────────────────
// Real sample photos live in /public/demo/*.jpg (mapped below).

export interface DemoItem extends LookItem {
  label: string
  bucket: string
  timesWorn: number
}

export const DEMO_ITEMS: DemoItem[] = [
  { id: 'yellow-gingham-top', label: 'Yellow gingham cami', category: 'top', subcategory: 'cami', colors: ['yellow'], imageUrl: '/demo/1000208980.jpg', bucket: 'Tops', timesWorn: 5 },
  { id: 'navy-babydoll', label: 'Navy tiered top', category: 'top', subcategory: 'blouse', colors: ['navy'], imageUrl: '/demo/1000208981.jpg', bucket: 'Tops', timesWorn: 7 },
  { id: 'navy-pinstripe-shirt', label: 'Pinstripe shirt', category: 'top', subcategory: 'shirt', colors: ['navy'], imageUrl: '/demo/1000208983.jpg', bucket: 'Tops', timesWorn: 9 },
  { id: 'blue-stripe-shirt', label: 'Blue striped shirt', category: 'top', subcategory: 'shirt', colors: ['blue'], imageUrl: '/demo/1000208984.jpg', bucket: 'Tops', timesWorn: 11 },
  { id: 'yellow-linen-shirt', label: 'Yellow linen shirt', category: 'top', subcategory: 'shirt', colors: ['yellow'], imageUrl: '/demo/1000208985.jpg', bucket: 'Tops', timesWorn: 4 },
  { id: 'brown-trousers', label: 'Brown wide trousers', category: 'bottom', subcategory: 'trousers', colors: ['brown'], imageUrl: '/demo/1000208987.jpg', bucket: 'Bottoms', timesWorn: 8 },
  { id: 'cream-cords', label: 'Cream corduroys', category: 'bottom', subcategory: 'trousers', colors: ['cream'], imageUrl: '/demo/1000208988.jpg', bucket: 'Bottoms', timesWorn: 6 },
  { id: 'black-trackpants', label: 'Black track pants', category: 'bottom', subcategory: 'joggers', colors: ['black'], imageUrl: '/demo/1000208989.jpg', bucket: 'Bottoms', timesWorn: 14 },
  { id: 'sage-skirt', label: 'Sage eyelet skirt', category: 'bottom', subcategory: 'skirt', colors: ['sage'], imageUrl: '/demo/1000208991.jpg', bucket: 'Bottoms', timesWorn: 5 },
  { id: 'cream-floral-dress', label: 'Cream floral dress', category: 'dress', subcategory: 'slip dress', colors: ['cream'], imageUrl: '/demo/1000209081.jpg', bucket: 'Dresses', timesWorn: 3 },
  { id: 'wide-blue-jeans', label: 'Wide-leg blue jeans', category: 'bottom', subcategory: 'jeans', colors: ['denim'], imageUrl: '/demo/1000209082.jpg', bucket: 'Bottoms', timesWorn: 15 },
  { id: 'flared-jeans', label: 'Flared blue jeans', category: 'bottom', subcategory: 'jeans', colors: ['blue'], imageUrl: '/demo/1000209083.jpg', bucket: 'Bottoms', timesWorn: 10 },
  { id: 'blockprint-kurta', label: 'Block-print kurta', category: 'ethnic', subcategory: 'kurta', colors: ['teal'], imageUrl: '/demo/1000209084.jpg', bucket: 'Dresses', timesWorn: 4 },
  { id: 'brown-satin-dress', label: 'Brown satin dress', category: 'dress', subcategory: 'mini dress', colors: ['brown'], imageUrl: '/demo/1000209085.jpg', bucket: 'Dresses', timesWorn: 6 },
  { id: 'pink-paisley-dress', label: 'Pink printed dress', category: 'dress', subcategory: 'dress', colors: ['pink'], imageUrl: '/demo/1000209087.jpg', bucket: 'Dresses', timesWorn: 3 },
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
    { title: 'Sunny denim', match: 94, itemIds: ['yellow-gingham-top', 'wide-blue-jeans'], reasoning: 'Yellow gingham cami with wide-leg blue jeans — fresh and easy for the weekend.', tips: ['Half-tuck the top'] },
    { title: 'Off-duty stripes', match: 90, itemIds: ['blue-stripe-shirt', 'cream-cords'], reasoning: 'Blue striped shirt with cream corduroys — soft, tonal, and effortless.', tips: ['Roll the sleeves'] },
    { title: 'Sporty ease', match: 88, itemIds: ['navy-babydoll', 'black-trackpants'], reasoning: 'Navy tiered top over black track pants — relaxed athleisure with a cute twist.', tips: ['Add white sneakers'] },
  ],
  Work: [
    { title: 'Pinstripe polish', match: 96, itemIds: ['navy-pinstripe-shirt', 'brown-trousers'], reasoning: 'Fitted pinstripe shirt with brown wide-leg trousers — sharp and office-ready.', tips: ['Tuck it in'] },
    { title: 'Soft tailoring', match: 91, itemIds: ['yellow-linen-shirt', 'cream-cords'], reasoning: 'Yellow linen shirt with cream cords — warm, calm, and put-together.', tips: ['Cuff the trousers'] },
  ],
  Party: [
    { title: 'Satin night', match: 95, itemIds: ['brown-satin-dress'], reasoning: 'Brown satin mini with subtle sparkle — understated evening glam.', tips: ['Gold hoops finish it'] },
    { title: 'Print play', match: 90, itemIds: ['pink-paisley-dress'], reasoning: 'Pink printed dress with a bow — playful and party-ready.', tips: ['Keep jewellery simple'] },
    { title: 'Festive block-print', match: 89, itemIds: ['blockprint-kurta'], reasoning: 'Block-print kurta — easy festive charm with a modern cut.', tips: ['Add juttis or heels'] },
  ],
  Date: [
    { title: 'Floral romance', match: 93, itemIds: ['cream-floral-dress'], reasoning: 'Cream floral slip dress — romantic and light for a dinner date.', tips: ['Layer a jacket if it cools down'] },
    { title: 'Flare & tie', match: 90, itemIds: ['navy-babydoll', 'flared-jeans'], reasoning: 'Navy tiered top with light flared jeans — flirty and relaxed.', tips: ['Front-tuck the top'] },
    { title: 'Skirt & stripes', match: 88, itemIds: ['blue-stripe-shirt', 'sage-skirt'], reasoning: 'Blue striped shirt with a sage eyelet skirt — sweet and summery.', tips: ['Tie the skirt neatly'] },
  ],
}

export function allDemoLooks(): DemoLook[] {
  return OCCASIONS.flatMap((o) => DEMO_LOOKS[o])
}

// ── Demo community feed ───────────────────────────────────────────────────
export interface DemoPost {
  id: string
  name: string
  initial: string
  bg: string
  color: string
  location: string
  style: string
  timeLabel: string
  challengeTag: string | null
  caption: string
  likeCount: number
  commentCount: number
  itemIds: string[]
}

export const DEMO_POSTS: DemoPost[] = [
  { id: 'p1', name: 'Maya K.', initial: 'M', bg: '#C9B6F0', color: '#4A3B6B', location: 'Mumbai', style: 'Old Money', timeLabel: '2h', challengeTag: 'DenimWeek', caption: 'wide-leg denim, kept soft 🤍 #DenimWeek', likeCount: 1204, commentCount: 88, itemIds: ['navy-babydoll', 'wide-blue-jeans'] },
  { id: 'p2', name: 'Rhea', initial: 'R', bg: '#C7D0BC', color: '#4C5A41', location: 'Bengaluru', style: 'Minimal', timeLabel: '5h', challengeTag: null, caption: 'tonal and easy — my forever formula 🌿', likeCount: 744, commentCount: 32, itemIds: ['blue-stripe-shirt', 'cream-cords'] },
  { id: 'p3', name: 'Jai W.', initial: 'J', bg: '#D8B7A4', color: '#7A5638', location: 'Delhi', style: 'Street', timeLabel: '1d', challengeTag: null, caption: 'date night, satin brown never fails 🔥', likeCount: 602, commentCount: 21, itemIds: ['brown-satin-dress'] },
]
