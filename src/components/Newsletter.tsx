import { useState, type FormEvent } from 'react'
import { NEWSLETTER_ENDPOINT } from '../data'
import { useStore } from '../store'

type Status = 'idle' | 'busy' | 'empty' | 'invalid' | 'unavailable' | 'ok'

export function Newsletter() {
  const { t, lang } = useStore()
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<Status>('idle')

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const value = email.trim()
    if (!value) return setStatus('empty')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) return setStatus('invalid')
    setStatus('busy')
    if (!NEWSLETTER_ENDPOINT) { setTimeout(() => setStatus('unavailable'), 500); return }
    try {
      const r = await fetch(NEWSLETTER_ENDPOINT, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: value, lang }),
      })
      setStatus(r.ok ? 'ok' : 'unavailable')
      if (r.ok) setEmail('')
    } catch {
      setStatus('unavailable')
    }
  }

  const messages: Record<Status, string> = {
    idle: '', busy: '', empty: t.nlEmpty, invalid: t.nlInvalid, unavailable: t.nlUnavailable, ok: t.nlOk,
  }
  const bad = status === 'empty' || status === 'invalid'

  return (
    <section aria-labelledby="nl-h" className="newsletter">
      <div data-anim="stagger" className="wrap nl-grid">
        <div>
          <h2 id="nl-h">{t.nlTitle}</h2>
          <p className="lede">{t.nlText}</p>
        </div>
        <form onSubmit={submit} noValidate className="nl-form">
          <label htmlFor="bahr-email">{t.nlLabel}</label>
          <div className="nl-row">
            <input
              id="bahr-email" type="email" inputMode="email" autoComplete="email" dir="ltr" placeholder="name@example.com"
              value={email} onChange={(e) => { setEmail(e.target.value); if (status !== 'busy') setStatus('idle') }}
              aria-invalid={bad} aria-describedby="bahr-nl-msg"
            />
            <button type="submit" disabled={status === 'busy'} className="btn btn-solid">{status === 'busy' ? t.nlBusy : t.nlBtn}</button>
          </div>
          <p id="bahr-nl-msg" role="status" aria-live="polite" className={'nl-msg ' + status}>{messages[status]}</p>
        </form>
      </div>
    </section>
  )
}
