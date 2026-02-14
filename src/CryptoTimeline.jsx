import { useState } from 'react'

const ERAS = [
  { id: 'pre', color: '#888' },
  { id: 'symmetric', color: '#e0a040' },
  { id: 'asymmetric', color: '#5b9bd5' },
  { id: 'modern', color: '#70c97a' },
  { id: 'postquantum', color: '#c070d0' },
]

export default function CryptoTimeline({ t }) {
  const [expanded, setExpanded] = useState(null)
  const [filter, setFilter] = useState('all')

  const events = t.tlEvents

  const filtered = filter === 'all'
    ? events
    : events.filter(e => e.era === filter)

  const toggle = (id) => setExpanded(prev => prev === id ? null : id)

  const statusClass = (s) => {
    if (s === 'broken') return 'tl-status-broken'
    if (s === 'deprecated') return 'tl-status-deprecated'
    if (s === 'current') return 'tl-status-current'
    if (s === 'future') return 'tl-status-future'
    return ''
  }

  const eraColor = (eraId) => ERAS.find(e => e.id === eraId)?.color || '#888'

  return (
    <div className="crypto-timeline">
      <h2>{t.tlTitle}</h2>
      <p className="tl-desc">{t.tlDesc}</p>

      <div className="tl-filters">
        <button
          className={`tl-filter-btn ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >{t.tlAll}</button>
        {ERAS.map(era => (
          <button
            key={era.id}
            className={`tl-filter-btn ${filter === era.id ? 'active' : ''}`}
            style={filter === era.id ? { borderColor: era.color, color: era.color } : {}}
            onClick={() => setFilter(era.id)}
          >{t.tlEras[era.id]}</button>
        ))}
      </div>

      <div className="tl-legend">
        <span className="tl-legend-item tl-status-broken">{t.tlBroken}</span>
        <span className="tl-legend-item tl-status-deprecated">{t.tlDeprecated}</span>
        <span className="tl-legend-item tl-status-current">{t.tlCurrent}</span>
        <span className="tl-legend-item tl-status-future">{t.tlFuture}</span>
      </div>

      <div className="tl-line">
        {filtered.map((ev) => (
          <div
            key={ev.id}
            className={`tl-event ${expanded === ev.id ? 'tl-expanded' : ''}`}
            onClick={() => toggle(ev.id)}
          >
            <div className="tl-dot" style={{ borderColor: eraColor(ev.era) }} />
            <div className="tl-event-content">
              <div className="tl-event-header">
                <span className="tl-year">{ev.year}</span>
                <span className="tl-name">{ev.name}</span>
                <span className={`tl-status ${statusClass(ev.status)}`}>{t.tlStatuses[ev.status]}</span>
              </div>
              <div className="tl-tagline">{ev.tagline}</div>
              {expanded === ev.id && (
                <div className="tl-details">
                  <div className="tl-detail-grid">
                    {ev.details.map((d, i) => (
                      <div key={i} className="tl-detail-row">
                        <span className="tl-detail-label">{d.label}:</span>
                        <span className="tl-detail-value">{d.value}</span>
                      </div>
                    ))}
                  </div>
                  {ev.note && <div className="tl-note">{ev.note}</div>}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="tl-summary">
        <h4>{t.tlSummaryTitle}</h4>
        <div className="tl-summary-text">{t.tlSummaryText}</div>
      </div>
    </div>
  )
}
