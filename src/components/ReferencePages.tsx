import { lazy, Suspense } from 'react';
import { ArrowUpRight } from 'lucide-react';
import type { SimulationState } from '../shared/simulationTypes';
import type { ComponentKind } from './Sidebar';
import { ResourceMeters } from './ResourceMeters';
const TrafficChart = lazy(()=>import('./TrafficChart').then(module=>({default:module.TrafficChart})));

export function AnalyticsPage({state}: {state:SimulationState}) {
  const m=state.metrics;
  const stats=[['Website availability',m.legitAvailabilityPercent.toFixed(1),'%'],['Incoming',m.incoming,'req/s'],['Served',m.legitServed+m.attackServed,'req/s'],['Blocked',m.blocked,'req/s'],['Dropped',m.legitDropped+m.attackDropped,'req/s'],['Modeled latency',m.latencyMs,'ms'],['Waiting requests',m.queueDepth,'requests'],['Half-open connections',state.halfOpen,'slots']] as const;
  return <section className="reference-page" aria-labelledby="analytics-title"><div className="page-heading"><h1 id="analytics-title">Analytics</h1><p>Why is the service behaving this way? Measurements from tick {state.tick}; one tick is one simulated second.</p></div><div className="analytics-grid"><div data-tour="metrics"><ResourceMeters metrics={m}/><dl className="technical-stats">{stats.map(([label,value,unit])=><div key={label}><dt>{label}</dt><dd>{value}<span>{unit}</span></dd></div>)}</dl></div><div><Suspense fallback={<p>Loading traffic history…</p>}><TrafficChart state={state}/></Suspense><div className="analytics-note"><h3>Read the signals together</h3><p>Served includes both legitimate and excess requests. Blocked means rejected by filtering; dropped means unprocessed requests that could not wait. Website availability focuses on legitimate customers.</p><p>Bandwidth is a utilization reference in this model. SYN connections constrain queue room, rather than directly stopping immediate processing.</p></div></div></div></section>;
}

const concepts: {title:string;text:string;example:string;component?:ComponentKind}[] = [
  {title:'Requests',text:'A request is a visitor asking your service to do something, such as load a page.',example:'Turn up Real visitors and watch requests arrive.'},
  {title:'Servers',text:'Servers process requests. More servers share work only when balancing is enabled in CyberLab.',example:'Add a server, then enable the load balancer.',component:'server'},
  {title:'CPU',text:'Processing utilization shows how much of the available request-processing capacity is being used.',example:'Compare incoming requests with effective server capacity.'},
  {title:'Bandwidth',text:'Bandwidth describes how much data a network can transfer over time. CyberLab uses a requests-per-second reference.',example:'This model reports bandwidth usage but does not throttle processing with it.'},
  {title:'Denial of service',text:'Too much demand can prevent legitimate people from accessing a service. Distributed attacks use many sources.',example:'Try a simulated volume surge. This lab sends no real attack traffic.'},
  {title:'Rate limiting',text:'Filtering restricts accepted traffic before it reaches the server. It can reject legitimate customers too.',example:'Change filter strength and compare availability after a tick.',component:'filter'},
  {title:'Load balancing',text:'A load balancer shares incoming work across available servers.',example:'In this model it scales all four resources with server count.',component:'balancer'},
  {title:'Connection slots',text:'Connection slots are space shared by queued requests and incomplete SYN handshakes.',example:'SYN traffic fills slots and leaves less room for waiting requests.'},
  {title:'Queues',text:'A queue holds requests that cannot be processed immediately. Queue space does not add processing capacity.',example:'A bigger queue can absorb a burst, but customers may wait longer.'},
  {title:'Latency',text:'Latency is the modeled waiting time before a response, shown in milliseconds.',example:'In CyberLab it grows with queued requests relative to processing capacity.'},
];
export function LearnPage({onExplore}:{onExplore:(component?:ComponentKind)=>void}) {
  return <section className="reference-page" aria-labelledby="learn-title"><div className="page-heading"><h1 id="learn-title">Learn by experimenting</h1><p>A short reference for the concepts in your workspace. Change one thing, advance time, and compare the evidence.</p></div><div className="learn-grid">{concepts.map(concept=><article className="learn-card" key={concept.title}><h2>{concept.title}</h2><p>{concept.text}</p><p className="learn-example">{concept.example}</p><button className="text-button" onClick={()=>onExplore(concept.component)}>Explore in Workspace<ArrowUpRight size={14}/></button></article>)}</div></section>;
}
