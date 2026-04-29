import { useState, useEffect, useMemo } from "react";

const CONFIG_KEY  = "finapp_config";
const TX_KEY      = "finapp_transactions";
const BUDGET_KEY  = "finapp_budgets";

const TYPE_COLORS = { income:"#22c55e", expense:"#ef4444", saving:"#3b82f6", investment:"#f59e0b", debt:"#ec4899" };

// ─── Fix 1: number formatting with commas, no odd M suffix ───────────────────
function fmt(n, dec=0) {
  return Number(n||0).toLocaleString("th-TH", { minimumFractionDigits:dec, maximumFractionDigits:dec });
}
function fmtSmart(n) {
  const abs = Math.abs(n||0);
  if (abs >= 10000000) return (n/1000000).toFixed(1)+"M";
  return fmt(n); // always commas, no K/M unless very large
}
function fmtShort(n) {
  const abs = Math.abs(n||0);
  if (abs >= 1000000) return (n/1000000).toFixed(1)+"M";
  if (abs >= 10000)   return (n/1000).toFixed(1)+"K";
  return fmt(n);
}

function thisMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
}
function prevMonthOf(ym) {
  const [y,m] = ym.split("-").map(Number);
  const d = new Date(y, m-2, 1);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
}
function monthLabel(ym) {
  if (!ym) return "";
  try { return new Date(ym+"-01T00:00:00").toLocaleDateString("th-TH",{month:"long",year:"numeric"}); }
  catch { return ym; }
}
function shortMonth(ym) {
  if (!ym) return "";
  try { return new Date(ym+"-01T00:00:00").toLocaleDateString("th-TH",{month:"short"}); }
  catch { return ym.slice(5,7); }
}

// ─── Fix 5: Smart trend badge ──────────────────────────────────────────────────
// isPositiveGood: income/saving = true (green=up), expense = false (green=down)
function TrendBadge({ curr, prev, isPositiveGood=true }) {
  if (prev === undefined || prev === null) return null;
  const pct = prev > 0 ? ((curr - prev) / prev) * 100 : curr > 0 ? 100 : 0;
  const isZero = Math.abs(pct) < 0.05;
  const isUp   = pct > 0.05;
  let color;
  if (isZero) color = "#f59e0b";
  else if (isUp) color = isPositiveGood ? "#22c55e" : "#ef4444";
  else           color = isPositiveGood ? "#ef4444" : "#22c55e";
  const arrow = isZero ? "—" : isUp ? "▲" : "▼";
  return (
    <div style={{ fontSize:11, fontWeight:600, color, marginTop:2 }}>
      {arrow} {Math.abs(pct).toFixed(1)}% vs เดือนก่อน
    </div>
  );
}

