import React, { useState, useEffect, useMemo } from "react";

// ─── Storage ──────────────────────────────────────────────────────────────────
const PORTFOLIO_KEY = "finapp_portfolio";
const CONFIG_KEY    = "finapp_config";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
function fmt(n, dec = 0) { return Number(n || 0).toLocaleString("th-TH", { minimumFractionDigits: dec, maximumFractionDigits: dec }); }
function fmtShort(n) {
  const a = Math.abs(n || 0);
  if (a >= 1e6) return (n / 1e6).toFixed(2) + "M";
  if (a >= 1e3) return (n / 1e3).toFixed(1) + "K";
  return fmt(n, 2);
}
function pctColor(n) { return n > 0 ? "#22c55e" : n < 0 ? "#ef4444" : "#9ca3af"; }
function pctArrow(n) { return n > 0 ? "▲" : n < 0 ? "▼" : "—"; }

// ─── Asset types ──────────────────────────────────────────────────────────────
const ASSET_TYPES = [
  { key: "stock",      label: "หุ้นไทย",          icon: "📈", color: "#6366f1", currency: "THB" },
  { key: "stock_us",   label: "หุ้นต่างประเทศ",   icon: "🌐", color: "#3b82f6", currency: "USD" },
  { key: "fund",       label: "กองทุน",         icon: "🏦", color: "#8b5cf6", currency: "THB" },
  { key: "gold",       label: "ทอง",            icon: "🥇", color: "#f59e0b", currency: "THB" },
  { key: "crypto",     label: "Crypto",         icon: "₿",  color: "#f97316", currency: "USD" },
  { key: "bond",       label: "พันธบัตร/ตราสาร", icon: "📜", color: "#22c55e", currency: "THB" },
  { key: "cash",       label: "เงินสด/ฝาก",     icon: "💵", color: "#14b8a6", currency: "THB" },
  { key: "property",   label: "อสังหาริมทรัพย์", icon: "🏠", color: "#ec4899", currency: "THB" },
  { key: "other",      label: "อื่นๆ",           icon: "📦", color: "#9ca3af", currency: "THB" },
];

const GOLD_UNITS = ["บาท (ทองคำ)", "กรัม", "ออนซ์"];
const CRYPTO_LIST = ["BTC", "ETH", "BNB", "SOL", "ADA", "XRP", "DOGE", "อื่นๆ"];

// ─── Weighted average cost calculator ────────────────────────────────────────
function calcWAC(lots) {
  const totalCost  = lots.reduce((s, l) => s + (l.qty * l.costPerUnit), 0);
  const totalQty   = lots.reduce((s, l) => s + l.qty, 0);
  return totalQty > 0 ? totalCost / totalQty : 0;
}

