import { useState, useEffect, useMemo } from "react";

// เปลี่ยน Key เพื่อให้ระบบสร้างข้อมูลชุดใหม่ที่หลากหลายขึ้นสำหรับหน้า Annual
const CONFIG_KEY = "finapp_annual_config";
const TX_KEY     = "finapp_annual_transactions";
const BUDGET_KEY = "finapp_annual_budgets";

const TYPE_COLORS = { income:"#22c55e", expense:"#ef4444", saving:"#3b82f6", investment:"#f59e0b" };
const MONTHS_TH   = ["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(n, dec=0) { return Number(n||0).toLocaleString("th-TH",{minimumFractionDigits:dec,maximumFractionDigits:dec}); }
function fmtShort(n) {
  const a=Math.abs(n||0);
  if(a>=1000000) return (n/1000000).toFixed(1)+"M";
  if(a>=10000)   return (n/1000).toFixed(1)+"K";
  return fmt(n);
}
function currentYear() { return String(new Date().getFullYear()); }
function pct(a,b)  { return b>0 ? Math.min(Math.round((a/b)*100),999) : 0; }
function trend(a,b){ return b>0 ? ((a-b)/b)*100 : a>0 ? 100 : 0; }

// ─── Seed Data (Enhanced with more variety for Annual View) ───────────────────
function seedIfEmpty() {
  try {
    if(localStorage.getItem(TX_KEY)) return; // already seeded
    const now = new Date();
    const txs=[]; let i=1; const id=()=>`atx_${i++}`;
    
    // Base seasonality multipliers
    const seas=[0.85, 0.9, 0.95, 1.0, 1.05, 1.1, 1.2, 1.15, 1.0, 0.95, 1.1, 1.3];
    
    // สร้างข้อมูลย้อนหลัง 24 เดือน (2 ปี) เพื่อให้สามารถเลือกปีเทียบได้
    for(let mo=-23;mo<=0;mo++){
      const d=new Date(now.getFullYear(),now.getMonth()+mo,1);
      const y=d.getFullYear(),mm=String(d.getMonth()+1).padStart(2,"0"),p=`${y}-${mm}`;
      const mIndex = d.getMonth();
      const s=seas[mIndex];
      const rnd=(base,spread)=>Math.round((base+(Math.random()-0.5)*spread)*s);
      
      // รายได้ประจำ
      txs.push({id:id(),date:`${p}-01`,type:"income",mainCat:"เงินเดือน",subCat:"เงินเดือนประจำ",amount:55000,currency:"THB"});
      
      // เพิ่มโบนัสประจำปี (ให้เฉพาะเดือน 12 หรือเดือน 1)
      if(mIndex === 11) {
        txs.push({id:id(),date:`${p}-25`,type:"income",mainCat:"เงินเดือน",subCat:"โบนัสประจำปี",amount:rnd(120000, 30000),currency:"THB"});
      }

      // รายได้เสริม (Freelance แกว่งตัว)
      if(Math.random()>0.2) txs.push({id:id(),date:`${p}-15`,type:"income",mainCat:"Freelance",subCat:"รับจ้างเขียน Code",amount:rnd(15000,10000),currency:"THB"});
      
      // รายจ่ายคงที่
      txs.push({id:id(),date:`${p}-03`,type:"expense",mainCat:"ที่พักอาศัย",subCat:"ค่าเช่า/ผ่อนบ้าน",amount:12000,currency:"THB"});
      
      // รายจ่ายผันแปร
      txs.push({id:id(),date:`${p}-05`,type:"expense",mainCat:"อาหาร",subCat:"อาหารกลางวัน",amount:rnd(3500,800),currency:"THB"});
      txs.push({id:id(),date:`${p}-10`,type:"expense",mainCat:"อาหาร",subCat:"อาหารเย็น",amount:rnd(4500,1500),currency:"THB"});
      txs.push({id:id(),date:`${p}-12`,type:"expense",mainCat:"อาหาร",subCat:"กาแฟ/เครื่องดื่ม",amount:rnd(1200,600),currency:"THB"});
      txs.push({id:id(),date:`${p}-07`,type:"expense",mainCat:"การเดินทาง",subCat:"น้ำมัน",amount:rnd(2500,800),currency:"THB"});
      if(Math.random()>0.3) txs.push({id:id(),date:`${p}-18`,type:"expense",mainCat:"การเดินทาง",subCat:"Grab/Taxi",amount:rnd(800,500),currency:"THB"});
      
      // ความบันเทิง
      txs.push({id:id(),date:`${p}-01`,type:"expense",mainCat:"ความบันเทิง",subCat:"Netflix",amount:449,currency:"THB"});
      if(Math.random()>0.4) txs.push({id:id(),date:`${p}-20`,type:"expense",mainCat:"ความบันเทิง",subCat:"เกม/ดูหนัง",amount:rnd(1500,1000),currency:"THB"});
      txs.push({id:id(),date:`${p}-01`,type:"expense",mainCat:"สุขภาพ",subCat:"ฟิตเนส",amount:600,currency:"THB"});

      // ✨ เพิ่มรายจ่ายก้อนใหญ่แบบสุ่ม (เกิดบางเดือน)
      if(Math.random()>0.75) {
        const randomSpends = [
          {main:"ซ่อมบำรุง", sub:"ซ่อมรถ/ต่อประกัน", amount:rnd(12000, 4000)},
          {main:"ท่องเที่ยว", sub:"ทริปพักผ่อน", amount:rnd(18000, 6000)},
          {main:"ช้อปปิ้ง", sub:"ซื้ออุปกรณ์ไอที", amount:rnd(9000, 3000)},
          {main:"สุขภาพ", sub:"หาหมอ/ซื้อยา", amount:rnd(4000, 2000)}
        ];
        const spend = randomSpends[Math.floor(Math.random() * randomSpends.length)];
        txs.push({id:id(),date:`${p}-14`,type:"expense",mainCat:spend.main,subCat:spend.sub,amount:spend.amount,currency:"THB"});
      }

      // การออมและลงทุน
      txs.push({id:id(),date:`${p}-25`,type:"saving",mainCat:"เงินออม",subCat:"ออมฉุกเฉิน",amount:5000,currency:"THB"});
      txs.push({id:id(),date:`${p}-25`,type:"saving",mainCat:"เงินออม",subCat:"ออมระยะยาว",amount:rnd(4000,1500),currency:"THB"});
      txs.push({id:id(),date:`${p}-20`,type:"investment",mainCat:"การลงทุน",subCat:"หุ้น",amount:rnd(6000,3000),currency:"THB"});
      if(Math.random()>0.3) txs.push({id:id(),date:`${p}-21`,type:"investment",mainCat:"การลงทุน",subCat:"กองทุน",amount:rnd(3500,2000),currency:"THB"});
    }
    localStorage.setItem(TX_KEY,JSON.stringify(txs));

    if(!localStorage.getItem(BUDGET_KEY)){
      const bgs=[]; let bi=1;
      const mkB=(m,type,cat,amt)=>({id:`abg_${bi++}`,month:m,type,category:cat,amount:amt});
      for(let mo=-23;mo<=0;mo++){
        const d=new Date(now.getFullYear(),now.getMonth()+mo,1);
        const m=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
        bgs.push(mkB(m,"income","เงินเดือน",55000),mkB(m,"income","Freelance",12000));
        bgs.push(mkB(m,"expense","ที่พักอาศัย",12000),mkB(m,"expense","อาหาร",9000),mkB(m,"expense","การเดินทาง",3000),mkB(m,"expense","ความบันเทิง",2000),mkB(m,"expense","สุขภาพ",1500),mkB(m,"expense","ท่องเที่ยว",5000));
        bgs.push(mkB(m,"saving","เงินออม",9000),mkB(m,"investment","การลงทุน",8000));
      }
      localStorage.setItem(BUDGET_KEY,JSON.stringify(bgs));
    }
  } catch(e){ console.error(e); }
}

// ─── UI atoms ─────────────────────────────────────────────────────────────────
function Card({ children, style={}, title, action }) {
  return (
    <div style={{ background:"#fff", borderRadius:16, border:"1.5px solid #f3f4f6",
      padding:"16px 18px", boxShadow:"0 1px 4px rgba(0,0,0,0.04)", ...style }}>
      {title&&(
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
          <h3 style={{ margin:0, fontSize:13, fontWeight:700, color:"#374151" }}>{title}</h3>
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

function KpiCard({ label, value, sub, color, badge, onClick }) {
  return (
    <div onClick={onClick} style={{
      background:"#fff", borderRadius:16, border:`1.5px solid ${color}22`,
      padding:"14px 16px", cursor:onClick?"pointer":"default",
    }}>
      <div style={{ fontSize:11, color:"#9ca3af", marginBottom:4 }}>{label}</div>
      <div style={{ fontSize:22, fontWeight:800, color, lineHeight:1.2 }}>฿{fmtShort(value)}</div>
      {sub&&<div style={{ fontSize:11, color:"#6b7280", marginTop:2 }}>{sub}</div>}
      {badge&&<div style={{ marginTop:6 }}>{badge}</div>}
    </div>
  );
}

function TrendPill({ value, isPositiveGood=true }) {
  const isZero = Math.abs(value)<0.1;
  const isUp   = value>0.1;
  let color;
  if(isZero)      color="#f59e0b";
  else if(isUp)   color=isPositiveGood?"#22c55e":"#ef4444";
  else            color=isPositiveGood?"#ef4444":"#22c55e";
  const arrow = isZero?"—":isUp?"▲":"▼";
  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:2,
      padding:"2px 8px", borderRadius:99, fontSize:10, fontWeight:700,
      background:color+"18", color, border:`1px solid ${color}33` }}>
      {arrow} {Math.abs(value).toFixed(1)}%
    </span>
  );
}

// ─── Fix 2: Tooltip hook for bar charts ──────────────────────────────────────
function useTooltip() {
  const [tooltip, setTooltip] = useState(null);
  const show = (idx, data) => setTooltip({ idx, data });
  const hide = () => setTooltip(null);
  return { tooltip, show, hide };
}

// ─── Stacked Bar Chart (income vs expense vs saving vs investment) ────────────
function StackedBarChart({ data, height=120 }) {
  const { tooltip, show, hide } = useTooltip();
  const maxVal = Math.max(...data.map(d=>(d.income||0)+(d.expense||0)+(d.saving||0)+(d.investment||0)), 1);
  return (
    <div style={{ position:"relative" }}>
      {tooltip&&data[tooltip.idx]&&(
        <div style={{
          position:"absolute",
          left: tooltip.idx > data.length - 4 ? "auto" : `calc(${(tooltip.idx/data.length)*100}% + ${(1/data.length)*50}%)`,
          right: tooltip.idx > data.length - 4 ? `calc(${100 - (tooltip.idx/data.length)*100}% - ${(1/data.length)*50}%)` : "auto",
          top:-10, transform: tooltip.idx > data.length - 4 ? "translate(0%,-100%)" : "translate(-50%,-100%)",
          background:"#1a1a2e", color:"#fff", borderRadius:10,
          padding:"8px 12px", fontSize:11, fontWeight:600,
          pointerEvents:"none", zIndex:30, whiteSpace:"nowrap",
          boxShadow:"0 6px 20px rgba(0,0,0,0.3)",
        }}>
          <div style={{ color:"rgba(255,255,255,0.6)", fontSize:10, marginBottom:4 }}>{MONTHS_TH[tooltip.idx]} {data[tooltip.idx].year}</div>
          <div style={{ color:"#86efac" }}>↑ รายรับ ฿{fmt(data[tooltip.idx].income)}</div>
          <div style={{ color:"#fca5a5" }}>↓ รายจ่าย ฿{fmt(data[tooltip.idx].expense)}</div>
          <div style={{ color:"#93c5fd" }}>🏦 ออม ฿{fmt(data[tooltip.idx].saving)}</div>
          <div style={{ color:"#fcd34d" }}>📈 ลงทุน ฿{fmt(data[tooltip.idx].investment)}</div>
          <div style={{ color:"#a5b4fc", borderTop:"1px solid rgba(255,255,255,0.15)", marginTop:4, paddingTop:4 }}>
            Net {(data[tooltip.idx].income-data[tooltip.idx].expense)>=0?"+":""}฿{fmt(data[tooltip.idx].income-data[tooltip.idx].expense)}
          </div>
        </div>
      )}
      <div style={{ display:"flex", alignItems:"flex-end", gap:3, height }}>
        {data.map((d,i)=>{
          const total=(d.income||0)+(d.expense||0)+(d.saving||0)+(d.investment||0);
          const scale=(total/maxVal)*(height-14);
          const isH=tooltip?.idx===i;
          const segs=[
            {v:d.income||0, c:"#22c55e"},
            {v:d.expense||0, c:"#ef4444"},
            {v:d.saving||0, c:"#3b82f6"},
            {v:d.investment||0, c:"#f59e0b"},
          ].filter(s=>s.v>0);
          const segTotal=segs.reduce((s,x)=>s+x.v,0)||1;
          return (
            <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:1, cursor:"pointer" }}
              onMouseEnter={()=>show(i,d)} onMouseLeave={hide}
              onTouchStart={()=>show(i,d)} onTouchEnd={()=>setTimeout(hide,1500)}>
              <div style={{ width:"100%", height:height-14, display:"flex", flexDirection:"column", justifyContent:"flex-end" }}>
                <div style={{ width:"100%", height:Math.max(scale,2), display:"flex", flexDirection:"column-reverse", borderRadius:"3px 3px 0 0", overflow:"hidden" }}>
                  {segs.map((seg,si)=>(
                    <div key={si} style={{ width:"100%", height:`${(seg.v/segTotal)*100}%`, background:seg.c, opacity:isH?1:0.75, minHeight:1 }}/>
                  ))}
                </div>
              </div>
              <div style={{ fontSize:8, color:isH?"#374151":"#9ca3af", fontWeight:isH?700:400, lineHeight:1.2 }}>
                {MONTHS_TH[i]}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Line chart with hover labels ────────────────────────────────────────────
function MultiLineChart({ series, labels, height=100 }) {
  const { tooltip, show, hide } = useTooltip();
  const allVals = series.flatMap(s=>s.data);
  const minV = Math.min(...allVals, 0), maxV = Math.max(...allVals, 1);
  const range = maxV - minV || 1;
  const W = 100, H = 100, padY = 5;
  const n = labels.length;

  const toX = i => (i/(n-1||1)) * W;
  const toY = v => padY + (1-(v-minV)/range) * (H-padY*2);

  // Smooth curve generator
  const createSmoothPath = (data) => {
    if (data.length === 0) return "";
    let pts = data.map((v, i) => ({ x: toX(i), y: toY(v) }));
    let d = `M${pts[0].x.toFixed(2)},${pts[0].y.toFixed(2)}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i === 0 ? 0 : i - 1];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[i + 2 === pts.length ? i + 1 : i + 2];
      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;
      d += ` C${cp1x.toFixed(2)},${cp1y.toFixed(2)} ${cp2x.toFixed(2)},${cp2y.toFixed(2)} ${p2.x.toFixed(2)},${p2.y.toFixed(2)}`;
    }
    return d;
  };

  const hoverBar = tooltip!==null;

  return (
    <div style={{ position:"relative", marginTop: 8 }}>
      {hoverBar&&(
        <div style={{
          position:"absolute",
          left: tooltip.idx === n - 1 ? "auto" : tooltip.idx === 0 ? "0%" : `${(tooltip.idx/(n-1))*100}%`,
          right: tooltip.idx === n - 1 ? "0%" : "auto",
          top: -12, transform: tooltip.idx === n - 1 ? "translate(0%,-100%)" : tooltip.idx === 0 ? "translate(0%,-100%)" : "translate(-50%,-100%)",
          background:"#1a1a2e", color:"#fff", borderRadius:10,
          padding:"8px 12px", fontSize:11, fontWeight:600,
          pointerEvents:"none", zIndex:30, whiteSpace:"nowrap",
          boxShadow:"0 6px 20px rgba(0,0,0,0.25)",
        }}>
          <div style={{ color:"rgba(255,255,255,0.6)", marginBottom:4, fontSize:11 }}>{labels[tooltip.idx]}</div>
          {series.map(s=>(
            <div key={s.label} style={{ color:s.color, marginTop:3 }}>
              {s.label}: ฿{fmt(s.data[tooltip.idx]||0)}
            </div>
          ))}
        </div>
      )}

      <div style={{ position: "relative", height, width: "100%" }}>
        <svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none"
          style={{ overflow:"visible", position: "absolute", inset: 0 }}>
          <defs>
            {series.map((s, idx) => (
              <linearGradient key={`grad-${idx}`} id={`grad-${s.label}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={s.color} stopOpacity="0.25" />
                <stop offset="100%" stopColor={s.color} stopOpacity="0.0" />
              </linearGradient>
            ))}
          </defs>

          {minV < 0 && (
            <line x1="0" y1={toY(0)} x2={W} y2={toY(0)}
              stroke="#e5e7eb" strokeWidth={1} vectorEffect="non-scaling-stroke" strokeDasharray="4 4"/>
          )}

          {series.map(s=>{
            const pathD = createSmoothPath(s.data);
            const areaD = `${pathD} L${W},${H} L0,${H} Z`;
            return (
              <g key={s.label}>
                <path d={areaD} fill={`url(#grad-${s.label})`} />
                <path d={pathD} fill="none" stroke={s.color} strokeWidth={2.5} 
                  vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round"/>
              </g>
            );
          })}
        </svg>

        {hoverBar && (
          <>
            <div style={{
              position: "absolute", top: 0, bottom: 0,
              left: `${(tooltip.idx/(n-1))*100}%`, width: 1,
              background: "rgba(0,0,0,0.1)", pointerEvents: "none", zIndex: 5
            }}/>
            {series.map(s => (
              <div key={`dot-${s.label}`} style={{
                position: "absolute",
                left: `${(tooltip.idx/(n-1))*100}%`,
                top: `${toY(s.data[tooltip.idx])}%`,
                width: 10, height: 10, transform: "translate(-50%, -50%)",
                background: "#fff", border: `2.5px solid ${s.color}`,
                borderRadius: "50%", pointerEvents: "none", zIndex: 10,
                boxShadow: "0 2px 6px rgba(0,0,0,0.15)"
              }}/>
            ))}
          </>
        )}

        <div style={{ position: "absolute", inset: 0, display: "flex", zIndex: 15 }}>
          {labels.map((_, i) => (
            <div key={i} style={{ flex: 1, cursor: "crosshair" }}
              onMouseEnter={() => show(i, {})} onMouseLeave={hide}
              onTouchStart={() => show(i, {})} onTouchEnd={() => setTimeout(hide, 1500)}
            />
          ))}
        </div>
      </div>

      <div style={{ display:"flex", justifyContent:"space-between", paddingTop: 10, position:"relative", zIndex: 0 }}>
        {labels.map((l,i)=>(
          <div key={i} style={{
            fontSize:10, color:tooltip?.idx===i?"#374151":"#9ca3af",
            fontWeight:tooltip?.idx===i?700:400, width:0, display:"flex",
            justifyContent:"center"
          }}>
            <span style={{ 
              whiteSpace:"nowrap",
              transform: i === 0 ? "translateX(50%)" : i === n-1 ? "translateX(-50%)" : "none"
            }}>{l}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Progress Bar ─────────────────────────────────────────────────────────────
function PBar({ value, max, color, height=6 }) {
  const p=max>0?Math.min(100,(value/max)*100):0;
  const over=value>max&&max>0, warn=!over&&p>=80;
  const c=over?"#ef4444":warn?"#f59e0b":color;
  return (
    <div style={{ background:"#f3f4f6", borderRadius:99, height, overflow:"hidden" }}>
      <div style={{ width:`${Math.min(100,p)}%`, height:"100%", background:c, borderRadius:99, transition:"width 0.4s" }}/>
    </div>
  );
}

// ─── Best/Worst month highlight ───────────────────────────────────────────────
function MonthHighlight({ label, value, month, color, icon }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 12px",
      background:"#f9fafb", borderRadius:12, border:`1px solid ${color}22` }}>
      <div style={{ fontSize:22 }}>{icon}</div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:11, color:"#9ca3af" }}>{label}</div>
        <div style={{ fontWeight:700, fontSize:14, color }}>{MONTHS_TH[Number(month?.slice(5,7))-1]} {month?.slice(0,4)}</div>
      </div>
      <div style={{ fontWeight:800, fontSize:15, color, textAlign:"right" }}>฿{fmtShort(value)}</div>
    </div>
  );
}

// ─── Donut chart ─────────────────────────────────────────────────────────────
function DonutChart({ items, size=130, centerLabel="" }) {
  const [hov, setHov] = useState(null);
  const total=items.reduce((s,x)=>s+(x.value||0),0);
  if(!total) return <div style={{ textAlign:"center", color:"#9ca3af", fontSize:12, padding:"16px 0" }}>ไม่มีข้อมูล</div>;
  const r=(size-14)/2, cx=size/2, cy=size/2;
  let cum=0;
  const slices=items.map((x,i)=>{ const p=x.value/total; const s=cum; cum+=p; return {...x,pct:p,start:s,end:cum,i}; });
  const toXY=(p,ri)=>{ const a=p*2*Math.PI-Math.PI/2; return {x:cx+ri*Math.cos(a),y:cy+ri*Math.sin(a)}; };
  const arc=(s,exp=0)=>{
    const r1=r,r2=r-14,mid=(s.start+s.end)/2*2*Math.PI-Math.PI/2;
    const dx=exp*Math.cos(mid),dy=exp*Math.sin(mid);
    const p1=toXY(s.start,r1),p2=toXY(s.end,r1),p3=toXY(s.end,r2),p4=toXY(s.start,r2);
    const lg=(s.end-s.start)>0.5?1:0;
    return `M${p1.x+dx} ${p1.y+dy}A${r1} ${r1} 0 ${lg} 1 ${p2.x+dx} ${p2.y+dy}L${p3.x+dx} ${p3.y+dy}A${r2} ${r2} 0 ${lg} 0 ${p4.x+dx} ${p4.y+dy}Z`;
  };
  const hS=hov!==null?slices[hov]:null;
  return (
    <div style={{ display:"flex", alignItems:"center", gap:12 }}>
      <svg width={size} height={size} style={{ flexShrink:0, overflow:"visible" }}>
        {slices.map(s=>(
          <path key={s.i} d={arc(s,hov===s.i?5:0)} fill={s.color} style={{ cursor:"pointer",transition:"all 0.15s" }}
            onMouseEnter={()=>setHov(s.i)} onMouseLeave={()=>setHov(null)}
            onTouchStart={()=>setHov(s.i)} onTouchEnd={()=>setTimeout(()=>setHov(null),1400)}/>
        ))}
        <text x={cx} y={cy-8} textAnchor="middle" dominantBaseline="middle" fontSize={8} fill="#9ca3af">
          {hS?hS.label:centerLabel}
        </text>
        <text x={cx} y={cy+6} textAnchor="middle" dominantBaseline="middle" fontSize={13} fontWeight={800} fill={hS?hS.color:"#1a1a2e"}>
          {hS?`${(hS.pct*100).toFixed(1)}%`:`฿${fmtShort(total)}`}
        </text>
        {hS&&<text x={cx} y={cy+20} textAnchor="middle" dominantBaseline="middle" fontSize={9} fill="#6b7280">฿{fmt(hS.value)}</text>}
      </svg>
      <div style={{ flex:1, display:"flex", flexDirection:"column", gap:5 }}>
        {slices.map(s=>(
          <div key={s.i} style={{ display:"flex", alignItems:"center", gap:6, cursor:"pointer",
            opacity:hov===null||hov===s.i?1:0.4, transition:"opacity 0.15s" }}
            onMouseEnter={()=>setHov(s.i)} onMouseLeave={()=>setHov(null)}>
            <div style={{ width:7, height:7, borderRadius:2, background:s.color, flexShrink:0 }}/>
            <div style={{ minWidth:0 }}>
              <div style={{ fontSize:11, fontWeight:600, color:"#374151", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{s.label}</div>
              <div style={{ fontSize:10, color:"#9ca3af" }}>฿{fmt(s.value)} · {(s.pct*100).toFixed(1)}%</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Year picker ──────────────────────────────────────────────────────────────
function YearPicker({ value, onChange, years }) {
  return (
    <select value={value} onChange={e=>onChange(e.target.value)} style={{
      padding:"7px 12px", borderRadius:10, border:"none", fontSize:12,
      background:"rgba(255,255,255,0.14)", color:"#fff", fontFamily:"inherit",
      cursor:"pointer", outline:"none",
    }}>
      {years.map(y=><option key={y} value={y} style={{color:"#1a1a2e"}}>{y}</option>)}
    </select>
  );
}

// ─── Budget vs Actual row ─────────────────────────────────────────────────────
function BudgetRow({ label, actual, budget, color }) {
  const p=pct(actual,budget), over=actual>budget&&budget>0, warn=!over&&p>=80;
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
        <PBar value={actual} max={budget} color={color}/>
      </div>
      <div style={{ fontSize:10, fontWeight:700, color:over?"#ef4444":warn?"#f59e0b":"#9ca3af", minWidth:30, textAlign:"right" }}>
        {budget>0?`${p}%`:"—"}
      </div>
    </div>
  );
}

// ─── Main Application Component ───────────────────────────────────────────────
export default function App() {
  const [config, setConfig]   = useState({ profile:{baseCurrency:"THB"}, accounts:[] });
  const [transactions, setTx] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [year, setYear]       = useState(currentYear());

  useEffect(()=>{
    seedIfEmpty();
    try {
      const c=localStorage.getItem(CONFIG_KEY); if(c) setConfig(JSON.parse(c));
      const t=localStorage.getItem(TX_KEY);     if(t) setTx(JSON.parse(t));
      const b=localStorage.getItem(BUDGET_KEY); if(b) setBudgets(JSON.parse(b));
    } catch(e){ console.error(e); }
  },[]);

  const availableYears = useMemo(()=>{
    const ys=new Set([...transactions.map(t=>(t.date||"").slice(0,4)), currentYear()]);
    return [...ys].filter(Boolean).sort().reverse();
  },[transactions]);

  // ── Annual totals ──────────────────────────────────────────────────────────
  const yearTx = useMemo(()=>transactions.filter(t=>(t.date||"").startsWith(year)),[transactions,year]);
  const prevYearTx = useMemo(()=>{
    const py=String(Number(year)-1);
    return transactions.filter(t=>(t.date||"").startsWith(py));
  },[transactions,year]);

  const summarize = txList => {
    const s={income:0,expense:0,saving:0,investment:0};
    txList.forEach(t=>{ if(s[t.type]!==undefined) s[t.type]+=t.amount||0; });
    return s;
  };
  const annual     = useMemo(()=>summarize(yearTx),[yearTx]);
  const prevAnnual = useMemo(()=>summarize(prevYearTx),[prevYearTx]);

  // ── Monthly breakdown ──────────────────────────────────────────────────────
  const monthlyData = useMemo(()=>{
    return MONTHS_TH.map((_,i)=>{
      const mm=String(i+1).padStart(2,"0");
      const txs=yearTx.filter(t=>(t.date||"").slice(5,7)===mm);
      const income=txs.filter(t=>t.type==="income").reduce((s,t)=>s+(t.amount||0),0);
      const expense=txs.filter(t=>t.type==="expense").reduce((s,t)=>s+(t.amount||0),0);
      const saving=txs.filter(t=>t.type==="saving").reduce((s,t)=>s+(t.amount||0),0);
      const investment=txs.filter(t=>t.type==="investment").reduce((s,t)=>s+(t.amount||0),0);
      return { month:`${year}-${mm}`, year, income, expense, saving, investment, net:income-expense };
    });
  },[yearTx, year]);

  // ── Cumulative saving ──────────────────────────────────────────────────────
  const cumulativeSaving = useMemo(()=>{
    let cum=0;
    return monthlyData.map(d=>{ cum+=d.saving+d.investment; return { value:cum }; });
  },[monthlyData]);

  // ── Budget vs Actual (annual) ──────────────────────────────────────────────
  const annualBudgetActual = useMemo(()=>{
    const yBudgets=budgets.filter(b=>b.month?.startsWith(year));
    const result={};
    yBudgets.forEach(b=>{
      const k=b.category||"อื่นๆ";
      if(!result[k]) result[k]={budget:0,actual:0,type:b.type};
      result[k].budget+=b.amount||0;
    });
    yearTx.forEach(t=>{
      const k=t.mainCat||"อื่นๆ";
      if(!result[k]) result[k]={budget:0,actual:0,type:t.type};
      result[k].actual+=t.amount||0;
    });
    return Object.entries(result).filter(([,v])=>(v.budget>0||v.actual>0)&&v.type!=="income").sort((a,b)=>b[1].actual-a[1].actual);
  },[budgets,yearTx,year]);

  // ── Best/Worst months ─────────────────────────────────────────────────────
  const bestSavingMonth = useMemo(()=>{
    return monthlyData.reduce((best,d)=>(d.saving+d.investment)>(best.saving+best.investment)?d:best, monthlyData[0]||{});
  },[monthlyData]);

  const bestIncomeMonth = useMemo(()=>{
    return monthlyData.reduce((best,d)=>d.income>best.income?d:best, monthlyData[0]||{});
  },[monthlyData]);

  const worstExpenseMonth = useMemo(()=>{
    return monthlyData.reduce((best,d)=>d.expense>best.expense?d:best, monthlyData[0]||{});
  },[monthlyData]);

  // ── Top 10 expense categories ──────────────────────────────────────────────
  const top10Expense = useMemo(()=>{
    const map={};
    yearTx.filter(t=>t.type==="expense").forEach(t=>{ const k=t.subCat||t.mainCat||"อื่นๆ"; map[k]=(map[k]||0)+(t.amount||0); });
    return Object.entries(map).sort((a,b)=>b[1]-a[1]).slice(0,10);
  },[yearTx]);

  // ── Expense donut ─────────────────────────────────────────────────────────
  const expDonut = useMemo(()=>{
    const COLORS=["#ef4444","#f59e0b","#6366f1","#22c55e","#ec4899","#14b8a6","#8b5cf6","#f97316"];
    const map={};
    yearTx.filter(t=>t.type==="expense").forEach(t=>{ const k=t.mainCat||"อื่นๆ"; map[k]=(map[k]||0)+(t.amount||0); });
    return Object.entries(map).sort((a,b)=>b[1]-a[1]).map(([k,v],i)=>({label:k,value:v,color:COLORS[i%COLORS.length]}));
  },[yearTx]);

  // ── Stats ──────────────────────────────────────────────────────────────────
  const avgMonthlyIncome  = annual.income/12;
  const avgMonthlyExpense = annual.expense/12;
  const savingRate        = annual.income>0?((annual.saving+annual.investment)/annual.income)*100:0;
  const expenseRatio      = annual.income>0?(annual.expense/annual.income)*100:0;
  const netAnnual         = annual.income-annual.expense-annual.saving-annual.investment;

  // Monthly series for multiline
  const lineLabels  = MONTHS_TH;
  const lineSeries  = [
    { label:"รายรับ",  data:monthlyData.map(d=>d.income),     color:"#22c55e" },
    { label:"รายจ่าย", data:monthlyData.map(d=>d.expense),    color:"#ef4444" },
    { label:"ออม+ลงทุน",data:monthlyData.map(d=>d.saving+d.investment), color:"#3b82f6" },
  ];

  const savingLineSeries = [{ label:"ออมสะสม", data:cumulativeSaving.map(d=>d.value), color:"#3b82f6" }];

  const hasData = yearTx.length > 0;

  return (
    <div style={{ fontFamily:"'Noto Sans Thai','Sarabun',sans-serif", minHeight:"100vh", background:"#f8f9fb" }}>

      {/* Header */}
      <div style={{ background:"linear-gradient(135deg,#1a1a2e,#16213e,#0f3460)", padding:"20px 20px 16px" }}>
        <div style={{ maxWidth:960, margin:"0 auto" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:14 }}>
            <div>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <div style={{ width:34, height:34, borderRadius:9, background:"#f59e0b", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>📅</div>
                <span style={{ fontSize:20, fontWeight:800, color:"#fff", letterSpacing:"-0.5px" }}>FinFlow</span>
                <span style={{ fontSize:11, padding:"2px 8px", background:"rgba(255,255,255,0.12)", borderRadius:99, color:"rgba(255,255,255,0.7)" }}>ANNUAL {year}</span>
              </div>
              <p style={{ margin:"4px 0 0 44px", fontSize:12, color:"rgba(255,255,255,0.5)" }}>
                {config.profile?.name?`สรุปการเงินประจำปี ${year} ของ ${config.profile.name}`:`สรุปการเงินประจำปี ${year}`}
              </p>
            </div>
            <YearPicker value={year} onChange={setYear} years={availableYears}/>
          </div>

          {/* Annual KPI strip */}
          <div style={{ display:"flex", gap:8, overflowX:"auto", paddingBottom:2 }}>
            {[
              {label:"รายรับรวม",  v:annual.income,     c:"#22c55e"},
              {label:"รายจ่ายรวม", v:annual.expense,    c:"#ef4444"},
              {label:"ออมรวม",     v:annual.saving,     c:"#3b82f6"},
              {label:"ลงทุนรวม",   v:annual.investment, c:"#f59e0b"},
              {label:"คงเหลือ",    v:netAnnual,         c:netAnnual>=0?"#22c55e":"#ef4444"},
            ].map(k=>(
              <div key={k.label} style={{ flex:"0 0 auto", minWidth:110,
                background:"rgba(255,255,255,0.08)", borderRadius:12, padding:"8px 12px",
                border:"1px solid rgba(255,255,255,0.1)" }}>
                <div style={{ fontSize:10, color:"rgba(255,255,255,0.55)", marginBottom:2 }}>{k.label}</div>
                <div style={{ fontSize:15, fontWeight:800, color:k.c }}>฿{fmtShort(k.v)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth:960, margin:"0 auto", padding:"20px 16px 60px" }}>

        {!hasData ? (
          <div style={{ textAlign:"center", padding:"60px 0", color:"#9ca3af" }}>
            <div style={{ fontSize:48, marginBottom:12 }}>📅</div>
            <p style={{ fontWeight:600, fontSize:15, color:"#6b7280" }}>ยังไม่มีข้อมูลปี {year}</p>
            <p style={{ fontSize:13 }}>เพิ่มรายการใน Transaction หรือเลือกปีอื่น</p>
          </div>
        ) : (<>

        {/* Row 1: Annual KPI cards */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))", gap:12, marginBottom:16 }}>
          <KpiCard label="รายรับทั้งปี"    value={annual.income}     color="#22c55e"
            sub={`เฉลี่ย ฿${fmtShort(avgMonthlyIncome)}/เดือน`}
            badge={<TrendPill value={trend(annual.income, prevAnnual.income)} isPositiveGood={true}/>}/>
          <KpiCard label="รายจ่ายทั้งปี"   value={annual.expense}    color="#ef4444"
            sub={`เฉลี่ย ฿${fmtShort(avgMonthlyExpense)}/เดือน`}
            badge={<TrendPill value={trend(annual.expense, prevAnnual.expense)} isPositiveGood={false}/>}/>
          <KpiCard label="ออม+ลงทุนทั้งปี" value={annual.saving + annual.investment} color="#3b82f6"
            sub={`ออม ฿${fmtShort(annual.saving)} | ลงทุน ฿${fmtShort(annual.investment)}`}
            badge={<TrendPill value={trend(annual.saving+annual.investment, prevAnnual.saving+prevAnnual.investment)} isPositiveGood={true}/>}/>
          <KpiCard label="Saving Rate"     value={savingRate}  color="#6366f1"
            sub={`Expense Ratio ${expenseRatio.toFixed(1)}%`}/>
          <KpiCard label="คงเหลือสุทธิ"   value={netAnnual} color={netAnnual>=0?"#22c55e":"#ef4444"}
            sub={netAnnual>=0?"เหลือสะสมในบัญชี":"ขาดดุลปีนี้"}/>
        </div>

        {/* Row 2: Stacked bar + Donut */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))", gap:12, marginBottom:16 }}>
          <Card style={{ flex: 1.5 }} title="รายรับ รายจ่าย ออม ลงทุน แต่ละเดือน" action={
            <div style={{ display:"flex", gap:6, fontSize:10, color:"#9ca3af", flexWrap:"wrap" }}>
              {[["#22c55e","รับ"],["#ef4444","จ่าย"],["#3b82f6","ออม"],["#f59e0b","ลงทุน"]].map(([c,l])=>(
                <span key={l}><span style={{ display:"inline-block",width:7,height:7,background:c,borderRadius:2,marginRight:2 }}/>{l}</span>
              ))}
            </div>
          }>
            <StackedBarChart data={monthlyData} height={120}/>
          </Card>

          <Card style={{ flex: 1 }} title="สัดส่วนรายจ่ายหมวดหลัก">
            <DonutChart items={expDonut} size={130} centerLabel="รายจ่าย"/>
          </Card>
        </div>

        {/* Row 3: Income vs Expense line + Saving trend */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))", gap:12, marginBottom:16 }}>
          <Card title="รายรับ vs รายจ่าย (รายเดือน)">
            <MultiLineChart series={lineSeries} labels={lineLabels} height={110}/>
          </Card>

          <Card title="ออม+ลงทุนสะสมตลอดปี">
            <MultiLineChart series={savingLineSeries} labels={lineLabels} height={110}/>
            <div style={{ display:"flex", justifyContent:"space-between", marginTop:6, fontSize:11, color:"#6b7280" }}>
              <span>เริ่มปีที่ ฿0</span>
              <span style={{ fontWeight:700, color:"#3b82f6" }}>สิ้นปี ฿{fmt(annual.saving+annual.investment)}</span>
            </div>
          </Card>
        </div>

        {/* Row 4: Best months + Highlights */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))", gap:12, marginBottom:16 }}>
          <Card title="เดือนที่น่าจับตา (Highlights)">
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              <MonthHighlight label="เดือนที่มีการออม+ลงทุนสูงสุด"  value={(bestSavingMonth.saving||0)+(bestSavingMonth.investment||0)}  month={bestSavingMonth.month} color="#3b82f6" icon="🏆"/>
              <MonthHighlight label="เดือนที่มีรายรับเข้าสูงสุด"     value={bestIncomeMonth.income||0}   month={bestIncomeMonth.month}   color="#22c55e" icon="🌟"/>
              <MonthHighlight label="เดือนที่มีรายจ่ายหนักที่สุด"    value={worstExpenseMonth.expense||0} month={worstExpenseMonth.month} color="#ef4444" icon="⚠️"/>
            </div>
          </Card>

          <Card title="สรุปสุขภาพการเงินประจำปี" action={
            <span style={{ padding:"3px 10px", borderRadius:99, fontSize:10, fontWeight:700,
              background:netAnnual>=0?"#f0fdf4":"#fef2f2", color:netAnnual>=0?"#16a34a":"#ef4444",
              border:`1px solid ${netAnnual>=0?"#bbf7d0":"#fecaca"}` }}>
              {netAnnual>=0?"✅ ปีนี้กำไรสุทธิ":"⚠️ ปีนี้ขาดดุล"}
            </span>
          }>
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {[
                { label:"อัตราการออมและการลงทุน (Saving Rate)",    value:savingRate,    color:"#3b82f6", target:20, note:"เป้า 20%+" },
                { label:"อัตราส่วนค่าใช้จ่าย (Expense Ratio)",  value:expenseRatio,  color:"#ef4444", target:60, note:"เป้า <60%", flip:true },
                { label:"สัดส่วนการออมเทียบรายรับ",  value:annual.income>0?(annual.saving/annual.income)*100:0, color:"#6366f1", target:15, note:"เป้า 15%+" },
              ].map(r=>{
                const over=r.flip?r.value>r.target:r.value<r.target;
                const statusColor=over?"#ef4444":"#22c55e";
                return (
                  <div key={r.label}>
                    <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, marginBottom:4 }}>
                      <span style={{ fontWeight:600, color:"#374151" }}>{r.label}</span>
                      <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                        <span style={{ fontWeight:700, color:r.color }}>{r.value.toFixed(1)}%</span>
                        <span style={{ fontSize:10, color:statusColor }}>{over?"❌":"✅"} {r.note}</span>
                      </div>
                    </div>
                    <PBar value={r.value} max={100} color={r.color} height={6}/>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Row 5: Top 10 expense + Annual budget vs actual */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))", gap:12, marginBottom:16 }}>
          <Card title="Top 10 รายจ่ายตลอดทั้งปี" action={<span style={{ fontSize:11, color:"#9ca3af" }}>รวม ฿{fmt(annual.expense)}</span>}>
            {top10Expense.map(([label,amount],i)=>{
              const rankColors=["#f59e0b","#9ca3af","#cd7c4a"];
              return (
                <div key={label} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
                  <div style={{ width:20, height:20, borderRadius:7, flexShrink:0, display:"flex", alignItems:"center",
                    justifyContent:"center", fontSize:10, fontWeight:800,
                    background:i<3?rankColors[i]+"22":"#f3f4f6", color:i<3?rankColors[i]:"#9ca3af" }}>{i+1}</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, marginBottom:3 }}>
                      <span style={{ fontWeight:600, color:"#374151", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{label}</span>
                      <span style={{ fontWeight:700, color:"#ef4444", flexShrink:0, marginLeft:6 }}>฿{fmt(amount)}</span>
                    </div>
                    <PBar value={amount} max={annual.expense} color={expDonut.find(e=>e.label===label)?.color||"#ef4444"} height={4}/>
                  </div>
                  <div style={{ fontSize:10, color:"#9ca3af", minWidth:26, textAlign:"right" }}>
                    {annual.expense>0?Math.round((amount/annual.expense)*100):0}%
                  </div>
                </div>
              );
            })}
          </Card>

          <Card title="งบประมาณเทียบการจ่ายจริง (ทั้งปี)" action={
            <span style={{ fontSize:11, fontWeight:600,
              color:annual.expense>annualBudgetActual.filter(([,v])=>v.type==="expense").reduce((s,[,v])=>s+v.budget,0)?"#ef4444":"#22c55e" }}>
              ติดตาม {annualBudgetActual.length} หมวด
            </span>
          }>
            {annualBudgetActual.length===0
              ? <p style={{ margin:0, fontSize:12, color:"#9ca3af", textAlign:"center", padding:"16px 0" }}>ยังไม่ได้ตั้งงบประมาณ</p>
              : annualBudgetActual.slice(0,8).map(([cat,v])=>(
                  <BudgetRow key={cat} label={cat} actual={v.actual} budget={v.budget} color={TYPE_COLORS[v.type]||"#6b7280"}/>
                ))
            }
          </Card>
        </div>

        {/* Row 6: Month-by-month table */}
        <Card title="ตารางสรุปรายเดือน" action={
          <span style={{ fontSize:11, color:"#9ca3af" }}>Cash Flow Statement แบบย่อ</span>
        }>
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
              <thead>
                <tr style={{ background:"#f9fafb" }}>
                  {["เดือน","รายรับ","รายจ่าย","ออม","ลงทุน","Net","สถานะ"].map(h=>(
                    <th key={h} style={{ padding:"8px 10px", textAlign:h==="เดือน"?"left":"right",
                      fontWeight:600, color:"#6b7280", fontSize:11, whiteSpace:"nowrap",
                      borderBottom:"1px solid #f3f4f6" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {monthlyData.map((d,i)=>{
                  const hasAny=(d.income+d.expense+d.saving+d.investment)>0;
                  const net=d.income-d.expense;
                  return (
                    <tr key={i} style={{ borderBottom:"1px solid #f9fafb",
                      background:hasAny?"#fff":"#fafafa",
                      opacity:hasAny?1:0.5,
                    }}>
                      <td style={{ padding:"8px 10px", fontWeight:600, color:"#374151" }}>{MONTHS_TH[i]}</td>
                      <td style={{ padding:"8px 10px", textAlign:"right", color:"#22c55e", fontWeight:600 }}>{d.income?`฿${fmtShort(d.income)}`:"-"}</td>
                      <td style={{ padding:"8px 10px", textAlign:"right", color:"#ef4444", fontWeight:600 }}>{d.expense?`฿${fmtShort(d.expense)}`:"-"}</td>
                      <td style={{ padding:"8px 10px", textAlign:"right", color:"#3b82f6" }}>{d.saving?`฿${fmtShort(d.saving)}`:"-"}</td>
                      <td style={{ padding:"8px 10px", textAlign:"right", color:"#f59e0b" }}>{d.investment?`฿${fmtShort(d.investment)}`:"-"}</td>
                      <td style={{ padding:"8px 10px", textAlign:"right", fontWeight:700, color:net>=0?"#22c55e":"#ef4444" }}>
                        {hasAny?(net>=0?"+":"")+(net?`฿${fmtShort(net)}`:"-"):"-"}
                      </td>
                      <td style={{ padding:"8px 10px", textAlign:"right" }}>
                        {hasAny&&<span style={{ fontSize:10, padding:"2px 7px", borderRadius:99, fontWeight:700,
                          background:net>=0?"#f0fdf4":"#fef2f2", color:net>=0?"#16a34a":"#ef4444" }}>
                          {net>=0?"✓ บวก":"- ลบ"}
                        </span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ background:"#f3f4f6", fontWeight:700 }}>
                  <td style={{ padding:"8px 10px", color:"#374151", fontSize:12 }}>รวมทั้งปี</td>
                  <td style={{ padding:"8px 10px", textAlign:"right", color:"#22c55e" }}>฿{fmt(annual.income)}</td>
                  <td style={{ padding:"8px 10px", textAlign:"right", color:"#ef4444" }}>฿{fmt(annual.expense)}</td>
                  <td style={{ padding:"8px 10px", textAlign:"right", color:"#3b82f6" }}>฿{fmt(annual.saving)}</td>
                  <td style={{ padding:"8px 10px", textAlign:"right", color:"#f59e0b" }}>฿{fmt(annual.investment)}</td>
                  <td style={{ padding:"8px 10px", textAlign:"right", color:netAnnual>=0?"#22c55e":"#ef4444" }}>
                    {netAnnual>=0?"+":""}฿{fmt(annual.income-annual.expense)}
                  </td>
                  <td style={{ padding:"8px 10px" }}/>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>

        </>)}
      </div>
    </div>
  );
}