// ─── Seed mock data (Fix 4: 12 months, varied amounts) ────────────────────────
function seedIfEmpty() {
  try {
    if (!localStorage.getItem(CONFIG_KEY)) {
      localStorage.setItem(CONFIG_KEY, JSON.stringify({
        profile: { name:"สมชาย", age:"30", baseCurrency:"THB" },
        accounts: [
          { id:"acc1", name:"SCB หลัก",      type:"ธนาคาร",      balance:150000, currency:"THB", color:"#6366f1" },
          { id:"acc2", name:"กระเป๋า Rabbit", type:"กระเป๋าเงิน", balance:3500,   currency:"THB", color:"#22c55e" },
        ],
        categories: [
          {id:"c1",type:"income",   main:"เงินเดือน",  sub:"เงินเดือนประจำ"},
          {id:"c2",type:"income",   main:"Freelance",  sub:"รับจ้างเขียน Code"},
          {id:"c3",type:"expense",  main:"อาหาร",      sub:"อาหารกลางวัน"},
          {id:"c4",type:"expense",  main:"อาหาร",      sub:"อาหารเย็น"},
          {id:"c5",type:"expense",  main:"อาหาร",      sub:"กาแฟ/เครื่องดื่ม"},
          {id:"c6",type:"expense",  main:"การเดินทาง", sub:"น้ำมัน"},
          {id:"c7",type:"expense",  main:"การเดินทาง", sub:"Grab/Taxi"},
          {id:"c8",type:"expense",  main:"ที่พักอาศัย",sub:"ค่าเช่า/ผ่อนบ้าน"},
          {id:"c9",type:"expense",  main:"ความบันเทิง",sub:"Netflix"},
          {id:"c10",type:"expense", main:"ความบันเทิง",sub:"เกม"},
          {id:"c11",type:"expense", main:"สุขภาพ",     sub:"ฟิตเนส"},
          {id:"c12",type:"saving",  main:"เงินออม",    sub:"ออมฉุกเฉิน"},
          {id:"c13",type:"saving",  main:"เงินออม",    sub:"ออมระยะยาว"},
          {id:"c14",type:"investment",main:"การลงทุน", sub:"หุ้น"},
          {id:"c15",type:"investment",main:"การลงทุน", sub:"กองทุน"},
        ],
        goals: [
          {id:"g1",name:"กองฉุกเฉิน 6 เดือน",type:"saving",    target:180000,current:95000, deadline:"2025-12-31"},
          {id:"g2",name:"ซื้อ MacBook Pro",   type:"purchase",  target:80000, current:42000, deadline:"2025-08-31"},
          {id:"g3",name:"เป้าลงทุน",          type:"investment",target:500000,current:185000,deadline:"2026-12-31"},
        ],
        people:[{id:"p1",name:"พ่อ",nickname:"พ่อ",color:"#f59e0b"},{id:"p2",name:"แม่",nickname:"แม่",color:"#ec4899"}],
      }));
    }
    if (!localStorage.getItem(TX_KEY)) {
      const now = new Date();
      const txs = [];
      let i=1; const id=()=>`mtx_${i++}`;
      const seas=[0.85,0.9,0.95,1.0,1.05,1.1,1.2,1.15,1.0,0.95,1.1,1.3];
      for (let mo=-11;mo<=0;mo++) {
        const d=new Date(now.getFullYear(),now.getMonth()+mo,1);
        const y=d.getFullYear(), mm=String(d.getMonth()+1).padStart(2,"0"), p=`${y}-${mm}`;
        const s=seas[((d.getMonth())+12)%12];
        const rnd=(base,spread)=>Math.round((base+(Math.random()-0.5)*spread)*s);
        txs.push({id:id(),date:`${p}-01`,type:"income",mainCat:"เงินเดือน",subCat:"เงินเดือนประจำ",amount:55000,currency:"THB",account:"acc1",paidBy:"self"});
        if(Math.random()>0.3) txs.push({id:id(),date:`${p}-15`,type:"income",mainCat:"Freelance",subCat:"รับจ้างเขียน Code",amount:rnd(9000,8000),currency:"THB",account:"acc1",paidBy:"self"});
        txs.push({id:id(),date:`${p}-03`,type:"expense",mainCat:"ที่พักอาศัย",subCat:"ค่าเช่า/ผ่อนบ้าน",amount:12000,currency:"THB",account:"acc1",paidBy:"self"});
        txs.push({id:id(),date:`${p}-05`,type:"expense",mainCat:"อาหาร",subCat:"อาหารกลางวัน",amount:rnd(2800,600),currency:"THB",account:"acc1",paidBy:"self"});
        txs.push({id:id(),date:`${p}-10`,type:"expense",mainCat:"อาหาร",subCat:"อาหารเย็น",amount:rnd(3200,800),currency:"THB",account:"acc1",paidBy:"self"});
        txs.push({id:id(),date:`${p}-12`,type:"expense",mainCat:"อาหาร",subCat:"กาแฟ/เครื่องดื่ม",amount:rnd(900,400),currency:"THB",account:"acc2",paidBy:"self"});
        txs.push({id:id(),date:`${p}-07`,type:"expense",mainCat:"การเดินทาง",subCat:"น้ำมัน",amount:rnd(1800,600),currency:"THB",account:"acc1",paidBy:"self"});
        if(Math.random()>0.4) txs.push({id:id(),date:`${p}-18`,type:"expense",mainCat:"การเดินทาง",subCat:"Grab/Taxi",amount:rnd(500,400),currency:"THB",account:"acc2",paidBy:"self"});
        txs.push({id:id(),date:`${p}-01`,type:"expense",mainCat:"ความบันเทิง",subCat:"Netflix",amount:449,currency:"THB",account:"acc1",paidBy:"self"});
        if(Math.random()>0.45) txs.push({id:id(),date:`${p}-20`,type:"expense",mainCat:"ความบันเทิง",subCat:"เกม",amount:rnd(500,600),currency:"THB",account:"acc1",paidBy:"self"});
        txs.push({id:id(),date:`${p}-01`,type:"expense",mainCat:"สุขภาพ",subCat:"ฟิตเนส",amount:600,currency:"THB",account:"acc1",paidBy:"self"});
        txs.push({id:id(),date:`${p}-25`,type:"saving",mainCat:"เงินออม",subCat:"ออมฉุกเฉิน",amount:5000,currency:"THB",account:"acc1",paidBy:"self"});
        txs.push({id:id(),date:`${p}-25`,type:"saving",mainCat:"เงินออม",subCat:"ออมระยะยาว",amount:rnd(3000,1000),currency:"THB",account:"acc1",paidBy:"self"});
        txs.push({id:id(),date:`${p}-20`,type:"investment",mainCat:"การลงทุน",subCat:"หุ้น",amount:rnd(5000,3000),currency:"THB",account:"acc1",paidBy:"self"});
        if(Math.random()>0.35) txs.push({id:id(),date:`${p}-21`,type:"investment",mainCat:"การลงทุน",subCat:"กองทุน",amount:rnd(2500,2000),currency:"THB",account:"acc1",paidBy:"self"});
      }
      localStorage.setItem(TX_KEY, JSON.stringify(txs));
    }
    if (!localStorage.getItem(BUDGET_KEY)) {
      const now=new Date(); const bgs=[]; let bi=1;
      const mkB=(m,type,cat,amt)=>({id:`mbg_${bi++}`,month:m,type,category:cat,amount:amt});
      for(let mo=-11;mo<=0;mo++){
        const d=new Date(now.getFullYear(),now.getMonth()+mo,1);
        const m=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
        bgs.push(mkB(m,"income","เงินเดือน",55000),mkB(m,"income","Freelance",10000));
        bgs.push(mkB(m,"expense","ที่พักอาศัย",12000),mkB(m,"expense","อาหาร",8000),mkB(m,"expense","การเดินทาง",2500),mkB(m,"expense","ความบันเทิง",1500),mkB(m,"expense","สุขภาพ",600));
        bgs.push(mkB(m,"saving","เงินออม",8000),mkB(m,"investment","การลงทุน",7000));
      }
      localStorage.setItem(BUDGET_KEY, JSON.stringify(bgs));
    }
  } catch(e){ console.error(e); }
}

