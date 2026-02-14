import { useState, useCallback } from 'react'
import { ALGORITHMS, AES_MODES, benchmarkAlgorithm } from './crypto'

const CURVES = Object.keys(ALGORITHMS)
const AES_LENGTHS = Object.keys(AES_MODES).map(Number)

export default function AlgoCompare({ t }) {
  const [results, setResults] = useState({})
  const [running, setRunning] = useState(null)
  const [error, setError] = useState(null)

  const runBenchmark = useCallback(async (curve, aesLen) => {
    const key = `${curve}-${aesLen}`
    setRunning(key)
    setError(null)
    try {
      const res = await benchmarkAlgorithm(curve, aesLen)
      setResults(prev => ({ ...prev, [key]: res }))
    } catch (e) {
      setError(`${curve} + AES-${aesLen}: ${e.message}`)
    }
    setRunning(null)
  }, [])

  const runAll = useCallback(async () => {
    setError(null)
    for (const curve of CURVES) {
      for (const aesLen of AES_LENGTHS) {
        const key = `${curve}-${aesLen}`
        setRunning(key)
        try {
          const res = await benchmarkAlgorithm(curve, aesLen)
          setResults(prev => ({ ...prev, [key]: res }))
        } catch (e) {
          setResults(prev => ({ ...prev, [key]: { error: e.message } }))
        }
      }
    }
    setRunning(null)
  }, [])

  const fmt = (ms) => {
    if (ms < 1) return '<1 ms'
    return ms.toFixed(1) + ' ms'
  }

  return (
    <div className="algo-compare">
      <div className="algo-header">
        <h2>{t.algoTitle}</h2>
        <button
          className="regen-btn"
          onClick={runAll}
          disabled={!!running}
        >
          {running ? t.algoBenchRunning : t.algoBenchAll}
        </button>
      </div>

      <p className="algo-desc">{t.algoDesc}</p>

      {error && <div className="algo-error">{error}</div>}

      <div className="algo-table-wrap">
        <table className="algo-table">
          <thead>
            <tr>
              <th>{t.algoCurve}</th>
              <th>{t.algoAes}</th>
              <th>{t.algoSecurity}</th>
              <th>{t.algoPubKeySize}</th>
              <th>{t.algoAesKeySize}</th>
              <th>{t.algoKeygen}</th>
              <th>{t.algoDerive}</th>
              <th>{t.algoEncrypt}</th>
              <th>{t.algoDecrypt}</th>
              <th>{t.algoTotal}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {CURVES.map(curve =>
              AES_LENGTHS.map(aesLen => {
                const key = `${curve}-${aesLen}`
                const algo = ALGORITHMS[curve]
                const res = results[key]
                const isRunning = running === key
                return (
                  <tr key={key} className={isRunning ? 'algo-row-active' : ''}>
                    <td>
                      <span className="algo-curve-name">{algo.label}</span>
                      <span className="algo-curve-desc">{algo.desc}</span>
                    </td>
                    <td>{AES_MODES[aesLen].label}</td>
                    <td className="algo-sec-bits">
                      {algo.securityBits} {t.algoBit}
                    </td>
                    {res && !res.error ? (
                      <>
                        <td>{res.pubKeyBytes} B</td>
                        <td>{res.aesKeyBytes} B</td>
                        <td className="algo-time">{fmt(res.times.keygen1 + res.times.keygen2)}</td>
                        <td className="algo-time">{fmt(res.times.derive)}</td>
                        <td className="algo-time">{fmt(res.times.encrypt)}</td>
                        <td className="algo-time">{fmt(res.times.decrypt)}</td>
                        <td className="algo-time algo-total">{fmt(res.total)}</td>
                      </>
                    ) : res && res.error ? (
                      <td colSpan={5} className="algo-err-cell">{res.error}</td>
                    ) : (
                      <td colSpan={5} className="algo-empty-cell">—</td>
                    )}
                    <td>
                      <button
                        className="algo-run-btn"
                        onClick={() => runBenchmark(curve, aesLen)}
                        disabled={!!running}
                      >
                        {isRunning ? <span className="spinner-small" /> : t.algoRun}
                      </button>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="algo-info-cards">
        {CURVES.map(curve => {
          const algo = ALGORITHMS[curve]
          return (
            <div key={curve} className="algo-info-card">
              <h4>{algo.label}</h4>
              <div className="algo-info-row">
                <span>{t.algoCurveName}:</span> {algo.desc}
              </div>
              <div className="algo-info-row">
                <span>{t.algoKeyBits}:</span> {algo.keyBits} {t.algoBit}
              </div>
              <div className="algo-info-row">
                <span>{t.algoSecurity}:</span> {algo.securityBits} {t.algoBit}
              </div>
              <div className="algo-info-row">
                <span>{t.algoUsedIn}:</span> {t.algoUsage[curve]}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
