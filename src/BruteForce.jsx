import { useState, useRef, useCallback } from 'react'
import { tryRandomDecrypt } from './crypto'

const BATCH_SIZE = 50

export default function BruteForce({ t, messages }) {
  const [running, setRunning] = useState(false)
  const [attempts, setAttempts] = useState(0)
  const [lastKeys, setLastKeys] = useState([])
  const [speed, setSpeed] = useState(0)
  const [speedLevel, setSpeedLevel] = useState('browser')
  const runRef = useRef(false)
  const startTimeRef = useRef(0)

  const targetMsg = messages.length > 0 ? messages[messages.length - 1] : null

  const start = useCallback(() => {
    if (!targetMsg) return
    runRef.current = true
    setRunning(true)
    setAttempts(0)
    setLastKeys([])
    setSpeed(0)
    startTimeRef.current = performance.now()

    const loop = async () => {
      while (runRef.current) {
        const batch = []
        for (let i = 0; i < BATCH_SIZE; i++) {
          batch.push(tryRandomDecrypt(targetMsg.iv, targetMsg.ciphertext))
        }
        const results = await Promise.all(batch)

        if (!runRef.current) break

        setAttempts(prev => {
          const next = prev + BATCH_SIZE
          const elapsed = (performance.now() - startTimeRef.current) / 1000
          if (elapsed > 0) setSpeed(Math.round(next / elapsed))
          return next
        })

        const display = results.slice(-3).map(r => r.keyHex)
        setLastKeys(display)

        await new Promise(r => setTimeout(r, 0))
      }
    }
    loop()
  }, [targetMsg])

  const stop = useCallback(() => {
    runRef.current = false
    setRunning(false)
  }, [])

  const reset = useCallback(() => {
    runRef.current = false
    setRunning(false)
    setAttempts(0)
    setLastKeys([])
    setSpeed(0)
  }, [])

  const totalKeys = BigInt(2) ** BigInt(256)
  const totalKeysStr = '2²⁵⁶ ≈ 1.15 × 10⁷⁷'

  const speedMultipliers = {
    browser: { label: t.bfSpeedBrowser, mult: 1 },
    gpu: { label: t.bfSpeedGpu, mult: 1e6 },
    supercomputer: { label: t.bfSpeedSuper, mult: 1e12 },
    allEarth: { label: t.bfSpeedEarth, mult: 1e18 },
  }

  const effectiveSpeed = Math.max(speed, 1) * speedMultipliers[speedLevel].mult
  const secondsNeeded = Number(totalKeys / BigInt(Math.max(Math.round(effectiveSpeed), 1)))
  const yearsNeeded = secondsNeeded / (365.25 * 24 * 3600)

  const formatYears = (y) => {
    if (!isFinite(y) || y > 1e70) return '> 10⁷⁰'
    if (y > 1e60) return `≈ 10⁶⁰⁺`
    const exp = Math.floor(Math.log10(y))
    return `≈ 10^${exp}`
  }

  const universeAge = '1.38 × 10¹⁰'
  const atoms = '≈ 10⁸⁰'

  const progressPct = attempts / Number(totalKeys) * 100

  return (
    <div className="bruteforce">
      <h2>{t.bfTitle}</h2>
      <p className="bf-desc">{t.bfDesc}</p>

      {!targetMsg ? (
        <div className="bf-no-msg">{t.bfNoMsg}</div>
      ) : (
        <>
          <div className="bf-target">
            <div className="bf-target-label">{t.bfTarget}</div>
            <div className="bf-target-row">
              <span className="bf-field-label">IV:</span>
              <code>{targetMsg.ivHex}</code>
            </div>
            <div className="bf-target-row">
              <span className="bf-field-label">{t.bfCipher}:</span>
              <code>{targetMsg.ciphertext.slice(0, 60)}...</code>
            </div>
          </div>

          <div className="bf-controls">
            {!running ? (
              <button className="bf-btn bf-start" onClick={start}>{t.bfStart}</button>
            ) : (
              <button className="bf-btn bf-stop" onClick={stop}>{t.bfPause}</button>
            )}
            <button className="bf-btn bf-reset" onClick={reset} disabled={running}>{t.bfReset}</button>
          </div>

          <div className="bf-stats">
            <div className="bf-stat-block">
              <div className="bf-stat-label">{t.bfAttempts}</div>
              <div className="bf-stat-value">{attempts.toLocaleString()}</div>
            </div>
            <div className="bf-stat-block">
              <div className="bf-stat-label">{t.bfSpeed}</div>
              <div className="bf-stat-value">{speed.toLocaleString()} {t.bfPerSec}</div>
            </div>
            <div className="bf-stat-block">
              <div className="bf-stat-label">{t.bfKeyspace}</div>
              <div className="bf-stat-value bf-keyspace">{totalKeysStr}</div>
            </div>
          </div>

          <div className="bf-progress-section">
            <div className="bf-progress-bar">
              <div className="bf-progress-fill" style={{ width: `${Math.min(progressPct, 100)}%` }} />
            </div>
            <div className="bf-progress-label">
              {progressPct > 0 ? progressPct.toExponential(2) : '0'}%
            </div>
          </div>

          <div className="bf-keys-log">
            <div className="bf-keys-title">{t.bfLastKeys}</div>
            {lastKeys.map((k, i) => (
              <div key={i} className="bf-key-row">
                <code>{k}</code>
                <span className="bf-key-fail">✗</span>
              </div>
            ))}
          </div>

          <div className="bf-speed-section">
            <div className="bf-speed-title">{t.bfWhatIf}</div>
            <div className="bf-speed-buttons">
              {Object.entries(speedMultipliers).map(([key, val]) => (
                <button
                  key={key}
                  className={`bf-speed-btn ${speedLevel === key ? 'active' : ''}`}
                  onClick={() => setSpeedLevel(key)}
                >
                  {val.label}
                </button>
              ))}
            </div>
            <div className="bf-time-estimate">
              <div className="bf-time-label">{t.bfTimeNeeded}:</div>
              <div className="bf-time-value">{formatYears(yearsNeeded)} {t.bfYears}</div>
            </div>
          </div>

          <div className="bf-comparisons">
            <div className="bf-compare-title">{t.bfScale}</div>
            <div className="bf-compare-item">
              <span>{t.bfUniverseAge}:</span>
              <strong>{universeAge} {t.bfYears}</strong>
            </div>
            <div className="bf-compare-item">
              <span>{t.bfAtoms}:</span>
              <strong>{atoms}</strong>
            </div>
            <div className="bf-compare-item">
              <span>{t.bfAesKeyspace}:</span>
              <strong>{totalKeysStr}</strong>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
