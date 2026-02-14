import { useState, useEffect, useRef, useCallback } from 'react'
import {
  generateKeyPair, exportPublicKey, exportPrivateKey,
  deriveSharedKey, exportAesKey, encrypt, decrypt
} from './crypto'
import { getT } from './i18n'
import AlgoCompare from './AlgoCompare'
import BruteForce from './BruteForce'
import StepThrough from './StepThrough'
import CryptoTimeline from './CryptoTimeline'
import './App.css'

const STEP_DELAY = 600

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

export default function App() {
  const [lang, setLang] = useState(() => {
    return localStorage.getItem('e2ee-lang') || 'en'
  })
  const t = getT(lang)

  const [tab, setTab] = useState('setup')
  const [phase, setPhase] = useState('init')
  const [keygenSteps, setKeygenSteps] = useState([])
  const [messages, setMessages] = useState([])
  const [aliceInput, setAliceInput] = useState('')
  const [bobInput, setBobInput] = useState('')
  const [keys, setKeys] = useState(null)
  const [keyData, setKeyData] = useState(null)
  const [pipeline, setPipeline] = useState(null)
  const [pipelineHistory, setPipelineHistory] = useState([])
  const serverRef = useRef(null)

  const switchLang = (l) => {
    setLang(l)
    localStorage.setItem('e2ee-lang', l)
  }

  const runSetup = useCallback(async () => {
    const curT = getT(lang)
    setPhase('running')
    setKeygenSteps([])
    setKeys(null)
    setKeyData(null)
    setMessages([])
    setPipelineHistory([])

    const steps = []
    const pushStep = (s) => {
      steps.push(s)
      setKeygenSteps([...steps])
    }

    pushStep({ id: 'alice-gen', label: curT.setupAliceGen, status: 'active' })
    await sleep(STEP_DELAY)
    const aliceKeys = await generateKeyPair()
    const alicePub = await exportPublicKey(aliceKeys.publicKey)
    const alicePriv = await exportPrivateKey(aliceKeys.privateKey)
    steps[steps.length - 1] = {
      ...steps[steps.length - 1], status: 'done',
      detail: { pub: alicePub, priv: alicePriv }
    }
    setKeygenSteps([...steps])

    pushStep({ id: 'bob-gen', label: curT.setupBobGen, status: 'active' })
    await sleep(STEP_DELAY)
    const bobKeys = await generateKeyPair()
    const bobPub = await exportPublicKey(bobKeys.publicKey)
    const bobPriv = await exportPrivateKey(bobKeys.privateKey)
    steps[steps.length - 1] = {
      ...steps[steps.length - 1], status: 'done',
      detail: { pub: bobPub, priv: bobPriv }
    }
    setKeygenSteps([...steps])

    pushStep({ id: 'exchange', label: curT.setupExchange, status: 'active',
      detail: { alicePub, bobPub }
    })
    await sleep(STEP_DELAY * 1.5)
    steps[steps.length - 1].status = 'done'
    setKeygenSteps([...steps])

    pushStep({ id: 'alice-derive', label: curT.setupAliceDerive, status: 'active' })
    await sleep(STEP_DELAY)
    const aliceShared = await deriveSharedKey(aliceKeys.privateKey, bobKeys.publicKey)
    const aliceAes = await exportAesKey(aliceShared)
    steps[steps.length - 1] = {
      ...steps[steps.length - 1], status: 'done',
      detail: { aes: aliceAes }
    }
    setKeygenSteps([...steps])

    pushStep({ id: 'bob-derive', label: curT.setupBobDerive, status: 'active' })
    await sleep(STEP_DELAY)
    const bobShared = await deriveSharedKey(bobKeys.privateKey, aliceKeys.publicKey)
    const bobAes = await exportAesKey(bobShared)
    steps[steps.length - 1] = {
      ...steps[steps.length - 1], status: 'done',
      detail: { aes: bobAes }
    }
    setKeygenSteps([...steps])

    pushStep({
      id: 'verify', label: curT.setupVerify,
      status: 'done', match: aliceAes === bobAes
    })

    setKeys({ aliceShared, bobShared, alicePub, bobPub })
    setKeyData({ alicePub, alicePriv, bobPub, bobPriv, aliceAes, bobAes })
    await sleep(STEP_DELAY)
    setPhase('ready')
  }, [lang])

  useEffect(() => {
    runSetup()
  }, [])

  useEffect(() => {
    if (serverRef.current) {
      serverRef.current.scrollTop = serverRef.current.scrollHeight
    }
  }, [messages])

  const sendMessage = useCallback(async (from) => {
    const text = from === 'Alice' ? aliceInput.trim() : bobInput.trim()
    if (!text || !keys || pipeline) return

    const senderKey = from === 'Alice' ? keys.aliceShared : keys.bobShared
    const receiverKey = from === 'Alice' ? keys.bobShared : keys.aliceShared
    const to = from === 'Alice' ? 'Bob' : 'Alice'

    const p = { from, to, plaintext: text, steps: [] }
    const addStep = async (step) => {
      p.steps = [...p.steps, step]
      setPipeline({ ...p })
      await sleep(STEP_DELAY)
    }

    if (from === 'Alice') setAliceInput('')
    else setBobInput('')

    setTab('pipeline')
    await addStep({ label: t.pPlain(from), value: text, type: 'plain' })

    const encoded = new TextEncoder().encode(text)
    const bytesHex = Array.from(encoded).map(b => b.toString(16).padStart(2, '0')).join(' ')
    await addStep({ label: t.pBytes, value: bytesHex, type: 'bytes' })

    const { iv, ivHex, ciphertext } = await encrypt(senderKey, text)
    await addStep({ label: t.pIv, value: ivHex, type: 'iv' })
    await addStep({ label: t.pEncrypt, value: ciphertext, type: 'cipher' })
    await addStep({
      label: t.pTransmit(to),
      value: `{ iv: "${iv}", ciphertext: "${ciphertext.slice(0, 24)}..." }`,
      type: 'transmit'
    })

    const decrypted = await decrypt(receiverKey, iv, ciphertext)
    await addStep({ label: t.pDecrypt(to), value: decrypted, type: 'decrypt' })

    setMessages(prev => [...prev, {
      id: Date.now(), from, to,
      plaintext: text, ciphertext, iv, ivHex, decrypted,
    }])

    await sleep(400)
    setPipelineHistory(prev => [...prev, { ...p, id: Date.now() }])
    setPipeline(null)
  }, [aliceInput, bobInput, keys, pipeline, t])

  function handleKey(e, from) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(from)
    }
  }

  const tabs = [
    { id: 'setup', label: t.tabSetup },
    { id: 'keys', label: t.tabKeys, disabled: phase !== 'ready' },
    { id: 'chat', label: t.tabChat, disabled: phase !== 'ready' },
    { id: 'pipeline', label: t.tabPipeline, disabled: phase !== 'ready' },
    { id: 'algo', label: t.tabAlgo },
    { id: 'brute', label: t.tabBrute, disabled: phase !== 'ready' },
    { id: 'step', label: t.tabStep, disabled: phase !== 'ready' },
    { id: 'timeline', label: t.tabTimeline },
  ]

  const hasPipelines = pipelineHistory.length > 0 || pipeline

  const aliceMessages = messages.filter(m => m.from === 'Alice' || m.to === 'Alice')
  const bobMessages = messages.filter(m => m.from === 'Bob' || m.to === 'Bob')

  return (
    <div className="app">
      <div className="header">
        <div className="header-left" />
        <div className="header-center">
          <h1>{t.title}</h1>
          <p className="subtitle">{t.subtitle}</p>
        </div>
        <div className="header-right">
          <div className="lang-switcher">
            <button
              className={lang === 'ru' ? 'active' : ''}
              onClick={() => switchLang('ru')}
            >RU</button>
            <button
              className={lang === 'en' ? 'active' : ''}
              onClick={() => switchLang('en')}
            >EN</button>
          </div>
        </div>
      </div>

      <div className="tabs">
        {tabs.map(tb => (
          <button
            key={tb.id}
            className={`tab ${tab === tb.id ? 'active' : ''}`}
            disabled={tb.disabled}
            onClick={() => setTab(tb.id)}
          >
            {tb.label}
          </button>
        ))}
      </div>

      {tab === 'setup' && (
        <div className="tab-content">
          <div className="setup-container">
            <div className="setup-header">
              <h2 className="setup-title">{t.setupTitle}</h2>
              {phase === 'ready' && (
                <button className="regen-btn" onClick={() => { runSetup() }}>
                  {t.regenKeys}
                </button>
              )}
            </div>
            {phase === 'init' ? (
              <div className="loading-inline">{t.generating}</div>
            ) : (
              <div className="setup-steps">
                {keygenSteps.map((step) => (
                  <div key={step.id} className={`setup-step ${step.status}`}>
                    <div className="step-indicator">
                      {step.status === 'active' ? (
                        <span className="spinner" />
                      ) : (
                        <span className="checkmark">&#10003;</span>
                      )}
                    </div>
                    <div className="step-body">
                      <div className="step-label">{step.label}</div>
                      {step.detail && (
                        <div className="step-detail">
                          {step.detail.pub && (
                            <>
                              <div className="detail-row">
                                <span className="detail-key">Public:</span>
                                <code>{step.detail.pub}</code>
                              </div>
                              <div className="detail-row">
                                <span className="detail-key">Private:</span>
                                <code>{step.detail.priv}</code>
                              </div>
                            </>
                          )}
                          {step.detail.alicePub && (
                            <>
                              <div className="exchange-visual">
                                <span className="ex-user alice-color">Alice</span>
                                <span className="ex-arrow">— pubKey →</span>
                                <span className="ex-user bob-color">Bob</span>
                              </div>
                              <div className="exchange-visual">
                                <span className="ex-user bob-color">Bob</span>
                                <span className="ex-arrow">— pubKey →</span>
                                <span className="ex-user alice-color">Alice</span>
                              </div>
                            </>
                          )}
                          {step.detail.aes && (
                            <div className="detail-row">
                              <span className="detail-key">AES-256:</span>
                              <code className="aes-key">{step.detail.aes}</code>
                            </div>
                          )}
                        </div>
                      )}
                      {step.match !== undefined && (
                        <div className="match-badge">
                          {step.match ? t.keysMatch : t.keysNoMatch}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="explainer">
            <h3>{t.howTitle}</h3>
            <ol>
              {t.howSteps.map(([title, desc], i) => (
                <li key={i}><strong>{title}</strong> {desc}</li>
              ))}
            </ol>
          </div>
        </div>
      )}

      {tab === 'keys' && keyData && (
        <div className="tab-content">
          <div className="key-summary">
            <div className="key-card alice-border">
              <h4 className="alice-color">Alice</h4>
              <div className="key-row"><span>Public:</span> <code>{keyData.alicePub}</code></div>
              <div className="key-row"><span>Private:</span> <code>{keyData.alicePriv}</code></div>
              <div className="key-row"><span>AES-256:</span> <code className="aes-key">{keyData.aliceAes}</code></div>
            </div>
            <div className="key-card shared-border">
              <h4>{t.sharedSecret}</h4>
              <code className="aes-key shared-key">{keyData.aliceAes}</code>
              <div className="shared-note">
                ECDH(privAlice, pubBob) = ECDH(privBob, pubAlice)
              </div>
            </div>
            <div className="key-card bob-border">
              <h4 className="bob-color">Bob</h4>
              <div className="key-row"><span>Public:</span> <code>{keyData.bobPub}</code></div>
              <div className="key-row"><span>Private:</span> <code>{keyData.bobPriv}</code></div>
              <div className="key-row"><span>AES-256:</span> <code className="aes-key">{keyData.bobAes}</code></div>
            </div>
          </div>
        </div>
      )}

      {tab === 'pipeline' && (
        <div className="tab-content">
          {hasPipelines ? (
            <div className="pipeline-list">
              {pipeline && (
                <div className="pipeline pipeline-active">
                  <div className="pipeline-header">
                    <span className="pipeline-title">
                      {t.pipelineTitle(pipeline.from, pipeline.to)}
                    </span>
                  </div>
                  <div className="pipeline-log">
                    {pipeline.steps.map((step, i) => (
                      <div key={i} className={`plog-row plog-${step.type}`}>
                        <span className="plog-num">{i + 1}</span>
                        <span className="plog-label">{step.label}</span>
                        <code className="plog-value">{step.value}</code>
                      </div>
                    ))}
                    <div className="plog-cursor" />
                  </div>
                </div>
              )}
              {[...pipelineHistory].reverse().map((p) => (
                <div key={p.id} className="pipeline">
                  <div className="pipeline-header">
                    <span className="pipeline-title">
                      {t.pipelineTitle(p.from, p.to)}
                    </span>
                    <span className="pipeline-done">&#10003;</span>
                  </div>
                  <div className="pipeline-log">
                    {p.steps.map((step, i) => (
                      <div key={i} className={`plog-row plog-${step.type}`}>
                        <span className="plog-num">{i + 1}</span>
                        <span className="plog-label">{step.label}</span>
                        <code className="plog-value">{step.value}</code>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="pipeline-empty">{t.pipelineEmpty}</div>
          )}
        </div>
      )}

      {tab === 'chat' && keys && (
        <div className="tab-content">
          <div className="panels">
            <div className="panel alice">
              <h2>Alice</h2>
              <div className="chat">
                {aliceMessages.map(m => (
                  <div key={m.id} className={`msg ${m.from === 'Alice' ? 'sent' : 'received'}`}>
                    <div className="msg-label">{m.from === 'Alice' ? t.sent : t.received}</div>
                    <div className="msg-text">
                      {m.from === 'Alice' ? m.plaintext : m.decrypted}
                    </div>
                  </div>
                ))}
              </div>
              <div className="input-row">
                <input
                  value={aliceInput}
                  onChange={e => setAliceInput(e.target.value)}
                  onKeyDown={e => handleKey(e, 'Alice')}
                  placeholder={t.alicePlaceholder}
                  disabled={!!pipeline}
                />
                <button onClick={() => sendMessage('Alice')} disabled={!!pipeline}>{t.send}</button>
              </div>
            </div>

            <div className="panel server">
              <h2>{t.server}</h2>
              <p className="server-note">{t.serverNote}</p>
              <div className="chat" ref={serverRef}>
                {messages.map(m => (
                  <div key={m.id} className="msg encrypted">
                    <div className="msg-label">{m.from} → {m.to}</div>
                    <div className="msg-meta">IV: {m.ivHex}</div>
                    <div className="msg-cipher">{m.ciphertext}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="panel bob">
              <h2>Bob</h2>
              <div className="chat">
                {bobMessages.map(m => (
                  <div key={m.id} className={`msg ${m.from === 'Bob' ? 'sent' : 'received'}`}>
                    <div className="msg-label">{m.from === 'Bob' ? t.sent : t.received}</div>
                    <div className="msg-text">
                      {m.from === 'Bob' ? m.plaintext : m.decrypted}
                    </div>
                  </div>
                ))}
              </div>
              <div className="input-row">
                <input
                  value={bobInput}
                  onChange={e => setBobInput(e.target.value)}
                  onKeyDown={e => handleKey(e, 'Bob')}
                  placeholder={t.bobPlaceholder}
                  disabled={!!pipeline}
                />
                <button onClick={() => sendMessage('Bob')} disabled={!!pipeline}>{t.send}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'algo' && (
        <div className="tab-content">
          <AlgoCompare t={t} />
        </div>
      )}

      {tab === 'brute' && (
        <div className="tab-content">
          <BruteForce t={t} messages={messages} />
        </div>
      )}

      {tab === 'step' && (
        <div className="tab-content">
          <StepThrough t={t} keys={keys} keyData={keyData} />
        </div>
      )}

      {tab === 'timeline' && (
        <div className="tab-content">
          <CryptoTimeline t={t} />
        </div>
      )}
    </div>
  )
}
