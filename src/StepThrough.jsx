import { useState, useCallback, useEffect } from 'react'
import { encrypt, decrypt, exportAesKey } from './crypto'

export default function StepThrough({ t, keys, keyData }) {
  const [input, setInput] = useState('')
  const [sender, setSender] = useState('Alice')
  const [currentStep, setCurrentStep] = useState(-1)
  const [steps, setSteps] = useState([])
  const [history, setHistory] = useState([])

  const buildSteps = useCallback(async (text, from) => {
    const senderKey = from === 'Alice' ? keys.aliceShared : keys.bobShared
    const receiverKey = from === 'Alice' ? keys.bobShared : keys.aliceShared
    const to = from === 'Alice' ? 'Bob' : 'Alice'
    const aesHex = from === 'Alice' ? keyData.aliceAes : keyData.bobAes

    const encoded = new TextEncoder().encode(text)
    const bytesHex = Array.from(encoded).map(b => b.toString(16).padStart(2, '0'))
    const bytesDisplay = bytesHex.join(' ')
    const charMap = []
    let byteIdx = 0
    for (const ch of text) {
      const charBytes = new TextEncoder().encode(ch)
      charMap.push({ char: ch, bytes: Array.from(charBytes).map(b => b.toString(16).padStart(2, '0')), offset: byteIdx })
      byteIdx += charBytes.length
    }

    const { iv, ivHex, ciphertext, plaintextHex } = await encrypt(senderKey, text)

    const decrypted = await decrypt(receiverKey, iv, ciphertext)

    const cipherRaw = Uint8Array.from(atob(ciphertext), c => c.charCodeAt(0))
    const cipherBody = cipherRaw.slice(0, cipherRaw.length - 16)
    const authTag = cipherRaw.slice(cipherRaw.length - 16)
    const cipherBodyHex = Array.from(cipherBody).map(b => b.toString(16).padStart(2, '0')).join(' ')
    const authTagHex = Array.from(authTag).map(b => b.toString(16).padStart(2, '0')).join(' ')

    return [
      {
        id: 'plaintext',
        title: t.stStep1Title,
        desc: t.stStep1Desc,
        data: [
          { label: t.stText, value: text, className: 'st-val-plain' },
          { label: t.stLength, value: `${text.length} ${t.stChars}, ${encoded.length} ${t.stBytes}` },
        ],
        info: t.stStep1Info,
      },
      {
        id: 'utf8',
        title: t.stStep2Title,
        desc: t.stStep2Desc,
        data: [
          { label: t.stHexDump, value: bytesDisplay, className: 'st-val-bytes' },
        ],
        charMap,
        info: t.stStep2Info,
      },
      {
        id: 'aes-key',
        title: t.stStep3Title,
        desc: t.stStep3Desc(from),
        data: [
          { label: t.stAesKey, value: aesHex, className: 'st-val-key' },
          { label: t.stKeyLength, value: `${aesHex.length / 2} ${t.stBytes} (${aesHex.length / 2 * 8} ${t.stBits})` },
        ],
        info: t.stStep3Info,
      },
      {
        id: 'iv',
        title: t.stStep4Title,
        desc: t.stStep4Desc,
        data: [
          { label: 'IV', value: ivHex.match(/.{2}/g).join(' '), className: 'st-val-iv' },
          { label: t.stLength, value: `12 ${t.stBytes} (96 ${t.stBits})` },
          { label: t.stSource, value: 'crypto.getRandomValues()' },
        ],
        info: t.stStep4Info,
        warning: t.stStep4Warn,
      },
      {
        id: 'encrypt',
        title: t.stStep5Title,
        desc: t.stStep5Desc,
        data: [
          { label: t.stInput, value: `plaintext (${encoded.length}B) + key (32B) + IV (12B)` },
          { label: t.stCiphertext, value: cipherBodyHex, className: 'st-val-cipher' },
          { label: t.stAuthTag, value: authTagHex, className: 'st-val-tag' },
          { label: t.stOutputSize, value: `${cipherRaw.length} ${t.stBytes} (${cipherBody.length} + 16 tag)` },
        ],
        info: t.stStep5Info,
      },
      {
        id: 'transmit',
        title: t.stStep6Title,
        desc: t.stStep6Desc(to),
        data: [
          { label: t.stServerSees, value: `{ iv: "${ivHex.slice(0, 16)}...", ciphertext: "${ciphertext.slice(0, 24)}..." }`, className: 'st-val-transmit' },
          { label: t.stServerKnows, value: t.stServerKnowsVal },
        ],
        info: t.stStep6Info,
        columns: [
          { title: t.stVisible, items: ['IV', t.stCiphertext, t.stMsgSize, t.stSenderReceiver], color: 'visible' },
          { title: t.stHidden, items: [t.stText, t.stAesKey, t.stPrivateKeys], color: 'hidden' },
        ],
      },
      {
        id: 'decrypt',
        title: t.stStep7Title,
        desc: t.stStep7Desc(to),
        data: [
          { label: t.stInput, value: `ciphertext (${cipherRaw.length}B) + key (32B) + IV (12B)` },
          { label: t.stResult, value: decrypted, className: 'st-val-decrypt' },
          { label: t.stMatch, value: decrypted === text ? t.stMatchYes : t.stMatchNo, className: decrypted === text ? 'st-val-match' : 'st-val-nomatch' },
        ],
        info: t.stStep7Info,
      },
    ]
  }, [keys, keyData, t])

  const startPipeline = useCallback(async () => {
    if (!input.trim() || !keys) return
    const s = await buildSteps(input.trim(), sender)
    setSteps(s)
    setCurrentStep(0)
  }, [input, sender, keys, buildSteps])

  const next = () => setCurrentStep(prev => Math.min(prev + 1, steps.length - 1))
  const prev = () => setCurrentStep(prev => Math.max(prev - 1, 0))
  const finish = () => {
    setHistory(h => [...h, { sender, text: input.trim(), id: Date.now() }])
    setSteps([])
    setCurrentStep(-1)
    setInput('')
  }

  useEffect(() => {
    const handler = (e) => {
      if (currentStep < 0) return
      if (e.key === 'ArrowRight') next()
      if (e.key === 'ArrowLeft') prev()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [currentStep, steps.length])

  const step = currentStep >= 0 ? steps[currentStep] : null

  return (
    <div className="step-through">
      <h2>{t.stTitle}</h2>
      <p className="st-desc">{t.stDesc}</p>

      {currentStep < 0 ? (
        <div className="st-setup">
          <div className="st-sender-select">
            <label>{t.stSender}:</label>
            <div className="st-sender-btns">
              <button
                className={`st-sender-btn ${sender === 'Alice' ? 'active alice-bg' : ''}`}
                onClick={() => setSender('Alice')}
              >Alice</button>
              <button
                className={`st-sender-btn ${sender === 'Bob' ? 'active bob-bg' : ''}`}
                onClick={() => setSender('Bob')}
              >Bob</button>
            </div>
          </div>
          <div className="st-input-row">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') startPipeline() }}
              placeholder={t.stPlaceholder}
              disabled={!keys}
            />
            <button onClick={startPipeline} disabled={!input.trim() || !keys}>
              {t.stStart}
            </button>
          </div>
          {!keys && <div className="st-warning">{t.stNeedSetup}</div>}

          {history.length > 0 && (
            <div className="st-history">
              <h4>{t.stHistory}</h4>
              {history.map(h => (
                <div key={h.id} className="st-history-item">
                  <span className={h.sender === 'Alice' ? 'alice-color' : 'bob-color'}>{h.sender}</span>: {h.text}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : step && (
        <div className="st-viewer">
          <div className="st-progress-bar">
            {steps.map((s, i) => (
              <div
                key={s.id}
                className={`st-progress-dot ${i === currentStep ? 'active' : i < currentStep ? 'done' : ''}`}
                onClick={() => setCurrentStep(i)}
                title={s.title}
              >
                {i + 1}
              </div>
            ))}
          </div>

          <div className="st-step-card">
            <div className="st-step-header">
              <span className="st-step-num">{t.stStepN(currentStep + 1, steps.length)}</span>
              <h3>{step.title}</h3>
            </div>

            <p className="st-step-desc">{step.desc}</p>

            <div className="st-data-rows">
              {step.data.map((d, i) => (
                <div key={i} className="st-data-row">
                  <span className="st-data-label">{d.label}:</span>
                  <code className={d.className || ''}>{d.value}</code>
                </div>
              ))}
            </div>

            {step.charMap && (
              <div className="st-charmap">
                <div className="st-charmap-title">{t.stCharMap}:</div>
                <div className="st-charmap-grid">
                  {step.charMap.map((cm, i) => (
                    <div key={i} className="st-charmap-item">
                      <span className="st-char">{cm.char === ' ' ? '␣' : cm.char}</span>
                      <span className="st-char-bytes">{cm.bytes.join(' ')}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {step.columns && (
              <div className="st-columns">
                {step.columns.map((col, i) => (
                  <div key={i} className={`st-column st-col-${col.color}`}>
                    <h5>{col.title}</h5>
                    <ul>
                      {col.items.map((item, j) => <li key={j}>{item}</li>)}
                    </ul>
                  </div>
                ))}
              </div>
            )}

            {step.info && <div className="st-info">{step.info}</div>}
            {step.warning && <div className="st-warning-box">{step.warning}</div>}
          </div>

          <div className="st-nav">
            <button onClick={prev} disabled={currentStep === 0}>{t.stPrev}</button>
            <span className="st-nav-hint">{t.stNavHint}</span>
            {currentStep === steps.length - 1 ? (
              <button className="st-finish-btn" onClick={finish}>{t.stFinish}</button>
            ) : (
              <button onClick={next}>{t.stNext}</button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
