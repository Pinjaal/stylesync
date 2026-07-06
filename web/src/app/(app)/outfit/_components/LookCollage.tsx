import { Glyph } from '@/components/Glyph'
import { colorHex } from '@/lib/colors'

export interface LookItem {
  id: string
  category: string | null
  subcategory: string | null
  colors: string[] | null
  imageUrl: string | null
}

function Cell({ item, showLabel }: { item: LookItem; showLabel: boolean }) {
  const color = colorHex(item.colors)
  const name = item.subcategory || item.category || 'Piece'
  return (
    <div className="cell" style={{ background: item.imageUrl ? undefined : `${color}55` }}>
      {item.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item.imageUrl} alt={name} />
      ) : (
        <div className="glyphwrap">
          <Glyph category={item.category} subcategory={item.subcategory} color={color} />
        </div>
      )}
      {showLabel && <span className="lbl">{name}</span>}
    </div>
  )
}

export function LookCollage({
  items,
  showLabels = true,
  size = 'lg',
}: {
  items: LookItem[]
  showLabels?: boolean
  size?: 'lg' | 'sm'
}) {
  if (items.length === 0) return null
  const [first, ...rest] = items
  return (
    <div className={`collage${size === 'sm' ? ' sm' : ''}`}>
      <div className="big">
        <Cell item={first} showLabel={showLabels} />
      </div>
      {rest.length > 0 && (
        <div className="col">
          {rest.slice(0, 3).map((it) => (
            <Cell key={it.id} item={it} showLabel={showLabels} />
          ))}
        </div>
      )}
    </div>
  )
}
