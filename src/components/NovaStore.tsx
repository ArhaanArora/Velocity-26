import { ArrowUpRight, Check, ChevronLeft, ChevronRight, CloudOff, LockKeyhole, RotateCw, Search, ShoppingBag } from 'lucide-react';
import { useState } from 'react';
import type { SimulationState } from '../shared/simulationTypes';
import { storeCondition } from '../lib/experience';

const products = [
  { name: 'Arc headphones', category: 'Audio', finish: 'Graphite', price: '$129', kind: 'headphones' },
  { name: 'Everyday tote', category: 'Carry', finish: 'Natural canvas', price: '$38', kind: 'tote' },
  { name: 'Loop desk lamp', category: 'Living', finish: 'Soft white', price: '$79', kind: 'lamp' },
];

function ProductGraphic({ kind }: { kind: string }) {
  return <svg viewBox="0 0 180 140" fill="none" aria-hidden="true" className={`product-graphic ${kind}`}>
    {kind === 'headphones' ? <>
      <path d="M48 83V66a42 42 0 0 1 84 0v17" stroke="#333" strokeWidth="13" />
      <path d="M51 70V62a39 39 0 0 1 78 0v8" stroke="#686868" strokeWidth="4" />
      <rect x="36" y="70" width="26" height="49" rx="12" fill="#262626" /><rect x="118" y="70" width="26" height="49" rx="12" fill="#262626" />
      <rect x="51" y="74" width="12" height="41" rx="6" fill="#555" /><rect x="117" y="74" width="12" height="41" rx="6" fill="#555" />
    </> : kind === 'tote' ? <>
      <path d="M66 51V38a24 24 0 0 1 48 0v13" stroke="#a69b83" strokeWidth="7" />
      <path d="M45 46h90l10 78H35L45 46Z" fill="#d6ccba" /><path d="m47 50 5 70h76l5-70" stroke="#c1b59e" strokeWidth="2" />
      <path d="M65 49v12m50-12v12" stroke="#a99b80" strokeWidth="4" /><text x="90" y="92" textAnchor="middle" fill="#766c59" fontSize="10" fontFamily="Arial" letterSpacing="3">NOVA</text>
    </> : <>
      <ellipse cx="91" cy="123" rx="37" ry="8" fill="#c4c4c0" /><path d="M90 118V48" stroke="#aeaeaa" strokeWidth="7" />
      <path d="M45 66C45 35 62 19 90 19s45 16 45 47H45Z" fill="#d9d9d4" /><ellipse cx="90" cy="66" rx="45" ry="8" fill="#bcbcb6" />
      <ellipse cx="90" cy="65" rx="23" ry="4" fill="#eee9d9" />
    </>}
  </svg>;
}

export function NovaStore({ state, awaitingIncident = false }: { state: SimulationState; awaitingIncident?: boolean }) {
  const { metrics, tick } = state;
  const condition = storeCondition(metrics);
  const [category, setCategory] = useState('All objects');
  const [attempt, setAttempt] = useState<string | null>(null);
  const listed = products.filter(product => category === 'All objects' || product.category === category);
  const visible = condition === 'healthy' ? listed.length : Math.min(2, Math.max(1, Math.floor(metrics.legitAvailabilityPercent / 100 * listed.length)));
  function refresh() {
    setAttempt(tick === 0 ? 'The store is ready. Run or Step to measure its response.' : condition === 'unavailable'
      ? `Still unavailable at tick ${tick}. ${metrics.legitAvailabilityPercent.toFixed(1)}% of legitimate requests were served.`
      : `Opened at tick ${tick}: ${metrics.legitAvailabilityPercent.toFixed(1)}% availability, ${metrics.latencyMs} ms modeled response time.`);
  }
  return <section className={`store-panel ${condition} ${awaitingIncident ? 'awaiting' : ''}`} aria-label="Nova Store live preview">
    <div className="store-browser-bar"><div className="browser-controls"><i /><i /><i /></div><span><LockKeyhole size={11} /> nova.store <span>/ local preview</span></span><div className="browser-arrows"><ChevronLeft size={13} /><ChevronRight size={13} /></div></div>
    <div className="store-site">
      <div className="store-nav"><span className="nova-wordmark">nova<span>®</span></span><span className="store-nav-copy">Objects for the everyday.</span><ShoppingBag size={17} /></div>
      <div className="store-heading"><div><span className="store-kicker">A little less. A little better.</span><h2>Good things,<br />made for your day.</h2></div><span className={`store-health ${condition}`}><i />{awaitingIncident ? 'Investigation not started' : tick === 0 ? 'Ready to browse' : condition === 'healthy' ? 'Store is open' : condition === 'degraded' ? 'Pages are loading slowly' : 'Store unavailable'}{tick > 0 && <b>{metrics.legitAvailabilityPercent.toFixed(1)}%</b>}</span></div>
      {awaitingIncident ? <div className="store-error store-awaiting"><Search size={30} strokeWidth={1.5} /><h3>Your investigation starts here.</h3><p>Begin the incident to observe how customers experience Nova Store.</p></div> : condition === 'unavailable' ? <div className="store-error"><CloudOff size={32} strokeWidth={1.5} /><h3>This store can’t be reached.</h3><p>Customers are having trouble loading products. Investigate the network to find out why.</p><button className="button button-secondary" onClick={refresh}><RotateCw size={14} />Retry store</button></div> : <>
        <nav className="store-categories" aria-label="Store categories">{['All objects', 'Audio', 'Living', 'Carry'].map(item => <button key={item} aria-pressed={category === item} className={category === item ? 'active' : ''} onClick={() => setCategory(item)}>{item}</button>)}</nav>
        <div className="store-products">{listed.map((product, index) => <article className={`product-card ${index >= visible ? 'product-waiting' : ''}`} key={product.name}>
          <div className="product-media">{index < visible ? <ProductGraphic kind={product.kind} /> : <div className="product-skeleton"><span className="loading-ring" /><span>Waiting for a response…</span></div>}</div>
          {index < visible ? <><div className="product-name"><h3>{product.name}</h3><span>{product.price}</span></div><p>{product.finish}</p></> : <><div className="skeleton-line" /><div className="skeleton-line short" /></>}
        </article>)}</div>
        {condition === 'degraded' && <div className="store-delay"><span className="loading-ring" /> Some content is taking longer to load. Modeled latency: {metrics.latencyMs} ms.</div>}
      </>}
    </div>
    <div className="store-preview-footer"><span>{condition === 'healthy' ? <Check size={13} /> : <span className="condition-dot" />}A fictional store. A real simulation.</span>{!awaitingIncident && <button onClick={refresh}>{attempt ? 'Refresh store' : 'Try opening the store'}{attempt ? <RotateCw size={14} /> : <ArrowUpRight size={14} />}</button>}</div>
    {attempt && <p className="store-attempt" role="status">{attempt}</p>}
  </section>;
}
