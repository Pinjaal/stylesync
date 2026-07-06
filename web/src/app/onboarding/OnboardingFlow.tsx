'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Check, Loader2 } from 'lucide-react'
import { Spark } from '@/components/Spark'
import { computeStyleDna, type StyleDna } from '@/lib/styleDna'
import { completeOnboarding, type OnboardingInput } from './actions'

const GENDERS = [
  { emoji: '🌸', label: 'Womenswear', value: 'womenswear' },
  { emoji: '🕶️', label: 'Menswear', value: 'menswear' },
  { emoji: '✨', label: 'Both / mix it up', value: 'both' },
  { emoji: '🤍', label: 'Prefer not to say', value: 'unspecified' },
]
const AGES = [
  { emoji: '🎒', label: 'Under 18' },
  { emoji: '🎓', label: '18 – 24' },
  { emoji: '💼', label: '25 – 34' },
  { emoji: '🌟', label: '35 – 44' },
  { emoji: '🍷', label: '45 – 54' },
  { emoji: '🌿', label: '55 +' },
]
const VIBES = [
  { emoji: '🤍', label: 'Minimal' },
  { emoji: '🧢', label: 'Streetwear' },
  { emoji: '👔', label: 'Classic' },
  { emoji: '🌻', label: 'Boho' },
  { emoji: '🖤', label: 'Edgy' },
  { emoji: '🎀', label: 'Coquette' },
  { emoji: '🪩', label: 'Y2K' },
  { emoji: '🪷', label: 'Ethnic fusion' },
]
const OCCASIONS = [
  { emoji: '💻', label: 'Work' },
  { emoji: '☕', label: 'Casual / everyday' },
  { emoji: '🎉', label: 'Parties' },
  { emoji: '💃', label: 'Date nights' },
  { emoji: '🏋️', label: 'Gym' },
  { emoji: '🪔', label: 'Festive / ethnic' },
]
const COLORS = [
  '#2E2A2E', '#E7DCC7', '#7E3B4C', '#8FA9C4',
  '#9DAE8C', '#C9A66B', '#E3B5B0', '#34435E',
  '#D6A94C', '#B8395A', '#F1EDE7', '#4A4A52',
]

const TOTAL = 6
const EYEBROWS: Record<number, string> = {
  1: "Let's get to know you",
  2: "Let's get to know you",
  3: "Let's get to know you",
  4: 'Build your style profile',
  5: 'Build your style profile',
  6: 'Build your style profile',
}