// ─── Real price fetching via public APIs ─────────────────────────────────────
async function fetchRealPrice(asset) {
  try {
    const sym = asset.name.toUpperCase().trim();

    if (asset.type === "crypto") {
      const coinMap = { BTC:"bitcoin", ETH:"ethereum", BNB:"binancecoin", SOL:"solana", ADA:"cardano", XRP:"ripple", DOGE:"dogecoin" };
      const coinId = coinMap[sym];
      if (!coinId) return null;
      const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd`);
      if (!res.ok) return null;
      const data = await res.json();
      return { price: data[coinId]?.usd, currency: "USD" };
    }

    if (asset.type === "stock_us") {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${sym}?interval=1d&range=1d`;
      const proxy = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
      const res = await fetch(proxy);
      if (!res.ok) return null;
      const outer = await res.json();
      const inner = JSON.parse(outer.contents);
      const price = inner?.chart?.result?.[0]?.meta?.regularMarketPrice;
      return price ? { price, currency: "USD" } : null;
    }

    if (asset.type === "gold") {
      const res = await fetch("https://api.allorigins.win/get?url=" + encodeURIComponent("https://metals-api.com/api/latest?access_key=demo&base=XAU&symbols=THB"));
      if (!res.ok) return null;
      const outer = await res.json();
      const data  = JSON.parse(outer.contents);
      const thbPerOz = data?.rates?.THB;
      if (!thbPerOz) return null;
      const thbPerBahtGold = (thbPerOz / 31.103) * 15.244;
      return { price: Math.round(thbPerBahtGold), currency: "THB" };
    }

    if (asset.type === "stock") {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${sym}.BK?interval=1d&range=1d`;
      const proxy = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
      const res = await fetch(proxy);
      if (!res.ok) return null;
      const outer = await res.json();
      const inner = JSON.parse(outer.contents);
      const price = inner?.chart?.result?.[0]?.meta?.regularMarketPrice;
      return price ? { price, currency: "THB" } : null;
    }

    return null;
  } catch (e) {
    return null;
  }
}

// ─── Price history helpers ────────────────────────────────────────────────────
function recordPriceHistory(asset, price) {
  const today = new Date().toISOString().slice(0, 10);
  const history = [...(asset.priceHistory || [])];
  
  const existing = history.findIndex(h => h.date === today);
  if (existing >= 0) {
    history[existing] = { date: today, price };
  } else {
    history.push({ date: today, price });
  }
  return history.sort((a, b) => a.date.localeCompare(b.date)).slice(-365);
}

function buildSyntheticHistory(asset) {
  if (asset.priceHistory && asset.priceHistory.length >= 2) return asset.priceHistory;
  const lots = asset.lots || [];
  if (!lots.length) return [];
  
  const startDate = lots.reduce((min, l) => l.date < min ? l.date : min, lots[0].date);
  const start  = new Date(startDate + "T00:00:00");
  const today  = new Date();
  const wac    = calcWAC(lots);
  const endPrice = asset.currentPrice || wac;
  const days   = Math.max(1, Math.round((today - start) / 86400000));
  const result = [];
  
  for (let i = 0; i <= Math.min(days, 365); i += Math.max(1, Math.floor(days / 60))) {
    const d = new Date(start); d.setDate(d.getDate() + i);
    const pct = i / days;
    const noise = 1 + (Math.random() - 0.48) * 0.04;
    const price = wac + (endPrice - wac) * pct * noise;
    result.push({ date: d.toISOString().slice(0, 10), price: Math.round(price * 100) / 100 });
  }
  result.push({ date: today.toISOString().slice(0, 10), price: endPrice });
  
  if (result.length === 1) {
    const fakePast = new Date(result[0].date);
    fakePast.setDate(fakePast.getDate() - 1);
    result.unshift({ date: fakePast.toISOString().slice(0, 10), price: wac });
  }
  return result;
}

// ─── Interactive Smooth Growth Chart ──────────────────────────────────────────
function GrowthChart({ assets, height = 240 }) {
  const [hov, setHov]     = useState(null);
  const [range, setRange] = useState("6m");

  const series = useMemo(() => {
    if (!assets.length) return [];
    const allHistory = assets.map(a => buildSyntheticHistory(a));
    const allDates = [...new Set(allHistory.flatMap(h => h.map(p => p.date)))].sort();

    const now = new Date();
    const cutoff = {
      "1m":  new Date(now.getFullYear(), now.getMonth() - 1, now.getDate()),
      "3m":  new Date(now.getFullYear(), now.getMonth() - 3, now.getDate()),
      "6m":  new Date(now.getFullYear(), now.getMonth() - 6, now.getDate()),
      "1y":  new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()),
      "all": new Date("2000-01-01"),
    }[range];

    const filtered = allDates.filter(d => new Date(d + "T00:00:00") >= cutoff);
    
    if (filtered.length < 2) {
      if (filtered.length === 1) {
        const d = new Date(filtered[0] + "T00:00:00");
        d.setDate(d.getDate() - 1);
        filtered.unshift(d.toISOString().slice(0, 10));
      } else {
        return [];
      }
    }

    return filtered.map(date => {
      let totalVal = 0;
      assets.forEach((a, ai) => {
        const h = allHistory[ai];
        const entry = [...h].reverse().find(p => p.date <= date);
        const price = entry ? entry.price : (a.currentPrice || 0);
        const qty   = a.lots.filter(l => l.date <= date).reduce((s, l) => s + l.qty, 0);
        totalVal += price * qty;
      });
      return { date, value: Math.round(totalVal) };
    });
  }, [assets, range]);

  if (!series.length) return (
    <div style={{ height, display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af", fontSize: 13, fontWeight: 500 }}>
      ยังไม่มีข้อมูลราคา — ลองกดปุ่ม "อัปเดตราคาทั้งหมด" ด้านบน
    </div>
  );

  const vals  = series.map(d => d.value);
  const minRaw = Math.min(...vals);
  const maxRaw = Math.max(...vals);
  
  // สร้าง Padding ให้แกน Y ไม่ให้กราฟชนขอบบน-ล่าง
  const minV = minRaw * 0.98;
  const maxV = maxRaw * 1.02;
  const range_ = maxV - minV || 1;
  
  const firstVal = vals[0];
  const lastVal  = vals[vals.length - 1];
  const totalGain = lastVal - firstVal;
  const totalGainPct = firstVal > 0 ? (totalGain / firstVal) * 100 : 0;
  const lineColor = totalGain >= 0 ? "#22c55e" : "#ef4444";

  // ใช้ ViewBox กว้างๆ เพื่อให้วาดรูปได้เนียนและคมชัด
  const W = 800, H = height - 40, padX = 40, padY = 20;
  const toX = i => padX + (i / (series.length - 1)) * (W - padX * 2);
  const toY = v => padY + (1 - (v - minV) / range_) * (H - padY * 2);

  // คำนวณเส้นโค้งสมูท (Cubic Bézier Curve)
  let dPath = `M ${toX(0)},${toY(series[0].value)}`;
  for (let i = 0; i < series.length - 1; i++) {
    const cx1 = toX(i) + (toX(i+1) - toX(i)) / 2;
    const cx2 = toX(i) + (toX(i+1) - toX(i)) / 2;
    dPath += ` C ${cx1},${toY(series[i].value)} ${cx2},${toY(series[i+1].value)} ${toX(i+1)},${toY(series[i+1].value)}`;
  }
  const areaPath = `${dPath} L ${toX(series.length-1)},${H} L ${toX(0)},${H} Z`;

  const hovData = hov !== null ? series[hov] : null;

  // ป้องกัน Tooltip ตกขอบ
  let tooltipAlign = "translate(-50%, -100%)";
  if (hov === 0) tooltipAlign = "translate(0%, -100%)";
  if (hov === series.length - 1) tooltipAlign = "translate(-100%, -100%)";

  return (
    <div>
      {/* Header Info */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, color: lineColor }}>
            {totalGain >= 0 ? "+" : ""}฿{fmt(totalGain)} 
            <span style={{ fontSize: 14, marginLeft: 6, fontWeight: 700, padding: "2px 8px", background: lineColor + "22", borderRadius: 6 }}>
              {totalGainPct >= 0 ? "+" : ""}{totalGainPct.toFixed(2)}%
            </span>
          </div>
          <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>ผลตอบแทนในช่วง {range}</div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {["1m","3m","6m","1y","all"].map(r => (
            <button key={r} onClick={() => setRange(r)} style={{
              padding: "4px 12px", borderRadius: 99, fontSize: 12, fontWeight: 700,
              border: "none", cursor: "pointer", transition: "all 0.2s",
              background: range === r ? lineColor : "#f3f4f6",
              color: range === r ? "#fff" : "#6b7280",
            }}>{r.toUpperCase()}</button>
          ))}
        </div>
      </div>

      <div style={{ position: "relative" }}>
        {hovData && (
          <div style={{
            position: "absolute",
            left: `${(hov / (series.length - 1)) * 100}%`,
            top: `${(toY(series[hov].value) / height) * 100}%`, 
            transform: tooltipAlign,
            marginTop: -12,
            background: "#1a1a2e", color: "#fff", borderRadius: 10,
            padding: "8px 12px", minWidth: 100, textAlign: "center",
            pointerEvents: "none", zIndex: 10, whiteSpace: "nowrap",
            boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
          }}>
            <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 11, marginBottom: 2, fontWeight: 600 }}>{hovData.date}</div>
            <div style={{ color: "#fff", fontSize: 15, fontWeight: 800 }}>฿{fmt(hovData.value)}</div>
            {firstVal > 0 && (
              <div style={{ color: hovData.value >= firstVal ? "#4ade80" : "#f87171", fontSize: 11, fontWeight: 700, marginTop: 2 }}>
                {hovData.value >= firstVal ? "▲" : "▼"} {(((hovData.value - firstVal) / firstVal) * 100).toFixed(2)}%
              </div>
            )}
          </div>
        )}

        <svg width="100%" height={height} viewBox={`0 0 ${W} ${height}`} preserveAspectRatio="none" style={{ overflow: "visible" }}>
          <defs>
            <linearGradient id="growthGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={lineColor} stopOpacity="0.35" />
              <stop offset="100%" stopColor={lineColor} stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="baselineGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#e5e7eb" stopOpacity="0.2" />
              <stop offset="50%" stopColor="#e5e7eb" stopOpacity="1" />
              <stop offset="100%" stopColor="#e5e7eb" stopOpacity="0.2" />
            </linearGradient>
          </defs>

          {/* Grid lines (แกน Y) */}
          {[minV, (minV + maxV) / 2, maxV].map((v, i) => (
            <g key={`grid-${i}`}>
              <line x1={padX} y1={toY(v)} x2={W - padX} y2={toY(v)} stroke="#f3f4f6" strokeWidth={1} strokeDasharray="5 5" />
              <text x={padX - 8} y={toY(v)} textAnchor="end" fontSize={12} fill="#9ca3af" fontWeight={600} dominantBaseline="middle">
                {fmtShort(v)}
              </text>
            </g>
          ))}

          {/* เส้นอ้างอิงทุนเริ่มต้น */}
          <line x1={padX} y1={toY(firstVal)} x2={W - padX} y2={toY(firstVal)} stroke="url(#baselineGrad)" strokeWidth={1.5} strokeDasharray="4 4" />
          
          {/* เงากราฟ และ เส้นกราฟที่สมูทแล้ว */}
          <path d={areaPath} fill="url(#growthGrad)" />
          <path d={dPath} fill="none" stroke={lineColor} strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" />

          {/* จุดวงกลมเวลา Hover */}
          {hov !== null && (
             <g>
               {/* เส้นประแนวตั้งนำสายตา */}
               <line x1={toX(hov)} y1={padY} x2={toX(hov)} y2={H} stroke={lineColor} strokeWidth={1} strokeDasharray="4 4" opacity={0.5} />
               <circle cx={toX(hov)} cy={toY(series[hov].value)} r={5.5} fill="#fff" stroke={lineColor} strokeWidth={3} />
             </g>
          )}

          {/* เซนเซอร์ดักจับเมาส์ */}
          {series.map((_, i) => (
            <rect key={i} x={toX(i) - W / series.length / 2} y={0} width={W / series.length} height={H} fill="transparent" style={{ cursor: "crosshair" }}
              onMouseEnter={() => setHov(i)} onMouseLeave={() => setHov(null)}
              onTouchStart={() => setHov(i)} onTouchEnd={() => setTimeout(() => setHov(null), 1500)} />
          ))}

          {/* ป้ายกำกับวันที่แกน X */}
          <text x={padX} y={height - 5} fontSize={12} fontWeight={600} fill="#9ca3af">{series[0]?.date}</text>
          <text x={W - padX} y={height - 5} textAnchor="end" fontSize={12} fontWeight={600} fill="#9ca3af">{series[series.length - 1]?.date}</text>
        </svg>
      </div>
    </div>
  );
}

// ─── Seed mock data ───────────────────────────────────────────────────────────
function seedIfEmpty() {
  if (localStorage.getItem(PORTFOLIO_KEY)) return;
  const mock = [
    {
      id: "a1", type: "stock", name: "PTT", fullName: "PTT Public Company",
      lots: [
        { id: "l1", qty: 1000, costPerUnit: 34.5, date: "2023-01-15", note: "ซื้อครั้งแรก" },
        { id: "l2", qty: 500,  costPerUnit: 32.0, date: "2023-06-10", note: "DCA" },
      ],
      currentPrice: 35.75, currency: "THB", sector: "พลังงาน",
      lastUpdated: new Date().toISOString().slice(0, 10),
    },
    {
      id: "a2", type: "stock", name: "CPALL", fullName: "CP All Public Company",
      lots: [
        { id: "l3", qty: 500, costPerUnit: 62.0, date: "2023-03-01", note: "Long term" },
        { id: "l4", qty: 500, costPerUnit: 58.5, date: "2023-09-20", note: "DCA" },
      ],
      currentPrice: 64.25, currency: "THB", sector: "ค้าปลีก",
      lastUpdated: new Date().toISOString().slice(0, 10),
    },
    {
      id: "a3", type: "stock_us", name: "AAPL", fullName: "Apple Inc.",
      lots: [
        { id: "l5", qty: 5, costPerUnit: 175.0, date: "2023-02-14", note: "" },
        { id: "l6", qty: 3, costPerUnit: 182.5, date: "2024-01-10", note: "DCA" },
      ],
      currentPrice: 189.5, currency: "USD", sector: "Technology",
      lastUpdated: new Date().toISOString().slice(0, 10),
    },
    {
      id: "a4", type: "fund", name: "KFLTFDIV-A", fullName: "กองทุนเปิดกสิกรไทย",
      lots: [
        { id: "l7", qty: 50000, costPerUnit: 1.0, date: "2022-07-01", note: "ลงทุนเริ่มต้น" },
        { id: "l8", qty: 30000, costPerUnit: 1.05, date: "2023-07-01", note: "DCA รายปี" },
      ],
      currentPrice: 1.18, currency: "THB", sector: "กองทุนรวมหุ้น",
      lastUpdated: new Date().toISOString().slice(0, 10),
    },
    {
      id: "a5", type: "gold", name: "ทองคำแท่ง", fullName: "ทองคำแท่ง 96.5%",
      lots: [
        { id: "l9",  qty: 2, costPerUnit: 31500, date: "2022-11-01", note: "ซื้อสะสม" },
        { id: "l10", qty: 1, costPerUnit: 33000, date: "2023-11-15", note: "" },
      ],
      currentPrice: 35800, currency: "THB", unit: "บาท (ทองคำ)", sector: "สินค้าโภคภัณฑ์",
      lastUpdated: new Date().toISOString().slice(0, 10),
    },
    {
      id: "a6", type: "crypto", name: "BTC", fullName: "Bitcoin",
      lots: [
        { id: "l11", qty: 0.05, costPerUnit: 28000, date: "2023-01-01", note: "" },
        { id: "l12", qty: 0.03, costPerUnit: 42000, date: "2024-01-05", note: "DCA" },
      ],
      currentPrice: 67500, currency: "USD", sector: "Cryptocurrency",
      lastUpdated: new Date().toISOString().slice(0, 10),
    },
    {
      id: "a7", type: "cash", name: "บัญชีออมทรัพย์ KBank", fullName: "เงินฝากออมทรัพย์",
      lots: [{ id: "l13", qty: 1, costPerUnit: 85000, date: "2024-01-01", note: "กองฉุกเฉิน" }],
      currentPrice: 85000, currency: "THB", sector: "เงินสด",
      lastUpdated: new Date().toISOString().slice(0, 10),
    },
  ];
  localStorage.setItem(PORTFOLIO_KEY, JSON.stringify(mock));
}

// ─── UI Atoms ─────────────────────────────────────────────────────────────────
function Card({ children, style = {}, title, action }) {
  return (
    <div style={{ background: "#fff", borderRadius: 16, border: "1.5px solid #f3f4f6", padding: "20px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)", ...style }}>
      {(title || action) && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          {title && <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: "#374151" }}>{title}</h3>}
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

function Badge({ color, children }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", padding: "2px 8px", borderRadius: 99, fontSize: 10, fontWeight: 700, background: color + "18", color, border: `1px solid ${color}33` }}>
      {children}
    </span>
  );
}

// ─── Donut Chart ──────────────────────────────────────────────────────────────
function DonutChart({ items, size = 180, centerLabel = "" }) {
  const [hov, setHov] = useState(null);
  const total = items.reduce((s, x) => s + (x.value || 0), 0);
  if (!total) return null;
  const r = (size - 16) / 2, cx = size / 2, cy = size / 2;
  let cum = 0;
  const slices = items.map((x, i) => { const p = x.value / total; const s = cum; cum += p; return { ...x, pct: p, start: s, end: cum, i }; });
  const toXY = (p, ri) => { const a = p * 2 * Math.PI - Math.PI / 2; return { x: cx + ri * Math.cos(a), y: cy + ri * Math.sin(a) }; };
  const arc = (s, exp = 0) => {
    const r1 = r, r2 = r - 22, mid = (s.start + s.end) / 2 * 2 * Math.PI - Math.PI / 2;
    const dx = exp * Math.cos(mid), dy = exp * Math.sin(mid);
    const p1 = toXY(s.start, r1), p2 = toXY(s.end, r1), p3 = toXY(s.end, r2), p4 = toXY(s.start, r2);
    const lg = (s.end - s.start) > 0.5 ? 1 : 0;
    return `M${p1.x + dx} ${p1.y + dy}A${r1} ${r1} 0 ${lg} 1 ${p2.x + dx} ${p2.y + dy}L${p3.x + dx} ${p3.y + dy}A${r2} ${r2} 0 ${lg} 0 ${p4.x + dx} ${p4.y + dy}Z`;
  };
  const hS = hov !== null ? slices[hov] : null;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
      <svg width={size} height={size} style={{ flexShrink: 0, overflow: "visible" }}>
        {slices.map(s => (
          <path key={s.i} d={arc(s, hov === s.i ? 6 : 0)} fill={s.color}
            style={{ cursor: "pointer", transition: "all 0.15s" }}
            onMouseEnter={() => setHov(s.i)} onMouseLeave={() => setHov(null)}
            onTouchStart={() => setHov(s.i)} onTouchEnd={() => setTimeout(() => setHov(null), 1400)} />
        ))}
        <text x={cx} y={cy - 10} textAnchor="middle" dominantBaseline="middle" fontSize={11} fill="#9ca3af" fontWeight={500}>
          {hS ? hS.label : centerLabel}
        </text>
        <text x={cx} y={cy + 8} textAnchor="middle" dominantBaseline="middle" fontSize={16} fontWeight={800} fill={hS ? hS.color : "#1a1a2e"}>
          {hS ? `${(hS.pct * 100).toFixed(1)}%` : `฿${fmtShort(total)}`}
        </text>
        {hS && <text x={cx} y={cy + 26} textAnchor="middle" dominantBaseline="middle" fontSize={11} fill="#6b7280" fontWeight={600}>฿{fmtShort(hS.value)}</text>}
      </svg>
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 12 }}>
        {slices.map(s => (
          <div key={s.i} style={{ display: "flex", alignItems: "flex-start", gap: 8, cursor: "pointer", opacity: hov === null || hov === s.i ? 1 : 0.3, transition: "opacity 0.2s" }}
            onMouseEnter={() => setHov(s.i)} onMouseLeave={() => setHov(null)}>
            <div style={{ width: 10, height: 10, borderRadius: 3, background: s.color, flexShrink: 0, marginTop: 4 }} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#374151", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.label}</div>
              <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2, fontWeight: 500 }}>฿{fmtShort(s.value)}</div>
              <div style={{ fontSize: 10, color: "#9ca3af", fontWeight: 600 }}>{(s.pct * 100).toFixed(1)}%</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Lot Entry Modal ──────────────────────────────────────────────────────────
function LotModal({ asset, onSave, onClose }) {
  const today = new Date().toISOString().slice(0, 10);
  const [qty, setQty]     = useState("");
  const [cost, setCost]   = useState("");
  const [date, setDate]   = useState(today);
  const [note, setNote]   = useState("");
  const [error, setError] = useState("");

  const wac = useMemo(() => {
    const newQty  = parseFloat(qty) || 0;
    const newCost = parseFloat(cost) || 0;
    if (!newQty || !newCost) return calcWAC(asset.lots);
    return calcWAC([...asset.lots, { qty: newQty, costPerUnit: newCost }]);
  }, [asset.lots, qty, cost]);

  const existingWAC = calcWAC(asset.lots);
  const existingQty = asset.lots.reduce((s, l) => s + l.qty, 0);

  const handleSave = () => {
    if (!qty || !cost || isNaN(parseFloat(qty)) || isNaN(parseFloat(cost))) {
      setError("กรุณากรอกจำนวนและราคา"); return;
    }
    onSave({ id: genId(), qty: parseFloat(qty), costPerUnit: parseFloat(cost), date, note });
  };

  const sym = asset.currency === "USD" ? "$" : "฿";

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 16 }}>
      <div style={{ background: "#fff", borderRadius: 20, maxWidth: 420, width: "100%", boxShadow: "0 24px 80px rgba(0,0,0,0.25)", overflow: "hidden" }}>
        <div style={{ background: "linear-gradient(135deg,#1a1a2e,#16213e)", padding: "16px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h3 style={{ margin: "0 0 2px", fontSize: 15, fontWeight: 700, color: "#fff" }}>➕ เพิ่ม Lot ใหม่</h3>
              <p style={{ margin: 0, fontSize: 12, color: "rgba(255,255,255,0.6)" }}>{asset.name} · {asset.fullName}</p>
            </div>
            <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "rgba(255,255,255,0.6)" }}>×</button>
          </div>
        </div>

        <div style={{ padding: "20px" }}>
          {existingQty > 0 && (
            <div style={{ background: "#f9fafb", borderRadius: 10, padding: "10px 14px", marginBottom: 16, display: "flex", gap: 16 }}>
              <div>
                <div style={{ fontSize: 10, color: "#9ca3af" }}>ถือครองอยู่</div>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{existingQty.toLocaleString("th-TH", { maximumFractionDigits: 6 })} หน่วย</div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: "#9ca3af" }}>ต้นทุนเฉลี่ย (WAC)</div>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{sym}{fmt(existingWAC, 2)}</div>
              </div>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 12px" }}>
            {[
              { label: "จำนวน (หน่วย)", value: qty, set: setQty, placeholder: "เช่น 100", type: "number" },
              { label: `ราคาต้นทุน/หน่วย (${sym})`, value: cost, set: setCost, placeholder: "เช่น 35.50", type: "number" },
            ].map(f => (
              <div key={f.label} style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 4, letterSpacing: "0.04em", textTransform: "uppercase" }}>{f.label}</label>
                <input type={f.type} value={f.value} onChange={e => f.set(e.target.value)} placeholder={f.placeholder}
                  style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1.5px solid #e5e7eb", fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
              </div>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 12px", marginBottom: 12 }}>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 4, letterSpacing: "0.04em", textTransform: "uppercase" }}>วันที่ซื้อ</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1.5px solid #e5e7eb", fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 4, letterSpacing: "0.04em", textTransform: "uppercase" }}>หมายเหตุ</label>
              <input type="text" value={note} onChange={e => setNote(e.target.value)} placeholder="เช่น DCA, โบนัส"
                style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1.5px solid #e5e7eb", fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
            </div>
          </div>

          {qty && cost && (
            <div style={{ background: "#f0f0ff", borderRadius: 10, padding: "10px 14px", marginBottom: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 12, color: "#6366f1", fontWeight: 600 }}>ต้นทุนเฉลี่ยใหม่ (WAC)</span>
              <span style={{ fontSize: 15, fontWeight: 800, color: "#6366f1" }}>{sym}{fmt(wac, 2)}</span>
            </div>
          )}

          {error && <div style={{ padding: "8px 12px", background: "#fef2f2", borderRadius: 8, border: "1px solid #fecaca", marginBottom: 12, fontSize: 12, color: "#dc2626" }}>⚠️ {error}</div>}

          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={onClose} style={{ flex: 1, padding: 11, borderRadius: 10, border: "1.5px solid #e5e7eb", background: "#fff", fontSize: 13, fontWeight: 600, color: "#6b7280", cursor: "pointer" }}>ยกเลิก</button>
            <button onClick={handleSave} style={{ flex: 2, padding: 11, borderRadius: 10, border: "none", background: "#6366f1", fontSize: 13, fontWeight: 700, color: "#fff", cursor: "pointer" }}>✅ เพิ่ม Lot</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Price Update Modal ───────────────────────────────────────────────────────
function PriceModal({ asset, onSave, onClose }) {
  const [price, setPrice] = useState(String(asset.currentPrice || ""));
  const sym = asset.currency === "USD" ? "$" : "฿";
  const wac = calcWAC(asset.lots);
  const qty = asset.lots.reduce((s, l) => s + l.qty, 0);
  const newVal = (parseFloat(price) || 0) * qty;
  const gain = newVal - wac * qty;
  const gainPct = wac * qty > 0 ? (gain / (wac * qty)) * 100 : 0;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 16 }}>
      <div style={{ background: "#fff", borderRadius: 20, maxWidth: 380, width: "100%", boxShadow: "0 24px 80px rgba(0,0,0,0.25)", padding: "24px" }}>
        <h3 style={{ margin: "0 0 4px", fontSize: 15, fontWeight: 700 }}>💱 อัปเดตราคาปัจจุบัน</h3>
        <p style={{ margin: "0 0 16px", fontSize: 13, color: "#6b7280" }}>{asset.name} · {asset.fullName}</p>

        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 4, letterSpacing: "0.04em", textTransform: "uppercase" }}>ราคาปัจจุบัน ({sym})</label>
          <input type="number" value={price} onChange={e => setPrice(e.target.value)}
            style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1.5px solid #e5e7eb", fontSize: 15, fontFamily: "inherit", outline: "none", boxSizing: "border-box", fontWeight: 700 }} />
        </div>

        {price && (
          <div style={{ background: gain >= 0 ? "#f0fdf4" : "#fef2f2", borderRadius: 10, padding: "12px 14px", marginBottom: 16, border: `1px solid ${gain >= 0 ? "#bbf7d0" : "#fecaca"}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
              <span style={{ color: "#6b7280" }}>มูลค่าใหม่</span>
              <span style={{ fontWeight: 700 }}>{sym}{fmt(newVal, 2)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginTop: 4 }}>
              <span style={{ color: "#6b7280" }}>กำไร/ขาดทุน</span>
              <span style={{ fontWeight: 800, color: pctColor(gain) }}>
                {gain >= 0 ? "+" : ""}{sym}{fmt(Math.abs(gain), 2)} ({gainPct >= 0 ? "+" : ""}{gainPct.toFixed(2)}%)
              </span>
            </div>
          </div>
        )}

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: 11, borderRadius: 10, border: "1.5px solid #e5e7eb", background: "#fff", fontSize: 13, fontWeight: 600, color: "#6b7280", cursor: "pointer" }}>ยกเลิก</button>
          <button onClick={() => onSave(parseFloat(price) || 0)} style={{ flex: 2, padding: 11, borderRadius: 10, border: "none", background: "#22c55e", fontSize: 13, fontWeight: 700, color: "#fff", cursor: "pointer" }}>💾 บันทึกราคา</button>
        </div>
      </div>
    </div>
  );
}

