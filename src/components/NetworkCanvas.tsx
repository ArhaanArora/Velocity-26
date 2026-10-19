import { Activity, Filter, Maximize2, Minimize2, Network, Plus, RotateCcw, Server, Users, Waves, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { forceSimulation, forceLink, forceManyBody, forceCollide, forceX, forceY, type Simulation, type SimulationNodeDatum, type SimulationLinkDatum } from 'd3-force';
import type { SimulationConfig, SimulationMetrics } from '../shared/simulationTypes';
import type { ComponentKind } from './Sidebar';
import { RangeField, ServerStepper, ToggleField } from './ControlFields';

interface Props {
  config: SimulationConfig; appliedConfig: SimulationConfig; metrics: SimulationMetrics; halfOpen: number; running: boolean; tick: number; disabled: boolean;
  selected: ComponentKind | null; onSelect: (kind: ComponentKind) => void;
  onAdd: (kind: ComponentKind) => void; onRemove: (kind: ComponentKind) => void;
  onConfig: (patch: Partial<SimulationConfig>) => void; trafficLocked: boolean;
}
interface LayoutNode extends SimulationNodeDatum { id: string; ax: number; ay: number }
interface LayoutLink extends SimulationLinkDatum<LayoutNode> { id: string }
const W=800,H=560,NW=168,NH=124;
const clampX=(x:number)=>Math.max(NW/2+8,Math.min(W-NW/2-8,x));
const clampY=(y:number)=>Math.max(NH/2+8,Math.min(H-NH/2-8,y));

export function NetworkCanvas({config,appliedConfig,metrics,halfOpen,running,tick,disabled,selected,onSelect,onAdd,onRemove,onConfig,trafficLocked}:Props) {
  const svgRef=useRef<SVGSVGElement>(null);
  const simulation=useRef<Simulation<LayoutNode,LayoutLink>|null>(null);
  const nodesRef=useRef<LayoutNode[]>([]);
  const linksRef=useRef<LayoutLink[]>([]);
  const frame=useRef(0);
  const drag=useRef<{id:string;x:number;y:number;moved:boolean}|null>(null);
  const [selection,setSelection]=useState<string|null>(null);
  const [fullscreen,setFullscreen]=useState(false);
  const expandButton=useRef<HTMLButtonElement>(null);
  useEffect(()=>{
    if(!fullscreen)return;
    const close=(event:KeyboardEvent)=>{if(event.key==='Escape'){setFullscreen(false);expandButton.current?.focus();}};
    window.addEventListener('keydown',close);
    return ()=>window.removeEventListener('keydown',close);
  },[fullscreen]);
  const [notice,setNotice]=useState('Drag a tool into a matching slot. Drag installed nodes to rearrange.');
  const count=config.serverCount;
  const compact=count<=3;
  const viewBox=compact?'0 70 800 420':`0 0 ${W} ${H}`;
  const ids=['users','excess','filter','balancer',...Array.from({length:count},(_,i)=>`server-${i}`)];
  function paint() {
    const svg=svgRef.current;if(!svg)return;
    for(const node of nodesRef.current){node.x=clampX(node.x??node.ax);node.y=clampY(node.y??node.ay);svg.querySelector(`[data-layout-node="${node.id}"]`)?.setAttribute('transform',`translate(${node.x},${node.y})`);}
    for(const link of linksRef.current){const a=link.source as LayoutNode,b=link.target as LayoutNode;svg.querySelector(`[data-layout-link="${link.id}"]`)?.setAttribute('d',`M ${a.x} ${a.y} C ${(a.x!+b.x!)/2} ${a.y}, ${(a.x!+b.x!)/2} ${b.y}, ${b.x} ${b.y}`);}
  }
  useEffect(()=>{
    const previous=new Map(nodesRef.current.map(node=>[node.id,node]));
    const nodes=ids.map(id=>{
      const index=Number(id.split('-')[1]);
      const ax=id==='users'||id==='excess'?80:id==='filter'?290:id==='balancer'?470:count>3?590+(index%2)*130:710;
      const ay=id==='users'?170:id==='excess'?390:id==='filter'||id==='balancer'?280:count===1?280:count>3?90+Math.floor(index/2)*(380/(Math.ceil(count/2)-1)):135+index*(290/(count-1));
      return {...previous.get(id),id,ax,ay,x:previous.get(id)?.x??ax,y:previous.get(id)?.y??ay};
    });
    const links:LayoutLink[]=[{id:'users-filter',source:'users',target:'filter'},{id:'excess-filter',source:'excess',target:'filter'},{id:'filter-balancer',source:'filter',target:'balancer'},...Array.from({length:count},(_,i)=>({id:`balancer-server-${i}`,source:'balancer',target:`server-${i}`}))];
    nodesRef.current=nodes;linksRef.current=links;
    const sim=simulation.current??forceSimulation<LayoutNode,LayoutLink>().stop();simulation.current=sim;
    sim.nodes(nodes).force('links',forceLink<LayoutNode,LayoutLink>(links).id(node=>node.id).distance(190).strength(.08)).force('charge',forceManyBody().strength(-260)).force('collision',forceCollide<LayoutNode>(94).strength(.85)).force('columns',forceX<LayoutNode>(node=>node.ax).strength(.5)).force('rows',forceY<LayoutNode>(node=>node.ay).strength(.35)).velocityDecay(.6).alphaDecay(.045).on('tick',()=>{if(!frame.current)frame.current=requestAnimationFrame(()=>{frame.current=0;paint();});});
    if(window.matchMedia('(prefers-reduced-motion: reduce)').matches){sim.alpha(1).stop().tick(100);paint();}else{sim.alpha(.7).restart();paint();}
    // Metrics do not rebuild or reheat physics; only a topology change does.
  },[count]);
  useEffect(()=>()=>{simulation.current?.stop();cancelAnimationFrame(frame.current);},[]);
  function resetLayout(){for(const node of nodesRef.current){node.x=node.ax;node.y=node.ay;node.vx=0;node.vy=0;node.fx=null;node.fy=null;}simulation.current?.alpha(.5).restart();paint();setNotice('Layout reset. Simulation settings are unchanged.');}
  function point(event:React.PointerEvent){const svg=svgRef.current!;const p=new DOMPoint(event.clientX,event.clientY).matrixTransform(svg.getScreenCTM()!.inverse());return {x:clampX(p.x),y:clampY(p.y)};}
  function choose(id:string){if(id==='filter'&&!config.filterStrength)deploy('filter');if(id==='balancer'&&!config.loadBalancer)deploy('balancer');setSelection(id);if(id==='filter'||id==='balancer')onSelect(id);else if(id.startsWith('server'))onSelect('server');}
  function begin(event:React.PointerEvent<SVGGElement>,id:string){if(event.button!==0)return;const node=nodesRef.current.find(n=>n.id===id);if(!node)return;event.currentTarget.setPointerCapture(event.pointerId);const p=point(event);drag.current={id,...p,moved:false};node.fx=node.x;node.fy=node.y;simulation.current?.alphaTarget(.15).restart();}
  function move(event:React.PointerEvent){if(!drag.current)return;const node=nodesRef.current.find(n=>n.id===drag.current!.id)!;const p=point(event);if(Math.hypot(p.x-drag.current.x,p.y-drag.current.y)>4)drag.current.moved=true;node.fx=p.x;node.fy=p.y;node.x=p.x;node.y=p.y;paint();}
  function end(event:React.PointerEvent,id:string){if(!drag.current)return;const moved=drag.current.moved;const node=nodesRef.current.find(n=>n.id===id);if(node){node.fx=null;node.fy=null;}drag.current=null;simulation.current?.alphaTarget(0).alpha(.25).restart();if(event.type!=='pointercancel'&&!moved)choose(id);}
  function deploy(kind:ComponentKind){if(disabled)return;onAdd(kind);setSelection(kind==='server'?`server-${count}`:kind);setNotice(`${kind==='filter'?'Rate limiter':kind==='balancer'?'Load balancer':'Server'} placed. Run or Step to measure its effect.`);}
  const selectedKind=selection==='filter'?'filter':selection==='balancer'?'balancer':selection?.startsWith('server')?'server':null;
  function dropProps(kind:ComponentKind){return {'data-drop-slot':kind,onDragOver:(event:React.DragEvent)=>{if(!disabled)event.preventDefault();},onDrop:(event:React.DragEvent)=>{event.preventDefault();if(event.dataTransfer.getData('text/plain')===`cyberlab:${kind}`)deploy(kind);}};}
  const serverLinks=Array.from({length:count},(_,i)=>`balancer-server-${i}`);
  return <section className={`panel network-panel force-panel ${fullscreen?'force-fullscreen':''}`} data-tour="network" aria-label="Live network topology">
    <div className="panel-heading"><div><span className="section-eyebrow"><Network size={15}/> Interactive infrastructure</span><h2>Your network <span className="live-indicator">{running?'Running':'Paused'}</span></h2></div><div className="force-view-actions"><button className="icon-button" onClick={resetLayout} aria-label="Reset Layout" title="Reset Layout"><RotateCcw size={17}/></button><button ref={expandButton} className="icon-button" onClick={()=>setFullscreen(value=>!value)} aria-label={fullscreen?'Exit full screen':'Expand infrastructure'} aria-pressed={fullscreen} title={fullscreen?'Exit full screen (Esc)':'Full screen infrastructure'}>{fullscreen?<Minimize2 size={17}/>:<Maximize2 size={17}/>}</button></div></div>
    <div className="force-stage"><svg ref={svgRef} className="force-svg" viewBox={viewBox} data-running={running} aria-label="Draggable network; use node buttons for configuration">
      <rect x="638" y="12" width="152" height="536" rx="24" className="server-drop-zone" {...dropProps('server')}/>
      {['users-filter','excess-filter','filter-balancer',...serverLinks].map(id=><path key={id} data-layout-link={id} className={`force-link ${id==='users-filter'&&metrics.legitServed>0?'served-link':id==='excess-filter'&&tick>0&&appliedConfig.attackType!=='none'?'excess-link':id.startsWith('balancer-server-')&&id!=='balancer-server-0'&&!config.loadBalancer?'idle-link':metrics.cpuPercent>=95&&id==='filter-balancer'?'congested-link':''} ${running&&metrics.incoming>0?'moving-link':''}`}/>)}
      {ids.map(id=>{const isServer=id.startsWith('server');const index=isServer?Number(id.split('-')[1]):0;const kind:ComponentKind|null=id==='filter'?'filter':id==='balancer'?'balancer':isServer?'server':null;const placed=id==='filter'?config.filterStrength>0:id==='balancer'?config.loadBalancer:true;const Icon=id==='users'?Users:id==='excess'?Waves:id==='filter'?Filter:id==='balancer'?Network:Server;const label=id==='users'?'Real visitors':id==='excess'?'Excess traffic':id==='filter'?'Rate Limiter':id==='balancer'?'Load Balancer':`Server ${index+1}`;const detail=id==='users'?`${tick?appliedConfig.legitRate:0} req/s`:id==='excess'?`${tick&&appliedConfig.attackType!=='none'?appliedConfig.attackRate:0} req/s`:id==='filter'?placed?`${Math.round(config.filterStrength*100)}% strength`:'Drop or click to add':id==='balancer'?placed?'Sharing workload':'Drop or click to add':index>0&&!config.loadBalancer?'Idle: add balancer':`${config.perServerCapacity} req/s capacity`;return <g key={id} data-layout-node={id} className={`force-node ${!placed?'empty':''} ${selection===id?'selected':''} ${id==='users'?'served-node':id==='excess'?'excess-node':''}`} onPointerDown={event=>begin(event,id)} onPointerMove={move} onPointerUp={event=>end(event,id)} onPointerCancel={event=>end(event,id)} {...(kind?dropProps(kind):{})}>
        <title>{label}: {detail}. Drag to move; select for settings. Moving a node does not change capacity.</title><rect x={-NW/2} y={-NH/2} width={NW} height={NH} rx="17"/>
        <foreignObject x={-NW/2} y={-NH/2} width={NW} height={NH}><button className="force-node-button" aria-label={`${placed?'Select':'Add'} ${label}`} onClick={event=>{if(event.detail===0)choose(id);}}><Icon size={30}/><strong>{label}</strong><small>{detail}</small></button></foreignObject>
        <circle className={`force-status ${isServer&&index>0&&!config.loadBalancer?'idle':metrics.cpuPercent>=95&&isServer?'pressure':''}`} cx="66" cy="-46" r="4"/>
      </g>;})}
      <foreignObject x="625" y={compact?450:518} width="160" height="36"><button className="force-add-server" disabled={disabled||count>=6} onClick={()=>deploy('server')} {...dropProps('server')}><Plus size={13}/> Add server</button></foreignObject>
    </svg>
    {selection && <section className="node-popover" aria-label="Network node settings"><div className="node-popover-heading"><strong>{selection==='users'?'Real visitors':selection==='excess'?'Excess traffic':selectedKind==='filter'?'Protect traffic':selectedKind==='balancer'?'Share server workload':'Server configuration'}</strong><button className="icon-button" onClick={()=>setSelection(null)} aria-label="Close node settings"><X size={14}/></button></div>
      {selection==='users'||selection==='excess'?<RangeField label={selection==='users'?'Real visitors':'Excess traffic'} value={selection==='users'?config.legitRate:config.attackRate} max={selection==='users'?600:10000} step={selection==='users'?10:50} unit="req/s" description={trafficLocked?'Incident traffic is fixed.':'Changes apply on the next tick.'} disabled={disabled||trafficLocked} onChange={value=>onConfig(selection==='users'?{legitRate:value}:{attackRate:value,attackType:config.attackType==='none'&&value>0?'volume':config.attackType})}/>:selectedKind==='filter'?<><ToggleField label="Filtering enabled" enabled={config.filterStrength>0} disabled={disabled} onChange={()=>config.filterStrength?onRemove('filter'):deploy('filter')}/>{config.filterStrength>0&&<RangeField label="Filter strength" value={Math.round(config.filterStrength*100)} max={100} step={5} unit="%" description={`${metrics.blocked} blocked at the last tick. Filtering can reject real visitors too.`} disabled={disabled} onChange={value=>onConfig({filterStrength:value/100})}/>}</>:selectedKind==='balancer'?<><p>Shares requests across servers. Additional servers stay idle while this is off.</p><ToggleField label="Load balancing" enabled={config.loadBalancer} disabled={disabled} onChange={()=>config.loadBalancer?onRemove('balancer'):deploy('balancer')}/></>:<><p>CPU {metrics.cpuPercent.toFixed(0)}% / Connections {metrics.connectionPercent.toFixed(0)}% / {halfOpen} half-open</p><ServerStepper count={count} disabled={disabled} onChange={serverCount=>onConfig({serverCount})}/><RangeField label="Processing per server" value={config.perServerCapacity} min={50} max={1000} step={50} unit="req/s" description="Only balanced servers share capacity." disabled={disabled} onChange={perServerCapacity=>onConfig({perServerCapacity})}/></>}
      {selectedKind&&((selectedKind==='filter'&&config.filterStrength>0)||(selectedKind==='balancer'&&config.loadBalancer)||(selectedKind==='server'&&count>1))&&<button className="text-button" disabled={disabled} onClick={()=>{onRemove(selectedKind);setSelection(null);setNotice('Component removed. Advance the simulation to measure the effect.');}}>Remove {selectedKind==='server'?'one server':selectedKind==='filter'?'rate limiter':'load balancer'}</button>}
      {selectedKind&&((selectedKind==='filter'&&!config.filterStrength)||(selectedKind==='balancer'&&!config.loadBalancer))&&<button className="button button-secondary" disabled={disabled} onClick={()=>deploy(selectedKind)}>Deploy component</button>}
    </section>}
    </div><div className="force-help" role="status">{notice}</div><div className="topology-footer"><div className="legend"><span><i className="green"/>Served</span><span><i className="red"/>Excess</span><span><i className="grey"/>{metrics.blocked} blocked/s</span></div><span className="tick-label"><Activity size={12}/> Tick <b data-testid="tick">{String(tick).padStart(3,'0')}</b></span></div>
  </section>;
}
