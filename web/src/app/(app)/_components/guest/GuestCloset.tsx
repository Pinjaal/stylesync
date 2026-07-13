import Link from 'next/link'
import { Glyph } from '@/components/Glyph'
import { colorHex } from '@/lib/colors'
import { DEMO_ITEMS } from '@/lib/demo'

const HEIGHTS = [150, 158, 172, 186, 200, 214, 238]
function tileHeight(id: string) {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) & 0xffff
  return HEIGHTS[h % HEIGHTS.length]
}

export function GuestCloset() {
  return (
    <>
      <div className="appbar">
        <div>
          <div className="eyebrow" style={{ marginBottom: 4 }}>
            Sample closet
          </div>
          <div className="title">The Wardrobe</div>
        </div>
        <Link href="/signup" className="chip add" style={{ alignSelf: 'center' }}>
          ＋ Add yours
        </Link>
      </div>

      <div className="wstats">
        <span className="wstats-item">
          <b>{DEMO_ITEMS.length}</b> pieces
        </span>
        <span className="wstats-item">
          <b>38</b> looks
        </span>
        <span className="wstats-item">
          <b>68%</b> worn this month
        </span>
      </div>

      <div className="demo-banner" style={{ marginTop: 2 }}>
        <span>
          This is a <b>sample closet</b>. Sign up to add your own clothes.
        </span>
        <Link href="/signup" className="db-cta">
          Sign up
        </Link>
      </div>

      <div className="masonry">
        {DEMO_ITEMS.map((it) => (
          <div
            key={it.id}
            className="mtile"
            style={{ height: tileHeight(it.id), background: `${colorHex(it.colors)}22` }}
          >
            {it.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={it.imageUrl} alt={it.label} />
            ) : (
              <div className="glyphwrap">
                <Glyph category={it.category} subcategory={it.subcategory} color={colorHex(it.colors)} />
              </div>
            )}
            {it.timesWorn > 0 && <div className="mbadge">{it.timesWorn}×</div>}
            <div className="mlabel">
              <span className="dot" style={{ background: colorHex(it.colors) }} />
              <span className="nm">{it.label}</span>
            </div>
          </div>
        ))}
      </div>
      <div style={{ height: 22 }} />
    </>
  )
}