// ─── Add Asset Modal ──────────────────────────────────────────────────────────
const EMPTY_ASSET = { type: "stock", name: "", fullName: "", currency: "THB", sector: "", unit: "หน่วย", lots: [] };

function AddAssetModal({ onSave, onClose }) {
  const [form, setForm] = useState({ ...EMPTY_ASSET });
  const [error, setError] = useState("");
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleTypeChange = (type) => {
    const at = ASSET_TYPES.find(t => t.key === type);
    set("type", type);
    set("currency", at?.currency || "THB");
  };

  const handleSave = () => {
    if (!form.name) { setError("กรุณากรอกชื่อสินทรัพย์"); return; }
    onSave({ ...form, id: genId(), currentPrice: 0, lastUpdated: new Date().toISOString().slice(0, 10) });
  };

  const at = ASSET_TYPES.find(t => t.key === form.type);

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 16 }}>
      <div style={{ background: "#fff", borderRadius: 20, maxWidth: 480, width: "100%", boxShadow: "0 24px 80px rgba(0,0,0,0.25)", overflow: "hidden", maxHeight: "90vh", display: "flex", flexDirection: "column" }}>
        <div style={{ background: `linear-gradient(135deg, ${at?.color || "#6366f1"}cc, ${at?.color || "#6366f1"}88)`, padding: "16px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#fff" }}>➕ เพิ่มสินทรัพย์ใหม่</h3>
            <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "rgba(255,255,255,0.7)" }}>×</button>
          </div>
        </div>

        <div style={{ overflowY: "auto", flex: 1, padding: "20px" }}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 6, letterSpacing: "0.04em", textTransform: "uppercase" }}>ประเภทสินทรัพย์</label>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {ASSET_TYPES.map(t => (
                <button key={t.key} onClick={() => handleTypeChange(t.key)} style={{
                  padding: "6px 12px", borderRadius: 99, fontSize: 12, fontWeight: 600, cursor: "pointer", border: "none",
                  background: form.type === t.key ? t.color : "#f3f4f6",
                  color: form.type === t.key ? "#fff" : "#6b7280",
                }}>{t.icon} {t.label}</button>
              ))}
            </div>
          </div>

          {[
            { label: "ชื่อย่อ / Symbol", key: "name", placeholder: form.type === "stock" ? "เช่น PTT" : form.type === "crypto" ? "เช่น BTC" : "เช่น ทองคำ 96.5%" },
            { label: "ชื่อเต็ม", key: "fullName", placeholder: "ชื่อเต็มหรือรายละเอียด" },
            { label: "กลุ่ม / Sector", key: "sector", placeholder: "เช่น พลังงาน, Technology" },
          ].map(f => (
            <div key={f.key} style={{ marginBottom: 12 }}>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 4, letterSpacing: "0.04em", textTransform: "uppercase" }}>{f.label}</label>
              <input value={form[f.key]} onChange={e => set(f.key, e.target.value)} placeholder={f.placeholder}
                style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1.5px solid #e5e7eb", fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
            </div>
          ))}

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 4, letterSpacing: "0.04em", textTransform: "uppercase" }}>สกุลเงิน</label>
            <div style={{ display: "flex", gap: 8 }}>
              {["THB", "USD"].map(c => (
                <button key={c} onClick={() => set("currency", c)} style={{
                  padding: "6px 18px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer",
                  border: `1.5px solid ${form.currency === c ? at?.color || "#6366f1" : "#e5e7eb"}`,
                  background: form.currency === c ? (at?.color || "#6366f1") + "15" : "#fff",
                  color: form.currency === c ? at?.color || "#6366f1" : "#9ca3af",
                }}>{c === "THB" ? "฿ THB" : "$ USD"}</button>
              ))}
            </div>
          </div>

          {error && <div style={{ padding: "8px 12px", background: "#fef2f2", borderRadius: 8, border: "1px solid #fecaca", marginBottom: 12, fontSize: 12, color: "#dc2626" }}>⚠️ {error}</div>}
        </div>

        <div style={{ padding: "12px 20px 20px", borderTop: "1px solid #f3f4f6", display: "flex", gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: 11, borderRadius: 10, border: "1.5px solid #e5e7eb", background: "#fff", fontSize: 13, fontWeight: 600, color: "#6b7280", cursor: "pointer" }}>ยกเลิก</button>
          <button onClick={handleSave} style={{ flex: 2, padding: 11, borderRadius: 10, border: "none", background: at?.color || "#6366f1", fontSize: 13, fontWeight: 700, color: "#fff", cursor: "pointer" }}>➕ เพิ่มสินทรัพย์</button>
        </div>
      </div>
    </div>
  );
}

