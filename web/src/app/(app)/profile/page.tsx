import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Spark } from '@/components/Spark'
import { Sparkles, BarChart3, Bell, LogOut, ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { logout } from '@/app/auth/actions'
import type { StylePreferences } from '@/lib/styleDna'

export const dynamic = 'force-dynamic'

export default async function ProfilePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: profile }, itemsRes, outfitsRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('display_name, style_preferences')
      .eq('id', user.id)
      .maybeSingle(),
    supabase
      .from('items')
      .select('times_worn')
      .eq('is_active', true)
      .returns<{ times_worn: number | null }[]>(),
    supabase.from('outfits').select('id', { count: 'exact', head: true }),
  ])

  const prefs = (profile?.style_preferences ?? {}) as StylePreferences
  const items = itemsRes.data ?? []
  const pieces = items.length
  const worn = items.filter((i) => (i.times_worn ?? 0) > 0).length
  const wornPct = pieces ? Math.round((worn / pieces) * 100) : 0
  const outfitCount = outfitsRes.count ?? 0

  const name = profile?.display_name || user?.email?.split('@')[0] || 'You'
  const initial = name.charAt(0).toUpperCase()
  const dnaTitle = prefs.styleDna?.title

  return (
    <>
      <div className="appbar">
        <div className="title" style={{ fontSize: 22 }}>
          Profile
        </div>
      </div>

      <div className="prof-top">
        <div className="prof-av">{initial}</div>
        <div className="prof-name">{name}</div>
        {dnaTitle && (
          <div className="prof-badge">
            <Spark /> {dnaTitle}
          </div>
        )}
      </div>

      <div className="pad">
        <div className="prof-stats">
          <div className="pstat">
            <b>{pieces}</b>
            <small>Pieces</small>
          </div>
          <div className="pstat">
            <b>{outfitCount}</b>
            <small>Outfits</small>
          </div>
          <div className="pstat">
            <b>{wornPct}%</b>
            <small>Worn</small>
          </div>
        </div>

        {(prefs.vibes?.length || prefs.occasions?.length) && (
          <>
            <div className="sec-t">Your style DNA</div>
            <div className="dna-wrap">
              <div className="dna-chips">
                {prefs.vibes?.map((v) => (
                  <span className="hl" key={v}>
                    {v}
                  </span>
                ))}
                {prefs.occasions?.length ? (
                  <span>{prefs.occasions.join(' · ')}</span>
                ) : null}
              </div>
            </div>
          </>
        )}

        <div className="sec-t">Settings</div>
        <div className="menu">
          <Link href="/onboarding" className="mrow">
            <div className="ic">
              <Sparkles size={17} />
            </div>
            <div className="lbl">Edit style profile</div>
            <div className="arw">
              <ChevronRight size={18} strokeWidth={2.2} />
            </div>
          </Link>
          <Link href="/closet" className="mrow">
            <div className="ic">
              <BarChart3 size={17} />
            </div>
            <div className="lbl">Wardrobe insights</div>
            <div className="arw">
              <ChevronRight size={18} strokeWidth={2.2} />
            </div>
          </Link>
          <div className="mrow">
            <div className="ic">
              <Bell size={17} />
            </div>
            <div className="lbl">Notifications</div>
            <div className="arw">
              <ChevronRight size={18} strokeWidth={2.2} />
            </div>
          </div>
          <form action={logout}>
            <button type="submit" className="mrow danger" style={{ cursor: 'pointer' }}>
              <div className="ic">
                <LogOut size={17} />
              </div>
              <div className="lbl">Sign out</div>
            </button>
          </form>
        </div>

        <p className="tiny dim" style={{ textAlign: 'center', marginTop: 16 }}>
          Signed in as {user?.email}
        </p>
        <div style={{ height: 16 }} />
      </div>
    </>
  )
}