export function OnboardingFlow({
  initial,
  isEdit,
}: {
  initial: OnboardingInput
  isEdit: boolean
}) {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [name, setName] = useState(initial.name)
  const [gender, setGender] = useState(initial.gender)
  const [ageGroup, setAgeGroup] = useState(initial.ageGroup)
  const [vibes, setVibes] = useState<string[]>(initial.vibes)
  const [occasions, setOccasions] = useState<string[]>(initial.occasions)
  const [colors, setColors] = useState<string[]>(initial.colors)

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dna, setDna] = useState<StyleDna | null>(null)

  const toggle = (
    list: string[],
    set: (v: string[]) => void,
    value: string,
  ) => set(list.includes(value) ? list.filter((x) => x !== value) : [...list, value])

  const canContinue =
    (step === 1 && name.trim().length > 0) ||
    (step === 2 && gender.length > 0) ||
    step === 3 ||
    (step === 4 && vibes.length > 0) ||
    step === 5 ||
    step === 6

  async function next() {
    if (step < TOTAL) {
      setStep(step + 1)
      return
    }
    // final step → persist and reveal
    setSaving(true)
    setError(null)
    try {
      const { styleDna } = await completeOnboarding({
        name,
        gender,
        ageGroup,
        vibes,
        occasions,
        colors,
      })
      setDna(styleDna)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save. Try again.')
    } finally {
      setSaving(false)
    }
  }

  function back() {
    setError(null)
    if (step > 1) setStep(step - 1)
    else router.push(isEdit ? '/profile' : '/login')
  }

  // ---------- reveal screen ----------
  if (dna) {
    const chips = [...vibes, ...(occasions.length ? [occasions.slice(0, 3).join(' · ')] : [])]
    return (
      <main className="onb-done">
        <div className="dna-badge">
          <Spark />
        </div>
        <div className="done-k">Your style DNA</div>
        <div className="done-title">
          {dna.title.split(' ').map((w, i, arr) =>
            i === arr.length - 1 ? <em key={i}>{w}</em> : <span key={i}>{w} </span>,
          )}
        </div>
        <div className="done-desc">{dna.description}</div>
        <div className="done-chips">
          {chips.slice(0, 6).map((c) => (
            <span key={c}>{c}</span>
          ))}
        </div>
        <div className="done-cta">
          <button
            className="btn"
            onClick={() => {
              router.push('/closet')
              router.refresh()
            }}
          >
            Enter your closet
          </button>
        </div>
      </main>
    )
  }

  // ---------- questionnaire ----------
  return (
    <main className="onb">
      <div className="onb-head">
        <button className="onb-back" onClick={back} aria-label="Back">
          <ChevronLeft size={18} strokeWidth={2.4} />
        </button>
        <div className="progress">
          <b style={{ width: `${(step / TOTAL) * 100}%` }} />
        </div>
        <div className="onb-step-n">
          {step}/{TOTAL}
        </div>
      </div>

      <div className="onb-body">
        <div className="eyebrow">{EYEBROWS[step]}</div>

        {step === 1 && (
          <div className="ostep">
            <div className="onb-q">First things first — what should we call you?</div>
            <div className="onb-hint">
              This is how Spark, your AI stylist, will greet you.
            </div>
            <input
              className="big-input"
              placeholder="Type your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>
        )}

        {step === 2 && (
          <div className="ostep">
            <div className="onb-q">How do you dress?</div>
            <div className="onb-hint">
              Helps us tailor fits and outfit suggestions. Pick what fits you.
            </div>
            <div className="opt-row">
              {GENDERS.map((g) => (
                <button
                  key={g.value}
                  className={`opt-wide${gender === g.value ? ' sel' : ''}`}
                  onClick={() => setGender(g.value)}
                >
                  <span className="emoji">{g.emoji}</span> {g.label}
                  <span className="rc">
                    <Check size={12} strokeWidth={3.5} />
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="ostep">
            <div className="onb-q">Which age group are you in?</div>
            <div className="onb-hint">
              Keeps trends and sizing relevant — never shown on your profile.
            </div>
            <div className="opt-grid">
              {AGES.map((a) => (
                <button
                  key={a.label}
                  className={`opt${ageGroup === a.label ? ' sel' : ''}`}
                  onClick={() => setAgeGroup(a.label)}
                >
                  <span className="emoji">{a.emoji}</span> {a.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="ostep">
            <div className="onb-q">
              Pick the vibes that feel like <em>you</em>.
            </div>
            <div className="onb-hint">
              Choose as many as you like — this trains your style profile.
            </div>
            <div className="opt-grid">
              {VIBES.map((v) => (
                <button
                  key={v.label}
                  className={`opt${vibes.includes(v.label) ? ' sel' : ''}`}
                  onClick={() => toggle(vibes, setVibes, v.label)}
                >
                  <span className="emoji">{v.emoji}</span> {v.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="ostep">
            <div className="onb-q">What do you dress for most?</div>
            <div className="onb-hint">
              So Spark leads with outfits you&apos;ll actually reach for.
            </div>
            <div className="opt-grid">
              {OCCASIONS.map((o) => (
                <button
                  key={o.label}
                  className={`opt${occasions.includes(o.label) ? ' sel' : ''}`}
                  onClick={() => toggle(occasions, setOccasions, o.label)}
                >
                  <span className="emoji">{o.emoji}</span> {o.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 6 && (
          <div className="ostep">
            <div className="onb-q">Which palette pulls you in?</div>
            <div className="onb-hint">Tap the colours you love to wear.</div>
            <div className="swatch-grid">
              {COLORS.map((c) => (
                <button
                  key={c}
                  className={`sw${colors.includes(c) ? ' sel' : ''}`}
                  style={{
                    background: c,
                    border: c === '#F1EDE7' ? '1px solid #e3d8ce' : undefined,
                  }}
                  onClick={() => toggle(colors, setColors, c)}
                  aria-label={`Colour ${c}`}
                />
              ))}
            </div>
          </div>
        )}

        {error && <p className="alert" style={{ marginTop: 18 }}>{error}</p>}
      </div>

      <div className="onb-foot">
        <button className="btn" onClick={next} disabled={!canContinue || saving}>
          {saving ? (
            <Loader2 size={18} className="animate-spin" />
          ) : step === TOTAL ? (
            <>
              <Spark /> See my style DNA
            </>
          ) : (
            'Continue'
          )}
        </button>
      </div>
    </main>
  )
}