// ─── Asset Row Card ───────────────────────────────────────────────────────────
function AssetCard({ asset, onAddLot, onUpdatePrice, onDelete, fetchStatus }) {
  const at    = ASSET_TYPES.find(t => t.key === asset.type) || ASSET_TYPES[8];
  const color = at.color;
  const sym   = asset.currency === "USD" ? "$" : "฿";

  const totalQty    = asset.lots.reduce((s, l) => s + l.qty, 0);
  const wac         = calcWAC(asset.lots);
  const totalCost   = wac * totalQty;
  const currentVal  = (asset.currentPrice || 0) * totalQty;
  const gain        = currentVal - totalCost;
  const gainPct     = totalCost > 0 ? (gain / totalCost) * 100 : 0;
  const [showLots, setShowLots] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);

  return (
    <div style={{ background: "#fff", borderRadius: 16, border: `1.5px solid ${color}22`, overflow: "hidden", boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}>
      <div style={{ background: color + "12", padding: "16px 20px", display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: color + "22", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>
          {at.icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontWeight: 800, fontSize: 17, color: "#1a1a2e" }}>{asset.name}</span>
            <Badge color={color}>{at.label}</Badge>
            {asset.sector && <span style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600 }}>{asset.sector}</span>}
            {fetchStatus === "loading" && <span style={{ fontSize: 10, color: "#6366f1", animation: "spin 1s linear infinite", display: "inline-block" }}>🔄</span>}
            {fetchStatus === "ok"   && <span style={{ fontSize: 10, color: "#22c55e" }}>✅</span>}
            {fetchStatus === "fail" && <span style={{ fontSize: 10, color: "#f59e0b" }}>⚠️</span>}
          </div>
          <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2, fontWeight: 500 }}>{asset.fullName}</div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ fontWeight: 800, fontSize: 18, color: "#1a1a2e" }}>{sym}{fmt(currentVal, 0)}</div>
          <div style={{ fontSize: 12, color: pctColor(gain), fontWeight: 700 }}>
            {pctArrow(gain)} {sym}{fmt(Math.abs(gain), 0)} ({gainPct >= 0 ? "+" : ""}{gainPct.toFixed(2)}%)
          </div>
        </div>
      </div>

      <div style={{ padding: "12px 20px", display: "flex", gap: 12, flexWrap: "wrap", borderBottom: "1px solid #f9fafb" }}>
        {[
          { label: "ราคาปัจจุบัน",  value: `${sym}${fmt(asset.currentPrice || 0, 2)}` },
          { label: "ต้นทุนเฉลี่ย",    value: `${sym}${fmt(wac, 2)}` },
          { label: "จำนวน",         value: `${totalQty.toLocaleString("th-TH", { maximumFractionDigits: 6 })} หน่วย` },
          { label: "เงินลงทุน (ทุน)",     value: `${sym}${fmt(totalCost, 0)}` },
        ].map(d => (
          <div key={d.label} style={{ flex: "0 0 auto", minWidth: 100, background: "#f9fafb", borderRadius: 8, padding: "8px 12px" }}>
            <div style={{ fontSize: 10, color: "#9ca3af", marginBottom: 2, fontWeight: 600 }}>{d.label}</div>
            <div style={{ fontWeight: 800, fontSize: 13, color: "#374151" }}>{d.value}</div>
          </div>
        ))}
      </div>

      {showLots && asset.lots.length > 0 && (
        <div style={{ padding: "10px 20px", borderBottom: "1px solid #f9fafb" }}>
          <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f9fafb" }}>
                {["วันที่", "จำนวน", `ราคา/หน่วย (${sym})`, "ต้นทุน", "หมายเหตุ"].map(h => (
                  <th key={h} style={{ padding: "6px 8px", textAlign: h === "วันที่" || h === "หมายเหตุ" ? "left" : "right", fontWeight: 700, color: "#6b7280", borderBottom: "1px solid #f3f4f6" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {asset.lots.map((lot, i) => (
                <tr key={lot.id} style={{ background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                  <td style={{ padding: "6px 8px", color: "#374151", fontWeight: 500 }}>{lot.date}</td>
                  <td style={{ padding: "6px 8px", textAlign: "right", color: "#374151" }}>{lot.qty.toLocaleString("th-TH", { maximumFractionDigits: 6 })}</td>
                  <td style={{ padding: "6px 8px", textAlign: "right", color: color, fontWeight: 700 }}>{sym}{fmt(lot.costPerUnit, 2)}</td>
                  <td style={{ padding: "6px 8px", textAlign: "right", color: "#374151" }}>{sym}{fmt(lot.qty * lot.costPerUnit, 0)}</td>
                  <td style={{ padding: "6px 8px", color: "#9ca3af", fontSize: 11 }}>{lot.note || "—"}</td>
                </tr>
              ))}
              <tr style={{ background: "#f0f0ff", fontWeight: 800 }}>
                <td style={{ padding: "8px", color: "#6366f1" }}>WAC</td>
                <td style={{ padding: "8px", textAlign: "right", color: "#6366f1" }}>{totalQty.toLocaleString("th-TH", { maximumFractionDigits: 6 })}</td>
                <td style={{ padding: "8px", textAlign: "right", color: "#6366f1" }}>{sym}{fmt(wac, 2)}</td>
                <td style={{ padding: "8px", textAlign: "right", color: "#6366f1" }}>{sym}{fmt(totalCost, 0)}</td>
                <td />
              </tr>
            </tbody>
          </table>
        </div>
      )}

      <div style={{ padding: "12px 20px", display: "flex", gap: 8 }}>
        <button onClick={() => setShowLots(s => !s)} style={{
          flex: 1, padding: "8px", borderRadius: 10, fontSize: 12, fontWeight: 700,
          border: `1.5px solid ${showLots ? color + "55" : "#e5e7eb"}`,
          background: showLots ? color + "10" : "#fff", color: showLots ? color : "#6b7280", cursor: "pointer",
        }}>{showLots ? "▲ ซ่อนประวัติ" : `▼ ประวัติการซื้อ (${asset.lots.length})`}</button>

        <button onClick={() => onAddLot(asset)} style={{
          flex: 1, padding: "8px", borderRadius: 10, fontSize: 12, fontWeight: 700,
          border: "1.5px solid #c7d2fe", background: "#f0f0ff", color: "#6366f1", cursor: "pointer",
        }}>➕ ซื้อเพิ่ม (Lot)</button>

        <button onClick={() => onUpdatePrice(asset)} style={{
          flex: 1, padding: "8px", borderRadius: 10, fontSize: 12, fontWeight: 700,
          border: "1.5px solid #bbf7d0", background: "#f0fdf4", color: "#16a34a", cursor: "pointer",
        }}>💱 แก้ราคา</button>

        {!confirmDel ? (
          <button onClick={() => setConfirmDel(true)} style={{
            padding: "8px 14px", borderRadius: 10, fontSize: 12,
            border: "1.5px solid #fecaca", background: "#fef2f2", color: "#dc2626", cursor: "pointer",
          }}>🗑️</button>
        ) : (
          <button onClick={() => onDelete(asset.id)} style={{
            padding: "8px 14px", borderRadius: 10, fontSize: 12, fontWeight: 700,
            border: "none", background: "#dc2626", color: "#fff", cursor: "pointer",
          }}>ยืนยัน</button>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function InvestmentPortfolio() {
  const [assets, setAssets]     = useState([]);
  const [config, setConfig]     = useState({ profile: { baseCurrency: "THB" } });
  const [showAdd, setShowAdd]   = useState(false);
  const [lotTarget, setLotTarget]     = useState(null);
  const [priceTarget, setPriceTarget] = useState(null);
  const [filterType, setFilterType]   = useState("all");
  const [sortBy, setSortBy]           = useState("value_desc");
  const [fetching, setFetching]       = useState(false);
  const [fetchStatus, setFetchStatus] = useState({}); // assetId -> "ok"|"fail"|"loading"
  const [lastFetched, setLastFetched] = useState(null);

  useEffect(() => {
    seedIfEmpty();
    try {
      const a = localStorage.getItem(PORTFOLIO_KEY); if (a) setAssets(JSON.parse(a));
      const c = localStorage.getItem(CONFIG_KEY);    if (c) setConfig(JSON.parse(c));
      const lf = localStorage.getItem("finapp_price_fetched");
      if (lf) setLastFetched(new Date(lf));
    } catch (e) {}
  }, []);

  const fetchAllPrices = async (currentAssets) => {
    const list = currentAssets || assets;
    if (!list.length) return;
    setFetching(true);
    const today = new Date().toISOString().slice(0, 10);
    const status = {};
    const updated = [...list];

    for (let i = 0; i < updated.length; i++) {
      const a = updated[i];
      if (["property", "bond", "other", "cash", "fund"].includes(a.type)) continue;
      
      setFetchStatus(prev => ({ ...prev, [a.id]: "loading" }));
      const result = await fetchRealPrice(a);
      
      if (result && result.price) {
        const newHistory = recordPriceHistory(a, result.price);
        updated[i] = { ...a, currentPrice: result.price, lastUpdated: today, priceHistory: newHistory };
        status[a.id] = "ok";
      } else {
        status[a.id] = "fail";
      }
      setFetchStatus(prev => ({ ...prev, [a.id]: status[a.id] }));
    }

    saveAssets(updated);
    const now = new Date();
    setLastFetched(now);
    try { localStorage.setItem("finapp_price_fetched", now.toISOString()); } catch (e) {}
    setFetching(false);
    setTimeout(() => setFetchStatus({}), 4000);
  };

  const saveAssets = (data) => {
    setAssets(data);
    try { localStorage.setItem(PORTFOLIO_KEY, JSON.stringify(data)); } catch (e) {}
  };

  const handleAddAsset  = (asset) => { saveAssets([asset, ...assets]); setShowAdd(false); };
  const handleDeleteAsset = (id)  => saveAssets(assets.filter(a => a.id !== id));

  const handleAddLot = (lot) => {
    saveAssets(assets.map(a => a.id === lotTarget.id ? { ...a, lots: [...a.lots, lot] } : a));
    setLotTarget(null);
  };

  const handleUpdatePrice = (price) => {
    const today = new Date().toISOString().slice(0, 10);
    saveAssets(assets.map(a => {
      if (a.id !== priceTarget.id) return a;
      const newHistory = recordPriceHistory(a, price);
      return { ...a, currentPrice: price, lastUpdated: today, priceHistory: newHistory };
    }));
    setPriceTarget(null);
  };

  const metrics = useMemo(() => {
    let totalCost = 0, totalValue = 0;
    const byType = {};
    assets.forEach(a => {
      const qty  = a.lots.reduce((s, l) => s + l.qty, 0);
      const wac  = calcWAC(a.lots);
      const cost = wac * qty;
      const val  = (a.currentPrice || 0) * qty;
      totalCost  += cost;
      totalValue += val;
      if (!byType[a.type]) byType[a.type] = 0;
      byType[a.type] += val;
    });
    const gain    = totalValue - totalCost;
    const gainPct = totalCost > 0 ? (gain / totalCost) * 100 : 0;
    return { totalCost, totalValue, gain, gainPct, byType };
  }, [assets]);

  const donutData = useMemo(() => {
    return ASSET_TYPES
      .map(t => ({ label: t.label, value: metrics.byType[t.key] || 0, color: t.color, icon: t.icon }))
      .filter(x => x.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [metrics]);

  const filtered = useMemo(() => {
    let list = filterType === "all" ? assets : assets.filter(a => a.type === filterType);
    return [...list].sort((a, b) => {
      const valA = (a.currentPrice || 0) * a.lots.reduce((s, l) => s + l.qty, 0);
      const valB = (b.currentPrice || 0) * b.lots.reduce((s, l) => s + l.qty, 0);
      const costA = calcWAC(a.lots) * a.lots.reduce((s, l) => s + l.qty, 0);
      const costB = calcWAC(b.lots) * b.lots.reduce((s, l) => s + l.qty, 0);
      const gainPctA = costA > 0 ? ((valA - costA) / costA) * 100 : 0;
      const gainPctB = costB > 0 ? ((valB - costB) / costB) * 100 : 0;
      if (sortBy === "value_desc")   return valB - valA;
      if (sortBy === "gain_desc")    return (valB - costB) - (valA - costA);
      if (sortBy === "gainpct_desc") return gainPctB - gainPctA;
      if (sortBy === "gainpct_asc")  return gainPctA - gainPctB;
      return 0;
    });
  }, [assets, filterType, sortBy]);

  return (
    <div style={{ fontFamily: "'Noto Sans Thai','Sarabun',sans-serif", minHeight: "100vh", background: "#f3f4f6" }}>
      {/* Header UI */}
      <div style={{ background: "linear-gradient(135deg, #0f172a, #1e293b, #312e81)", padding: "24px 20px 20px" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: "#6366f1", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, boxShadow: "0 4px 10px rgba(99,102,241,0.4)" }}>📊</div>
                <span style={{ fontSize: 22, fontWeight: 900, color: "#fff", letterSpacing: "-0.5px" }}>FinFlow</span>
                <span style={{ fontSize: 10, padding: "3px 8px", background: "rgba(255,255,255,0.15)", borderRadius: 99, color: "#e2e8f0", fontWeight: 700, letterSpacing: "0.5px" }}>PORTFOLIO</span>
              </div>
              <p style={{ margin: "6px 0 0 46px", fontSize: 13, color: "#cbd5e1", fontWeight: 500 }}>
                {assets.length} สินทรัพย์
                {lastFetched && ` · ซิงค์ล่าสุด ${lastFetched.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}`}
              </p>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => fetchAllPrices()} disabled={fetching} style={{
                padding: "10px 18px", border: "1.5px solid rgba(255,255,255,0.2)",
                background: fetching ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.1)",
                color: fetching ? "rgba(255,255,255,0.4)" : "#fff",
                borderRadius: 12, fontSize: 13, fontWeight: 700, cursor: fetching ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", gap: 8, transition: "all 0.2s"
              }}>
                <span style={{ display: "inline-block", animation: fetching ? "spin 1s linear infinite" : "none" }}>🔄</span>
                {fetching ? "กำลังดึงราคา..." : "อัปเดตราคาทั้งหมด"}
              </button>
              <button onClick={() => setShowAdd(true)} style={{ padding: "10px 20px", background: "#6366f1", color: "#fff", border: "none", borderRadius: 12, fontSize: 14, fontWeight: 800, cursor: "pointer", boxShadow: "0 4px 12px rgba(99,102,241,0.3)" }}>
                + เพิ่มสินทรัพย์
              </button>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 4 }}>
            {[
              { label: "มูลค่า Port รวม", v: metrics.totalValue, c: "#fff" },
              { label: "เงินลงทุน (ทุน)",  v: metrics.totalCost,  c: "#cbd5e1" },
              { label: "กำไร/ขาดทุน",          v: metrics.gain,       c: pctColor(metrics.gain) === "#22c55e" ? "#4ade80" : metrics.gain < 0 ? "#f87171" : "#9ca3af" },
            ].map(k => (
              <div key={k.label} style={{ flex: "0 0 auto", minWidth: 150, background: "rgba(255,255,255,0.06)", borderRadius: 16, padding: "12px 16px", border: "1px solid rgba(255,255,255,0.08)" }}>
                <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 4, fontWeight: 600 }}>{k.label}</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: k.c, letterSpacing: "-0.5px" }}>฿{fmtShort(k.v)}</div>
              </div>
            ))}
            <div style={{ flex: "0 0 auto", minWidth: 130, background: "rgba(255,255,255,0.06)", borderRadius: 16, padding: "12px 16px", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 4, fontWeight: 600 }}>ผลตอบแทน (%)</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: metrics.gainPct >= 0 ? "#4ade80" : "#f87171", letterSpacing: "-0.5px" }}>
                {metrics.gainPct >= 0 ? "+" : ""}{metrics.gainPct.toFixed(2)}%
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "20px 16px 60px" }}>
        {donutData.length > 0 && (
          <Card title="Asset Allocation (สัดส่วนพอร์ต)" style={{ marginBottom: 20 }}>
            <DonutChart items={donutData} size={200} centerLabel="Portfolio" />
          </Card>
        )}

        {assets.length > 0 && (
          <Card title="📈 กราฟการเติบโตของพอร์ต" style={{ marginBottom: 20 }}>
            <GrowthChart assets={assets} height={260} />
          </Card>
        )}

        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

        <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ display: "flex", gap: 8, flex: 1, flexWrap: "wrap" }}>
            <button onClick={() => setFilterType("all")} style={{
              padding: "6px 16px", borderRadius: 99, fontSize: 13, fontWeight: 700, cursor: "pointer", transition: "all 0.2s",
              border: `1.5px solid ${filterType === "all" ? "#6366f1" : "#d1d5db"}`,
              background: filterType === "all" ? "#6366f1" : "#fff",
              color: filterType === "all" ? "#fff" : "#6b7280",
            }}>ทั้งหมด</button>
            {ASSET_TYPES.filter(t => assets.some(a => a.type === t.key)).map(t => (
              <button key={t.key} onClick={() => setFilterType(t.key)} style={{
                padding: "6px 16px", borderRadius: 99, fontSize: 13, fontWeight: 700, cursor: "pointer", transition: "all 0.2s",
                border: `1.5px solid ${filterType === t.key ? t.color : "#d1d5db"}`,
                background: filterType === t.key ? t.color : "#fff",
                color: filterType === t.key ? "#fff" : "#6b7280",
              }}>{t.icon} {t.label}</button>
            ))}
          </div>
          <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{
            padding: "8px 14px", borderRadius: 12, fontSize: 13, fontWeight: 700,
            border: "1.5px solid #d1d5db", background: "#fff", color: "#374151", cursor: "pointer",
          }}>
            <option value="value_desc">เรียงตาม มูลค่ามากสุด</option>
            <option value="gain_desc">เรียงตาม กำไรมากสุด</option>
            <option value="gainpct_desc">เรียงตาม %กำไรมากสุด</option>
            <option value="gainpct_asc">เรียงตาม %กำไรน้อยสุด</option>
          </select>
        </div>

        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 0", color: "#9ca3af", background: "#fff", borderRadius: 16, border: "1.5px dashed #d1d5db" }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>💼</div>
            <p style={{ fontWeight: 800, fontSize: 18, color: "#475569", margin: "0 0 8px 0" }}>ยังไม่มีสินทรัพย์ในพอร์ต</p>
            <p style={{ fontSize: 14 }}>กดปุ่ม "+ เพิ่มสินทรัพย์" เพื่อเริ่มต้นวางแผนการเงินของคุณ</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {filtered.map(a => (
              <AssetCard key={a.id} asset={a}
                fetchStatus={fetchStatus[a.id]}
                onAddLot={(asset) => setLotTarget(asset)}
                onUpdatePrice={(asset) => setPriceTarget(asset)}
                onDelete={handleDeleteAsset} />
            ))}
          </div>
        )}
        
        <div style={{ textAlign: "center", padding: "40px 10px 20px", color: "#94a3b8", fontSize: 12, lineHeight: "1.8" }}>
           <p style={{ margin: "0 0 6px 0", fontWeight: 700, color: "#64748b" }}>แหล่งอ้างอิงราคา (ดึงผ่าน Public API แบบเรียลไทม์):</p>
           <p style={{ margin: 0 }}>
             <span style={{background:"#f1f5f9", padding:"3px 8px", borderRadius:6}}>₿ Crypto (CoinGecko API)</span> • 
             <span style={{background:"#f1f5f9", padding:"3px 8px", borderRadius:6, margin:"0 6px"}}>📈 หุ้น (Yahoo Finance via AllOrigins)</span> • 
             <span style={{background:"#f1f5f9", padding:"3px 8px", borderRadius:6}}>🥇 ทองคำ (Metals-API)</span>
           </p>
           <p style={{ margin: "10px 0 0 0", fontSize: 11, opacity: 0.8 }}>*การดึงราคาหุ้นไทยและตปท. บางครั้งอาจมีดีเลย์หรือดึงไม่สำเร็จ ขึ้นอยู่กับโควต้าของ Free API Proxy</p>
        </div>

      </div>

      {showAdd     && <AddAssetModal onSave={handleAddAsset} onClose={() => setShowAdd(false)} />}
      {lotTarget   && <LotModal asset={lotTarget} onSave={handleAddLot} onClose={() => setLotTarget(null)} />}
      {priceTarget && <PriceModal asset={priceTarget} onSave={handleUpdatePrice} onClose={() => setPriceTarget(null)} />}
    </div>
  );
}