// ─── Fix 2: Interactive bar chart (hover/touch tooltip) ───────────────────────
function InteractiveBarChart({ data, height=100 }) {
  const [hov, setHov] = useState(null);
  const maxVal = Math.max(...data.flatMap(d=>[d.income||0,d.expense||0]),1);
  return (
    <div style={{ position:"relative", paddingTop:50 }}>
      {hov!==null && data[hov] && (
        <div style={{
          position:"absolute", top:2,
          left:`calc(${(hov/data.length)*100}% + ${(1/data.length)*50}%)`,
          transform:"translateX(-50%)",
          background:"#1a1a2e", color:"#fff", borderRadius:8,
          padding:"6px 10px", fontSize:11, fontWeight:600,
          pointerEvents:"none", zIndex:20, whiteSpace:"nowrap",
          boxShadow:"0 4px 14px rgba(0,0,0,0.25)",
        }}>
          <div style={{ marginBottom:2, color:"rgba(255,255,255,0.6)", fontSize:10 }}>{monthLabel(data[hov].month)}</div>
          <div style={{ color:"#86efac" }}>↑ รับ ฿{fmt(data[hov].income)}</div>
          <div style={{ color:"#fca5a5" }}>↓ จ่าย ฿{fmt(data[hov].expense)}</div>
          <div style={{ color:"#a5b4fc", borderTop:"1px solid rgba(255,255,255,0.15)", marginTop:3, paddingTop:3 }}>
            Net {data[hov].income-data[hov].expense>=0?"+":""}฿{fmt(data[hov].income-data[hov].expense)}
          </div>
        </div>
      )}
      <div style={{ display:"flex", alignItems:"flex-end", gap:3, height }}>
        {data.map((d,i)=>{
          const iH=(d.income/maxVal)*(height-12), eH=(d.expense/maxVal)*(height-12);
          const isH=hov===i;
          return (
            <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:1, cursor:"pointer" }}
              onMouseEnter={()=>setHov(i)} onMouseLeave={()=>setHov(null)}
              onTouchStart={()=>setHov(i)} onTouchEnd={()=>setTimeout(()=>setHov(null),1500)}>
              <div style={{ width:"100%", display:"flex", gap:1, alignItems:"flex-end", height:height-12 }}>
                <div style={{ flex:1, background:"#22c55e", borderRadius:"3px 3px 0 0", height:Math.max(iH,2), opacity:isH?1:0.7, transition:"opacity 0.15s" }}/>
                <div style={{ flex:1, background:"#ef4444", borderRadius:"3px 3px 0 0", height:Math.max(eH,2), opacity:isH?1:0.7, transition:"opacity 0.15s" }}/>
              </div>
              <div style={{ fontSize:8, color:isH?"#374151":"#9ca3af", fontWeight:isH?700:400, lineHeight:1.2, textAlign:"center" }}>
                {shortMonth(d.month)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Fix 2: Interactive net chart (clickable to change month) ─────────────────
function InteractiveNetChart({ data, selectedMonth, onSelect, height=90 }) {
  const [hov, setHov] = useState(null);
  const maxAbs = Math.max(...data.map(d=>Math.abs(d.net)),1);
  return (
    <div style={{ position:"relative", paddingTop:44 }}>
      {hov!==null && data[hov] && (
        <div style={{
          position:"absolute", top:2,
          left:`calc(${(hov/data.length)*100}% + ${(1/data.length)*50}%)`,
          transform:"translateX(-50%)",
          background:"#1a1a2e", color:"#fff", borderRadius:8,
          padding:"6px 10px", fontSize:11, fontWeight:600,
          pointerEvents:"none", zIndex:20, whiteSpace:"nowrap",
          boxShadow:"0 4px 14px rgba(0,0,0,0.25)",
        }}>
          <div style={{ color:"rgba(255,255,255,0.6)", fontSize:10, marginBottom:2 }}>{monthLabel(data[hov].month)}</div>
          <div style={{ color:data[hov].net>=0?"#86efac":"#fca5a5" }}>
            Net {data[hov].net>=0?"+":""}฿{fmt(data[hov].net)}
          </div>
          <div style={{ fontSize:9, color:"rgba(255,255,255,0.5)", marginTop:2 }}>คลิกเพื่อดูเดือนนี้</div>
        </div>
      )}
      <div style={{ display:"flex", gap:3, alignItems:"flex-end", height }}>
        {data.map((d,i)=>{
          const h=(Math.abs(d.net)/maxAbs)*(height-16);
          const color=d.net>=0?"#22c55e":"#ef4444";
          const isSel=d.month===selectedMonth, isH=hov===i;
          return (
            <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:2, cursor:"pointer" }}
              onMouseEnter={()=>setHov(i)} onMouseLeave={()=>setHov(null)}
              onTouchStart={()=>setHov(i)} onTouchEnd={()=>setTimeout(()=>setHov(null),1500)}
              onClick={()=>onSelect&&onSelect(d.month)}>
              <div style={{ fontSize:8, fontWeight:700, color, opacity:isSel||isH?1:0.55 }}>
                {d.net>=0?"+":""}{fmtShort(d.net)}
              </div>
              <div style={{
                width:"100%", height:Math.max(h,4), background:color,
                borderRadius:"4px 4px 0 0",
                opacity:isSel?1:isH?0.85:0.45,
                outline:isSel?`2px solid ${color}`:"none",
                transition:"all 0.2s",
              }}/>
              <div style={{ fontSize:8, color:isSel?"#374151":"#9ca3af", fontWeight:isSel?700:400, lineHeight:1.1 }}>
                {shortMonth(d.month)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Fix 3: Donut chart with legend + hover tooltip ───────────────────────────
function DonutChart({ items, centerLabel="", size=145 }) {
  const [hov, setHov] = useState(null);
  const total = items.reduce((s,x)=>s+(x.value||0), 0);
  if (!total) return (
    <div style={{ textAlign:"center", padding:"18px 0", color:"#9ca3af", fontSize:12 }}>ไม่มีข้อมูล</div>
  );
  const r=(size-16)/2, cx=size/2, cy=size/2;

  let cumPct=0;
  const slices=items.map((item,i)=>{
    const pct=item.value/total;
    const start=cumPct; cumPct+=pct;
    return {...item, pct, start, end:cumPct, i};
  });

  const toXY=(pct,ri)=>{
    const a=pct*2*Math.PI-Math.PI/2;
    return {x:cx+ri*Math.cos(a), y:cy+ri*Math.sin(a)};
  };

  const arcPath=(s,expand=0)=>{
    const r1=r, r2=r-15;
    const mid=(s.start+s.end)/2*2*Math.PI-Math.PI/2;
    const dx=expand*Math.cos(mid), dy=expand*Math.sin(mid);
    const p1=toXY(s.start,r1), p2=toXY(s.end,r1), p3=toXY(s.end,r2), p4=toXY(s.start,r2);
    const lg=(s.end-s.start)>0.5?1:0;
    return `M${p1.x+dx} ${p1.y+dy} A${r1} ${r1} 0 ${lg} 1 ${p2.x+dx} ${p2.y+dy} L${p3.x+dx} ${p3.y+dy} A${r2} ${r2} 0 ${lg} 0 ${p4.x+dx} ${p4.y+dy}Z`;
  };

  const hovS = hov!==null ? slices[hov] : null;

  return (
    <div style={{ display:"flex", alignItems:"flex-start", gap:14 }}>
      <svg width={size} height={size} style={{ flexShrink:0, overflow:"visible" }}>
        {slices.map(s=>(
          <path key={s.i} d={arcPath(s, hov===s.i?4:0)} fill={s.color}
            style={{ cursor:"pointer", transition:"all 0.15s" }}
            onMouseEnter={()=>setHov(s.i)} onMouseLeave={()=>setHov(null)}
            onTouchStart={()=>setHov(s.i)} onTouchEnd={()=>setTimeout(()=>setHov(null),1400)}
          />
        ))}
        {/* Center text */}
        <text x={cx} y={cy-10} textAnchor="middle" dominantBaseline="middle"
          fontSize={9} fontWeight={600} fill="#9ca3af">{hovS?hovS.label:centerLabel}</text>
        <text x={cx} y={cy+5} textAnchor="middle" dominantBaseline="middle"
          fontSize={14} fontWeight={800} fill={hovS?hovS.color:"#1a1a2e"}>
          {hovS?`${(hovS.pct*100).toFixed(1)}%`:`฿${fmtShort(total)}`}
        </text>
        {hovS && (
          <text x={cx} y={cy+22} textAnchor="middle" dominantBaseline="middle"
            fontSize={10} fontWeight={600} fill="#6b7280">฿{fmt(hovS.value)}</text>
        )}
      </svg>

      {/* Legend */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", gap:6, paddingTop:4 }}>
        {slices.map(s=>(
          <div key={s.i} style={{ display:"flex", alignItems:"flex-start", gap:6, cursor:"pointer",
            opacity:hov===null||hov===s.i?1:0.4, transition:"opacity 0.15s" }}
            onMouseEnter={()=>setHov(s.i)} onMouseLeave={()=>setHov(null)}>
            <div style={{ width:8, height:8, borderRadius:2, background:s.color, flexShrink:0, marginTop:2 }}/>
            <div style={{ minWidth:0 }}>
              <div style={{ fontSize:11, fontWeight:600, color:"#374151",
                overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{s.label}</div>
              <div style={{ fontSize:10, color:"#9ca3af" }}>฿{fmt(s.value)} · {(s.pct*100).toFixed(1)}%</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── DonutGauge ───────────────────────────────────────────────────────────────
function DonutGauge({ value, max, color, size=62 }) {
  const r=(size-10)/2, circ=2*Math.PI*r, p=max>0?Math.min(1,value/max):0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#f3f4f6" strokeWidth={8}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={8}
        strokeDasharray={`${p*circ} ${circ-p*circ}`} strokeDashoffset={circ/4}
        strokeLinecap="round" style={{transition:"stroke-dasharray 0.5s ease"}}/>
      <text x={size/2} y={size/2+1} textAnchor="middle" dominantBaseline="middle"
        fontSize={11} fontWeight={700} fill={color}>{Math.round(p*100)}%</text>
    </svg>
  );
}

// ─── Sparkline (Kept for future use if needed) ────────────────────────────────
function SparkLine({ data, color="#6366f1", height=36 }) {
  if (data.length<2) return null;
  const vals=data.map(d=>d.value), mn=Math.min(...vals), mx=Math.max(...vals,mn+1);
  const W=100,H=height,pad=3;
  const pts=data.map((d,i)=>{
    const x=pad+(i/(data.length-1))*(W-pad*2);
    const y=pad+(1-(d.value-mn)/(mx-mn))*(H-pad*2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  const f0=pts.split(" ")[0].split(",")[0], fN=pts.split(" ").slice(-1)[0].split(",")[0];
  return (
    <svg width="100%" height={height} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
      <polygon points={`${f0},${H} ${pts} ${fN},${H}`} fill={color} opacity={0.12}/>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function Card({ children, style={}, title, action }) {
  return (
    <div style={{ background:"#fff", borderRadius:16, border:"1.5px solid #f3f4f6",
      padding:"16px 18px", boxShadow:"0 1px 4px rgba(0,0,0,0.04)", ...style }}>
      {title&&(
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
          <h3 style={{ margin:0, fontSize:13, fontWeight:700, color:"#374151" }}>{title}</h3>
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

function StatTile({ label, value, sub, color, curr, prev, isPositiveGood=true, chart }) {
  return (
    <div style={{ background:"#fff", borderRadius:16, border:`1.5px solid ${color}22`, padding:"14px 16px" }}>
      <div style={{ fontSize:11, color:"#9ca3af", marginBottom:4, fontWeight:500 }}>{label}</div>
      <div style={{ fontSize:20, fontWeight:800, color, lineHeight:1.2, marginBottom:1 }}>฿{fmtSmart(value)}</div>
      {sub&&<div style={{ fontSize:11, color:"#6b7280", marginBottom:2 }}>{sub}</div>}
      <TrendBadge curr={curr!==undefined?curr:value} prev={prev} isPositiveGood={isPositiveGood}/>
      {chart&&<div style={{ marginTop:8 }}>{chart}</div>}
    </div>
  );
}

function GoalCard({ goal }) {
  const pct=goal.target>0?Math.min(100,Math.round((goal.current/goal.target)*100)):0;
  const color=pct>=100?"#22c55e":pct>=60?"#6366f1":pct>=30?"#f59e0b":"#ef4444";
  const icons={saving:"🏦",purchase:"🛍️",balance:"💰",investment:"📈"};
  const daysLeft=goal.deadline?Math.round((new Date(goal.deadline)-new Date())/86400000):null;
  return (
    <div style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 12px",
      background:"#f9fafb", borderRadius:12, border:"1px solid #f3f4f6" }}>
      <DonutGauge value={goal.current} max={goal.target} color={color} size={58}/>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontWeight:700, fontSize:13, color:"#1a1a2e", marginBottom:2 }}>{icons[goal.type]||"🎯"} {goal.name}</div>
        <div style={{ fontSize:11, color:"#6b7280" }}>฿{fmt(goal.current)} / ฿{fmt(goal.target)}</div>
        <div style={{ marginTop:5, background:"#e5e7eb", borderRadius:99, height:4, overflow:"hidden" }}>
          <div style={{ width:`${pct}%`, height:"100%", background:color, borderRadius:99 }}/>
        </div>
      </div>
      {daysLeft!==null&&(
        <div style={{ fontSize:10, color:daysLeft<30?"#ef4444":daysLeft<90?"#f59e0b":"#9ca3af", fontWeight:600, flexShrink:0 }}>
          {daysLeft>0?`${daysLeft} วัน`:"ครบแล้ว"}
        </div>
      )}
    </div>
  );
}

function BudgetRow({ label, actual, budget, color }) {
  const pct=budget>0?Math.min(Math.round((actual/budget)*100),999):0;
  const over=actual>budget&&budget>0, warn=!over&&pct>=80;
  const barColor=over?"#ef4444":warn?"#f59e0b":color;
  return (
    <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
      <div style={{ width:7, height:7, borderRadius:"50%", background:color, flexShrink:0 }}/>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, marginBottom:3 }}>
          <span style={{ fontWeight:600, color:"#374151", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{label}</span>
          <span style={{ fontWeight:700, color:over?"#ef4444":"#374151", flexShrink:0, marginLeft:8 }}>
            ฿{fmtShort(actual)}{budget>0&&<span style={{ color:"#9ca3af", fontWeight:400 }}>/฿{fmtShort(budget)}</span>}
          </span>
        </div>
        <div style={{ background:"#f3f4f6", borderRadius:99, height:5, overflow:"hidden" }}>
          <div style={{ width:`${Math.min(100,pct)}%`, height:"100%", background:barColor, borderRadius:99, transition:"width 0.4s" }}/>
        </div>
      </div>
      <div style={{ fontSize:10, fontWeight:700, color:over?"#ef4444":warn?"#f59e0b":"#9ca3af", minWidth:30, textAlign:"right" }}>
        {budget>0?`${pct}%`:"—"}
      </div>
    </div>
  );
}

function TopExpRow({ rank, label, amount, total, color }) {
  const pct=total>0?Math.round((amount/total)*100):0;
  const medals=["#f59e0b","#9ca3af","#cd7c4a"];
  return (
    <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:7 }}>
      <div style={{ width:20, height:20, borderRadius:7, flexShrink:0, display:"flex", alignItems:"center",
        justifyContent:"center", fontSize:10, fontWeight:800,
        background:rank<=3?medals[rank-1]+"22":"#f3f4f6", color:rank<=3?medals[rank-1]:"#9ca3af" }}>{rank}</div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, marginBottom:3 }}>
          <span style={{ fontWeight:600, color:"#374151", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{label}</span>
          <span style={{ fontWeight:700, color:"#ef4444", flexShrink:0, marginLeft:6 }}>฿{fmt(amount)}</span>
        </div>
        <div style={{ background:"#f3f4f6", borderRadius:99, height:4, overflow:"hidden" }}>
          <div style={{ width:`${pct}%`, height:"100%", background:color||"#ef4444", borderRadius:99, opacity:0.7 }}/>
        </div>
      </div>
      <div style={{ fontSize:10, color:"#9ca3af", minWidth:26, textAlign:"right" }}>{pct}%</div>
    </div>
  );
}

function MonthPicker({ value, onChange }) {
  const now=new Date();
  const opts=Array.from({length:13},(_,i)=>{
    const d=new Date(now.getFullYear(),now.getMonth()-12+i,1);
    const v=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
    return {value:v,label:monthLabel(v)};
  });
  return (
    <select value={value} onChange={e=>onChange(e.target.value)} style={{
      padding:"7px 12px", borderRadius:10, border:"none", fontSize:12,
      background:"rgba(255,255,255,0.14)", color:"#fff", fontFamily:"inherit",
      cursor:"pointer", outline:"none",
    }}>
      {opts.map(o=><option key={o.value} value={o.value} style={{color:"#1a1a2e"}}>{o.label}</option>)}
    </select>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function MonthlyDashboard() {
  const [config, setConfig]   = useState({ profile:{baseCurrency:"THB"}, accounts:[], goals:[] });
  const [transactions, setTx] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [month, setMonth]     = useState(thisMonth());
  const [donutTab, setDonutTab] = useState("overview"); // overview|maincat|subcat

  useEffect(()=>{
    seedIfEmpty();
    try {
      const c=localStorage.getItem(CONFIG_KEY); if(c) setConfig(JSON.parse(c));
      const t=localStorage.getItem(TX_KEY);     if(t) setTx(JSON.parse(t));
      const b=localStorage.getItem(BUDGET_KEY); if(b) setBudgets(JSON.parse(b));
    } catch(e){}
  },[]);

  const prevMonth = useMemo(()=>prevMonthOf(month),[month]);
  const monthTx   = useMemo(()=>transactions.filter(t=>t.date?.startsWith(month)),[transactions,month]);
  const prevTx    = useMemo(()=>transactions.filter(t=>t.date?.startsWith(prevMonth)),[transactions,prevMonth]);

  const summarize = (txList)=>{
    const s={income:0,expense:0,saving:0,investment:0};
    txList.forEach(t=>{ if(s[t.type]!==undefined) s[t.type]+=t.amount||0; });
    return s;
  };
  const sum  = useMemo(()=>summarize(monthTx),[monthTx]);
  const prev = useMemo(()=>summarize(prevTx),[prevTx]);

  const totalBalance = useMemo(()=>(config.accounts||[]).reduce((s,a)=>s+(a.balance||0),0),[config.accounts]);
  const prevBalance  = totalBalance - (prev.income - prev.expense - prev.saving - prev.investment);

  const balanceHistory = useMemo(()=>{
    const now=new Date(); let running=totalBalance;
    return Array.from({length:6},(_,i)=>{
      const d=new Date(now.getFullYear(),now.getMonth()-5+i,1);
      const m=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
      const net=transactions.filter(t=>t.date?.startsWith(m)).reduce((s,t)=>t.type==="income"?s+(t.amount||0):s-(t.amount||0),0);
      return {month:m,value:running+net};
    });
  },[transactions,totalBalance]);

  const cashFlowHistory = useMemo(()=>{
    const now=new Date();
    return Array.from({length:12},(_,i)=>{
      const d=new Date(now.getFullYear(),now.getMonth()-11+i,1);
      const m=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
      const txs=transactions.filter(t=>t.date?.startsWith(m));
      return {month:m,
        income: txs.filter(t=>t.type==="income").reduce((s,t)=>s+(t.amount||0),0),
        expense:txs.filter(t=>t.type==="expense").reduce((s,t)=>s+(t.amount||0),0),
        net:    txs.filter(t=>t.type==="income").reduce((s,t)=>s+(t.amount||0),0)
               -txs.filter(t=>t.type==="expense").reduce((s,t)=>s+(t.amount||0),0),
      };
    });
  },[transactions]);

  const budgetActual = useMemo(()=>{
    const mb=budgets.filter(b=>b.month===month);
    const r={};
    mb.forEach(b=>{ const k=b.category||"อื่นๆ"; if(!r[k]) r[k]={budget:0,actual:0,type:b.type}; r[k].budget+=b.amount||0; });
    monthTx.forEach(t=>{ const k=t.mainCat||"อื่นๆ"; if(!r[k]) r[k]={budget:0,actual:0,type:t.type}; r[k].actual+=t.amount||0; });
    return Object.entries(r).filter(([,v])=>(v.budget>0||v.actual>0)&&v.type!=="income").sort((a,b)=>b[1].actual-a[1].actual);
  },[budgets,monthTx,month]);

  const totalExpBudget=useMemo(()=>budgets.filter(b=>b.month===month&&b.type==="expense").reduce((s,b)=>s+(b.amount||0),0),[budgets,month]);

  const top10=useMemo(()=>{
    const map={};
    monthTx.filter(t=>t.type==="expense").forEach(t=>{ const k=t.subCat||t.mainCat||"อื่นๆ"; map[k]=(map[k]||0)+(t.amount||0); });
    return Object.entries(map).sort((a,b)=>b[1]-a[1]).slice(0,10);
  },[monthTx]);

  const COLORS=["#ef4444","#f59e0b","#6366f1","#22c55e","#ec4899","#14b8a6","#8b5cf6","#f97316","#06b6d4","#84cc16"];

  const donutOverview=useMemo(()=>[
    {label:"รายรับ",value:sum.income,color:"#22c55e"},
    {label:"รายจ่าย",value:sum.expense,color:"#ef4444"},
    {label:"ออม",value:sum.saving,color:"#3b82f6"},
    {label:"ลงทุน",value:sum.investment,color:"#f59e0b"},
  ].filter(x=>x.value>0),[sum]);

  const donutMainCat=useMemo(()=>{
    const m={};
    monthTx.filter(t=>t.type==="expense").forEach(t=>{ const k=t.mainCat||"อื่นๆ"; m[k]=(m[k]||0)+(t.amount||0); });
    return Object.entries(m).sort((a,b)=>b[1]-a[1]).map(([k,v],i)=>({label:k,value:v,color:COLORS[i%COLORS.length]}));
  },[monthTx]);

  const donutSubCat=useMemo(()=>{
    const m={};
    monthTx.filter(t=>t.type==="expense").forEach(t=>{ const k=t.subCat||t.mainCat||"อื่นๆ"; m[k]=(m[k]||0)+(t.amount||0); });
    return Object.entries(m).sort((a,b)=>b[1]-a[1]).map(([k,v],i)=>({label:k,value:v,color:COLORS[i%COLORS.length]}));
  },[monthTx]);

  const donutData=donutTab==="overview"?donutOverview:donutTab==="maincat"?donutMainCat:donutSubCat;
  const donutCenter=donutTab==="overview"?"ภาพรวม":donutTab==="maincat"?"หมวดหลัก":"หมวดย่อย";

  const totalExp=sum.expense;
  const savingRate=sum.income>0?((sum.saving+sum.investment)/sum.income)*100:0;
  const goals=config.goals||[];
  const cashflow=sum.income-sum.expense;

  return (
    <div style={{ fontFamily:"'Noto Sans Thai','Sarabun',sans-serif", minHeight:"100vh", background:"#f8f9fb" }}>

      {/* Header */}
      <div style={{ background:"linear-gradient(135deg,#1a1a2e,#16213e,#0f3460)", padding:"20px 20px 16px" }}>
        <div style={{ maxWidth:960, margin:"0 auto" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:14 }}>
            <div>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <div style={{ width:34, height:34, borderRadius:9, background:"#6366f1", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>💎</div>
                <span style={{ fontSize:20, fontWeight:800, color:"#fff", letterSpacing:"-0.5px" }}>FinFlow</span>
                <span style={{ fontSize:11, padding:"2px 8px", background:"rgba(255,255,255,0.12)", borderRadius:99, color:"rgba(255,255,255,0.7)" }}>MONTHLY</span>
              </div>
              <p style={{ margin:"4px 0 0 44px", fontSize:12, color:"rgba(255,255,255,0.5)" }}>
                {config.profile?.name?`สวัสดี ${config.profile.name} 👋`:"Monthly Dashboard"} · {monthLabel(month)}
              </p>
            </div>
            <MonthPicker value={month} onChange={setMonth}/>
          </div>
          <div style={{ display:"flex", gap:8, overflowX:"auto", paddingBottom:2 }}>
            {[
              {label:"รายได้",v:sum.income,c:"#22c55e"},
              {label:"รายจ่าย",v:sum.expense,c:"#ef4444"},
              {label:"ออม",v:sum.saving,c:"#3b82f6"},
              {label:"ลงทุน",v:sum.investment,c:"#f59e0b"},
              {label:"คงเหลือ",v:sum.income-sum.expense-sum.saving-sum.investment,c:(sum.income-sum.expense-sum.saving-sum.investment)>=0?"#22c55e":"#ef4444"},
            ].map(k=>(
              <div key={k.label} style={{ flex:"0 0 auto", minWidth:100,
                background:"rgba(255,255,255,0.08)", borderRadius:12, padding:"8px 12px",
                border:"1px solid rgba(255,255,255,0.1)" }}>
                <div style={{ fontSize:10, color:"rgba(255,255,255,0.55)", marginBottom:2 }}>{k.label}</div>
                <div style={{ fontSize:14, fontWeight:800, color:k.c }}>฿{fmtShort(k.v)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth:960, margin:"0 auto", padding:"20px 16px 60px" }}>

        {/* Row 1: Stat tiles */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(175px,1fr))", gap:12, marginBottom:16 }}>
          <StatTile
            label="Total Balance"
            value={totalBalance}
            sub={`เดือนก่อน: ฿${fmt(prevBalance)}`}
            color="#6366f1"
            curr={totalBalance}
            prev={prevBalance}
            isPositiveGood={true}
          />
          <StatTile
            label="รายได้เดือนนี้"
            value={sum.income}
            sub={`เดือนก่อน: ฿${fmt(prev.income)}`}
            color="#22c55e"
            curr={sum.income}
            prev={prev.income}
            isPositiveGood={true}
          />
          <StatTile
            label="รายจ่ายเดือนนี้"
            value={sum.expense}
            sub={`เดือนก่อน: ฿${fmt(prev.expense)}`}
            color="#ef4444"
            curr={sum.expense}
            prev={prev.expense}
            isPositiveGood={false}
          />
          <StatTile
            label="ออม+ลงทุน"
            value={sum.saving+sum.investment}
            sub={`เดือนก่อน: ฿${fmt(prev.saving+prev.investment)}`}
            color="#3b82f6"
            curr={sum.saving+sum.investment}
            prev={prev.saving+prev.investment}
            isPositiveGood={true}
          />
          <StatTile
            label="Cash Flow"
            value={cashflow}
            sub={`เดือนก่อน: ฿${fmt(prev.income-prev.expense)}`}
            color={cashflow>=0?"#22c55e":"#ef4444"}
            curr={cashflow}
            prev={prev.income-prev.expense}
            isPositiveGood={true}
          />
        </div>

        {/* Row 2: Cash flow bar chart + Donut */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:16 }}>
          <Card title="Cash Flow 12 เดือน" action={
            <div style={{ display:"flex", gap:8, fontSize:10, color:"#9ca3af" }}>
              <span><span style={{ display:"inline-block",width:7,height:7,background:"#22c55e",borderRadius:2,marginRight:3 }}/>รับ</span>
              <span><span style={{ display:"inline-block",width:7,height:7,background:"#ef4444",borderRadius:2,marginRight:3 }}/>จ่าย</span>
            </div>
          }>
            <InteractiveBarChart data={cashFlowHistory} height={100}/>
            <div style={{ display:"flex", justifyContent:"space-between", marginTop:6, fontSize:11 }}>
              <span style={{ color:"#6b7280" }}>Net เดือนนี้</span>
              <span style={{ fontWeight:700, color:cashflow>=0?"#22c55e":"#ef4444" }}>{cashflow>=0?"+":""}฿{fmt(cashflow)}</span>
            </div>
          </Card>

          {/* Fix 3: Donut panel */}
          <Card title="สัดส่วนการเงิน" action={
            <div style={{ display:"flex", gap:4 }}>
              {[["overview","ภาพรวม"],["maincat","หมวดหลัก"],["subcat","หมวดย่อย"]].map(([k,l])=>(
                <button key={k} onClick={()=>setDonutTab(k)} style={{
                  padding:"3px 9px", borderRadius:99, fontSize:10, fontWeight:600,
                  cursor:"pointer", border:"none",
                  background:donutTab===k?"#6366f1":"#f3f4f6",
                  color:donutTab===k?"#fff":"#6b7280",
                }}>{l}</button>
              ))}
            </div>
          }>
            <DonutChart items={donutData} centerLabel={donutCenter} size={145}/>
          </Card>
        </div>

        {/* Row 3: Goals + Budget vs Actual */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:16 }}>
          <Card title="Financial Goals" action={<span style={{ fontSize:11, color:"#9ca3af" }}>{goals.length} เป้าหมาย</span>}>
            {!goals.length
              ? <p style={{ margin:0, fontSize:12, color:"#9ca3af", textAlign:"center", padding:"16px 0" }}>ยังไม่มีเป้าหมาย</p>
              : <div style={{ display:"flex", flexDirection:"column", gap:8 }}>{goals.slice(0,3).map(g=><GoalCard key={g.id} goal={g}/>)}</div>}
          </Card>

          <Card title="Budget vs Actual" action={
            totalExpBudget>0
              ? <span style={{ fontSize:11, fontWeight:600, color:sum.expense>totalExpBudget?"#ef4444":"#22c55e" }}>
                  {Math.round((sum.expense/totalExpBudget)*100)}% ใช้ไป</span>
              : null
          }>
            {!budgetActual.length
              ? <p style={{ margin:0, fontSize:12, color:"#9ca3af", textAlign:"center", padding:"16px 0" }}>ยังไม่ได้ตั้งงบ</p>
              : budgetActual.slice(0,8).map(([cat,v])=>(
                  <BudgetRow key={cat} label={cat} actual={v.actual} budget={v.budget} color={TYPE_COLORS[v.type]||"#6b7280"}/>
                ))}
          </Card>
        </div>

        {/* Row 4: Top 10 + Breakdown */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:16 }}>
          <Card title="Top 10 รายจ่าย" action={<span style={{ fontSize:11, color:"#9ca3af" }}>รวม ฿{fmt(totalExp)}</span>}>
            {!top10.length
              ? <p style={{ margin:0, fontSize:12, color:"#9ca3af", textAlign:"center", padding:"16px 0" }}>ยังไม่มีรายจ่าย</p>
              : top10.map(([lbl,amt],i)=>(
                  <TopExpRow key={lbl} rank={i+1} label={lbl} amount={amt} total={totalExp}
                    color={donutMainCat.find(e=>e.label===lbl)?.color||COLORS[i%COLORS.length]}/>
                ))}
          </Card>

          <Card title="รายจ่ายแบ่งตามหมวด">
            {!donutMainCat.length
              ? <p style={{ margin:0, fontSize:12, color:"#9ca3af", textAlign:"center", padding:"16px 0" }}>ยังไม่มีรายจ่าย</p>
              : donutMainCat.map(e=><BudgetRow key={e.label} label={e.label} actual={e.value} budget={totalExp} color={e.color}/>)}
          </Card>
        </div>

        {/* Row 5: Net trend (Fix 2: interactive, click to jump month) */}
        <Card title="Net Cash Flow 12 เดือน" action={<span style={{ fontSize:10, color:"#9ca3af" }}>คลิกแท่งเพื่อดูเดือนนั้น</span>}>
          <InteractiveNetChart data={cashFlowHistory} selectedMonth={month} onSelect={setMonth} height={90}/>
          <div style={{ marginTop:10, display:"flex", justifyContent:"space-between", fontSize:11, color:"#6b7280" }}>
            <span>Net = รายได้ − รายจ่าย</span>
            <span style={{ fontWeight:700, color:cashflow>=0?"#22c55e":"#ef4444" }}>
              เดือนนี้: {cashflow>=0?"+":""}฿{fmt(cashflow)}
            </span>
          </div>
        </Card>

        {/* Row 6: Rate gauges */}
        {sum.income>0&&(
          <div style={{ marginTop:12, display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))", gap:12 }}>
            {[
              {label:"Saving Rate",    v:(sum.saving/sum.income)*100,     color:"#3b82f6", target:20},
              {label:"Investment Rate",v:(sum.investment/sum.income)*100, color:"#f59e0b", target:15},
              {label:"Expense Ratio",  v:(sum.expense/sum.income)*100,    color:"#ef4444", target:60},
            ].map(r=>(
              <Card key={r.label} style={{ textAlign:"center", padding:"14px 12px" }}>
                <DonutGauge value={r.v} max={100} color={r.color} size={62}/>
                <div style={{ marginTop:7, fontSize:12, fontWeight:600, color:"#374151" }}>{r.label}</div>
                <div style={{ fontSize:10, color:"#9ca3af" }}>เป้า {r.target}%</div>
              </Card>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}