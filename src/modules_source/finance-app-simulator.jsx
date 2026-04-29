import React, { useState, useMemo, useCallback } from "react";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
function fmt(n, dec = 0) { return Number(n || 0).toLocaleString("th-TH", { minimumFractionDigits: dec, maximumFractionDigits: dec }); }
function fmtShort(n) {
  const a = Math.abs(n || 0);
  if (a >= 1e9) return (n / 1e9).toFixed(2) + "B";
  if (a >= 1e6) return (n / 1e6).toFixed(2) + "M";
  if (a >= 1e3) return (n / 1e3).toFixed(1) + "K";
  return fmt(n);
}

// ─── Asset presets ─────────────────────────────────────────────────────────────
const ASSET_PRESETS = [
  { key: "stock_th",   label: "หุ้นไทย",         icon: "📈", color: "#6366f1", defaultRate: 8,   risk: "สูง",    taxNote: "ไม่มีภาษีกำไรหุ้น SET" },
  { key: "stock_us",   label: "หุ้นต่างประเทศ",  icon: "🌐", color: "#3b82f6", defaultRate: 10,  risk: "สูง",    taxNote: "ภาษีเงินปันผล 10%" },
  { key: "fund_ltf",   label: "กองทุน SSF/LTF",  icon: "🏦", color: "#8b5cf6", defaultRate: 7,   risk: "ปานกลาง", taxNote: "ลดหย่อนภาษีได้" },
  { key: "gold",       label: "ทองคำ",            icon: "🥇", color: "#f59e0b", defaultRate: 6,   risk: "ปานกลาง", taxNote: "กำไร 15%" },
  { key: "crypto",     label: "Crypto",           icon: "₿",  color: "#f97316", defaultRate: 25,  risk: "สูงมาก", taxNote: "กำไร 15%" },
  { key: "bond",       label: "พันธบัตร/ตราสาร",  icon: "📜", color: "#22c55e", defaultRate: 3.5, risk: "ต่ำ",    taxNote: "ดอกเบี้ย 15%" },
  { key: "provident",  label: "กองทุนสำรองเลี้ยงชีพ", icon: "🔒", color: "#14b8a6", defaultRate: 5, risk: "ต่ำ-ปานกลาง", taxNote: "ลดหย่อนภาษีได้" },
  { key: "savings",    label: "เงินฝาก/ออมทรัพย์", icon: "💵", color: "#9ca3af", defaultRate: 1.5, risk: "ต่ำมาก", taxNote: "ดอกเบี้ย 15%" },
  { key: "property",   label: "อสังหาริมทรัพย์",   icon: "🏠", color: "#ec4899", defaultRate: 6,  risk: "ปานกลาง", taxNote: "ภาษีขาย 3.3%" },
  { key: "custom",     label: "กำหนดเอง",          icon: "⚙️", color: "#6b7280", defaultRate: 0,  risk: "—",       taxNote: "" },
];

const RISK_COLORS = { "สูงมาก": "#ef4444", "สูง": "#f97316", "ปานกลาง": "#f59e0b", "ต่ำ-ปานกลาง": "#84cc16", "ต่ำ": "#22c55e", "ต่ำมาก": "#14b8a6", "—": "#9ca3af" };
const COMPOUND_FREQS = [
  { key: "yearly",   label: "รายปี",       n: 1 },
  { key: "monthly",  label: "รายเดือน",    n: 12 },
  { key: "daily",    label: "รายวัน",      n: 365 },
];
const CONTRIB_FREQS = [
  { key: "monthly",  label: "ต่อเดือน",  factor: 12 },
  { key: "yearly",   label: "ต่อปี",     factor: 1 },
];

// ─── Compound interest engine ──────────────────────────────────────────────────
function calcCompound({ principal, annualRate, additionalAmount, additionalFreq, years, compoundFreq, annualIncreaseRate = 0 }) {
  const r = annualRate / 100;
  const n = COMPOUND_FREQS.find(f => f.key === compoundFreq)?.n || 1;
  const contribPerYear = additionalAmount * (CONTRIB_FREQS.find(f => f.key === additionalFreq)?.factor || 12);

  let balance = principal;
  let totalContrib = principal;
  let totalInterest = 0;
  const rows = [];

  for (let y = 1; y <= years; y++) {
    const startBalance = balance;
    const contrib = contribPerYear * Math.pow(1 + annualIncreaseRate / 100, y - 1);
    
    const endWithCompound = balance * Math.pow(1 + r / n, n);
    const contribInterest = contrib * Math.pow(1 + r / n, n / 2);
    const interest = endWithCompound - balance + contribInterest - contrib;
    
    balance = endWithCompound + (contribInterest);
    totalContrib += contrib;
    totalInterest += Math.max(0, interest);

    rows.push({
      year: y,
      startBalance: Math.round(startBalance),
      contribution: Math.round(contrib),
      interest: Math.round(Math.max(0, interest)),
      endBalance: Math.round(balance),
      totalContrib: Math.round(totalContrib),
      totalInterest: Math.round(totalInterest),
    });
  }
  return rows;
}

// ─── UI atoms ─────────────────────────────────────────────────────────────────
function Card({ children, style = {}, title, action }) {
  return (
    <div style={{ background: "#fff", borderRadius: 16, border: "1.5px solid #f3f4f6", padding: "20px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)", ...style }}>
      {(title || action) && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
          {title && <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: "#1e293b" }}>{title}</h3>}
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

function InputRow({ label, children, hint }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#64748b", marginBottom: 6, letterSpacing: "0.02em" }}>{label}</label>
      {children}
      {hint && <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 4 }}>{hint}</div>}
    </div>
  );
}

function NumberInput({ value, onChange, prefix, suffix, min = 0, step = 1, placeholder }) {
  return (
    <div style={{ display: "flex", alignItems: "center", border: "1.5px solid #e2e8f0", borderRadius: 10, overflow: "hidden", background: "#f8fafc", transition: "all 0.2s" }}>
      {prefix && <span style={{ padding: "0 12px", fontSize: 13, color: "#64748b", fontWeight: 600, background: "#f1f5f9", borderRight: "1px solid #e2e8f0", height: "100%", display: "flex", alignItems: "center" }}>{prefix}</span>}
      <input type="number" value={value} onChange={e => onChange(e.target.value)}
        min={min} step={step} placeholder={placeholder}
        style={{ flex: 1, padding: "10px 12px", border: "none", fontSize: 14, fontWeight: 600, color: "#0f172a", fontFamily: "inherit", outline: "none", background: "transparent" }} />
      {suffix && <span style={{ padding: "0 12px", fontSize: 12, color: "#64748b", fontWeight: 600, background: "#f1f5f9", borderLeft: "1px solid #e2e8f0", height: "100%", display: "flex", alignItems: "center" }}>{suffix}</span>}
    </div>
  );
}

function SliderInput({ value, onChange, min, max, step, color }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <input type="range" value={value} onChange={e => onChange(e.target.value)}
        min={min} max={max} step={step}
        style={{ flex: 1, accentColor: color || "#6366f1", height: 6, borderRadius: 99 }} />
      <span style={{ fontSize: 14, fontWeight: 800, color: color || "#6366f1", minWidth: 50, textAlign: "right", background: (color||"#6366f1")+"15", padding: "4px 8px", borderRadius: 8 }}>{value}%</span>
    </div>
  );
}

// ─── Interactive Growth Chart ─────────────────────────────────────────────────
function SimChart({ assets, height = 260 }) {
  const [hov, setHov] = useState(null);

  const maxYear = useMemo(() => Math.max(...assets.map(a => a.rows.length), 1), [assets]);
  const maxVal  = useMemo(() => Math.max(...assets.flatMap(a => a.rows.map(r => r.endBalance)), 1), [assets]);
  const minVal  = useMemo(() => Math.min(...assets.flatMap(a => a.rows.map(r => r.startBalance)), 0), [assets]);

  const W = 900, H = height - 40, padX = 50, padY = 20;
  const toX = (y) => padX + ((y - 1) / (maxYear - 1 || 1)) * (W - padX * 2);
  const toY = (v) => padY + (1 - (v - minVal) / (maxVal - minVal || 1)) * (H - padY * 2);

  const yLabels = [minVal, (minVal + maxVal) / 2, maxVal];

  // Tooltip alignment logic to prevent off-screen
  let tooltipTransform = "translate(-50%, 10px)";
  if (hov !== null) {
    const percentX = hov / maxYear;
    if (percentX > 0.7) tooltipTransform = "translate(-110%, 10px)";
    else if (percentX < 0.2) tooltipTransform = "translate(10%, 10px)";
  }

  return (
    <div style={{ position: "relative", width: "100%", overflowX: "auto", overflowY: "hidden" }}>
      {/* Tooltip */}
      {hov !== null && (
        <div style={{
          position: "absolute", top: 10,
          left: `${((hov - 1) / (maxYear - 1 || 1)) * 100}%`,
          background: "#0f172a", color: "#fff", borderRadius: 12,
          padding: "12px 16px", fontSize: 12, fontWeight: 600,
          pointerEvents: "none", zIndex: 20, whiteSpace: "nowrap",
          boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
          transform: tooltipTransform,
          border: "1px solid rgba(255,255,255,0.1)"
        }}>
          <div style={{ color: "#94a3b8", marginBottom: 8, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>สรุปผล ปีที่ {hov}</div>
          {assets.map(a => {
            const row = a.rows[hov - 1];
            if (!row) return null;
            return (
              <div key={a.id} style={{ display: "flex", justifyContent: "space-between", gap: 24, marginBottom: 6, alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: a.color }} />
                  <span style={{ color: "#cbd5e1", fontSize: 11 }}>{a.name}</span>
                </div>
                <span style={{ fontWeight: 800, color: "#fff" }}>฿{fmt(row.endBalance)}</span>
              </div>
            );
          })}
        </div>
      )}

      <svg width="100%" height={height} viewBox={`0 0 ${W} ${height}`} preserveAspectRatio="none" style={{ overflow: "visible", minWidth: 600 }}>
        <defs>
          {assets.map(a => (
            <linearGradient key={a.id} id={`grad_${a.id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={a.color} stopOpacity="0.2" />
              <stop offset="100%" stopColor={a.color} stopOpacity="0.0" />
            </linearGradient>
          ))}
        </defs>

        {/* Y Axis Grid */}
        {yLabels.map((v, i) => (
          <g key={i}>
            <line x1={padX} y1={toY(v)} x2={W - padX} y2={toY(v)} stroke="#e2e8f0" strokeWidth={1} strokeDasharray="5 5" />
            <text x={padX - 8} y={toY(v)} textAnchor="end" fontSize={11} fill="#94a3b8" dominantBaseline="middle" fontWeight={700}>{fmtShort(v)}</text>
          </g>
        ))}

        {/* X axis labels (Smart skipping for density) */}
        {Array.from({ length: maxYear }, (_, i) => {
          const yr = i + 1;
          // Show every Nth year if maxYear is large to prevent crowding
          if (maxYear > 15 && yr !== 1 && yr !== maxYear && yr % 5 !== 0) return null;
          return (
            <text key={i} x={toX(yr)} y={height - 4} textAnchor="middle" fontSize={11} fill="#94a3b8" fontWeight={700}>ปี {yr}</text>
          );
        })}

        {/* Principal line (dashed baseline) */}
        {assets[0] && (
          <line x1={toX(1)} y1={toY(assets[0].rows[0]?.startBalance || 0)}
            x2={toX(maxYear)} y2={toY(assets[0].rows[0]?.startBalance || 0)}
            stroke="#cbd5e1" strokeWidth={1.5} strokeDasharray="4 4" />
        )}

        {/* Area + Smooth Lines */}
        {assets.map(a => {
          if (!a.rows.length) return null;
          const pts = a.rows.map(r => `${toX(r.year).toFixed(1)},${toY(r.endBalance).toFixed(1)}`).join(" ");
          const f0 = `${toX(1).toFixed(1)},${toY(a.rows[0].endBalance).toFixed(1)}`;
          const fN = `${toX(maxYear).toFixed(1)},${toY(a.rows[a.rows.length - 1].endBalance).toFixed(1)}`;
          const fB = `${toX(maxYear).toFixed(1)},${toY(minVal).toFixed(1)}`;
          const f0B = `${toX(1).toFixed(1)},${toY(minVal).toFixed(1)}`;

          // Smooth bezier curve
          let d = `M ${pts.split(" ")[0]}`;
          for (let i = 0; i < a.rows.length - 1; i++) {
            const x1 = toX(a.rows[i].year), y1 = toY(a.rows[i].endBalance);
            const x2 = toX(a.rows[i + 1].year), y2 = toY(a.rows[i + 1].endBalance);
            const cx = (x1 + x2) / 2;
            d += ` C ${cx},${y1} ${cx},${y2} ${x2},${y2}`;
          }
          return (
            <g key={a.id}>
              <path d={`${d} L ${fB} L ${f0B} Z`} fill={`url(#grad_${a.id})`} />
              <path d={d} fill="none" stroke={a.color} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
              
              {/* Hover highlight dot */}
              {hov && a.rows[hov - 1] && (
                <circle cx={toX(hov)} cy={toY(a.rows[hov - 1].endBalance)} r={5} fill={a.color} stroke="#fff" strokeWidth={2} />
              )}
            </g>
          );
        })}

        {/* Hover interaction zones */}
        {Array.from({ length: maxYear }, (_, i) => (
          <rect key={i} x={toX(i + 1) - W / maxYear / 2} y={0} width={W / maxYear} height={H}
            fill="transparent" style={{ cursor: "crosshair" }}
            onMouseEnter={() => setHov(i + 1)} onMouseLeave={() => setHov(null)}
            onTouchStart={() => setHov(i + 1)} onTouchEnd={() => setTimeout(() => setHov(null), 1500)} />
        ))}
      </svg>
    </div>
  );
}

// ─── Asset Config Panel ───────────────────────────────────────────────────────
function AssetPanel({ asset, onChange, onRemove, canRemove }) {
  const preset = ASSET_PRESETS.find(p => p.key === asset.preset) || ASSET_PRESETS[9];
  const riskColor = RISK_COLORS[preset.risk] || "#9ca3af";

  return (
    <Card style={{ border: `2px solid ${preset.color}33`, padding: "20px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: preset.color + "20", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>
          {preset.icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <input value={asset.name} onChange={e => onChange({ ...asset, name: e.target.value })}
            style={{ width: "100%", border: "none", fontSize: 16, fontWeight: 800, color: "#0f172a", outline: "none", background: "transparent", fontFamily: "inherit", padding: 0 }}
            placeholder="ชื่อสินทรัพย์..." />
          <div style={{ display: "flex", gap: 8, marginTop: 4, flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 6, background: riskColor + "18", color: riskColor, fontWeight: 700 }}>ความเสี่ยง{preset.risk}</span>
            {preset.taxNote && <span style={{ fontSize: 11, color: "#64748b", fontWeight: 600 }}>{preset.taxNote}</span>}
          </div>
        </div>
        {canRemove && (
          <button onClick={onRemove} style={{ width: 32, height: 32, borderRadius: 8, border: "none", background: "#fef2f2", color: "#ef4444", cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }}>×</button>
        )}
      </div>

      {/* Preset type */}
      <InputRow label="ประเภทการลงทุน (Preset)">
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {ASSET_PRESETS.map(p => (
            <button key={p.key} onClick={() => onChange({ ...asset, preset: p.key, annualRate: p.key !== "custom" ? p.defaultRate : asset.annualRate })}
              style={{
                padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", border: "1px solid",
                borderColor: asset.preset === p.key ? p.color : "#e2e8f0",
                background: asset.preset === p.key ? p.color + "15" : "#fff",
                color: asset.preset === p.key ? p.color : "#64748b",
                transition: "all 0.2s"
              }}>{p.icon} {p.label}</button>
          ))}
        </div>
      </InputRow>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px 16px" }}>
        <InputRow label="เงินต้นเริ่มต้น (บาท)">
          <NumberInput value={asset.principal} onChange={v => onChange({ ...asset, principal: v })} prefix="฿" placeholder="100,000" />
        </InputRow>

        <InputRow label="ลงทุนเพิ่ม (DCA)">
          <div style={{ display: "flex", gap: 6 }}>
            <NumberInput value={asset.additionalAmount} onChange={v => onChange({ ...asset, additionalAmount: v })} prefix="฿" placeholder="5,000" />
            <select value={asset.additionalFreq} onChange={e => onChange({ ...asset, additionalFreq: e.target.value })}
              style={{ padding: "10px", borderRadius: 10, border: "1.5px solid #e2e8f0", fontSize: 13, fontWeight: 600, color: "#334155", fontFamily: "inherit", outline: "none", background: "#fff", cursor: "pointer" }}>
              {CONTRIB_FREQS.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
            </select>
          </div>
        </InputRow>

        <InputRow label="ระยะเวลาการลงทุน (ปี)">
          <NumberInput value={asset.years} onChange={v => onChange({ ...asset, years: v })} suffix="ปี" min={1} placeholder="10" />
        </InputRow>

        <InputRow label="เพิ่มเงินลงทุนต่อปี (Step-up)">
          <NumberInput value={asset.annualIncreaseRate} onChange={v => onChange({ ...asset, annualIncreaseRate: v })} suffix="% / ปี" step={0.1} placeholder="0" />
        </InputRow>
      </div>

      <InputRow label={`ผลตอบแทนคาดหวัง: ${asset.annualRate}% / ปี`} hint={`สถิติอดีต: SET ~8% · S&P500 ~10% · ทอง ~6% · ฝากประจำ ~1.5%`}>
        <SliderInput value={asset.annualRate} onChange={v => onChange({ ...asset, annualRate: Number(v) })} min={0} max={50} step={0.1} color={preset.color} />
      </InputRow>

      <InputRow label="ความถี่ในการทบต้นผลตอบแทน">
        <div style={{ display: "flex", gap: 8 }}>
          {COMPOUND_FREQS.map(f => (
            <button key={f.key} onClick={() => onChange({ ...asset, compoundFreq: f.key })} style={{
              flex: 1, padding: "8px", borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: "pointer",
              border: `1.5px solid ${asset.compoundFreq === f.key ? preset.color : "#e2e8f0"}`,
              background: asset.compoundFreq === f.key ? preset.color + "15" : "#fff",
              color: asset.compoundFreq === f.key ? preset.color : "#64748b",
            }}>{f.label}</button>
          ))}
        </div>
      </InputRow>
    </Card>
  );
}

// ─── Result Summary Card ───────────────────────────────────────────────────────
function ResultCard({ asset, rows, color }) {
  if (!rows.length) return null;
  const last = rows[rows.length - 1];
  const roi  = last.totalContrib > 0 ? ((last.endBalance - last.totalContrib) / last.totalContrib) * 100 : 0;
  const cagr = last.totalContrib > 0 && asset.principal > 0
    ? (Math.pow(last.endBalance / asset.principal, 1 / rows.length) - 1) * 100 : 0;

  return (
    <div style={{ background: "#fff", borderRadius: 16, border: `2px solid ${color}33`, padding: "16px", boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <div style={{ width: 12, height: 12, borderRadius: "50%", background: color, boxShadow: `0 0 8px ${color}88` }} />
        <span style={{ fontWeight: 800, fontSize: 15, color: "#0f172a" }}>{asset.name}</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {[
          { label: "มูลค่าสุดท้าย (บาท)",   value: `฿${fmt(last.endBalance)}`,    color },
          { label: "กำไรทั้งหมด",          value: `+ ฿${fmt(last.totalInterest)}`,  color: "#22c55e" },
          { label: "เงินลงทุนจริง",         value: `฿${fmt(last.totalContrib)}`, color: "#64748b" },
          { label: "ROI (ผลตอบแทนรวม)",    value: `+ ${roi.toFixed(1)}%`,            color: "#6366f1" },
          { label: "CAGR (ผลตอบแทนเฉลี่ย)", value: `${cagr.toFixed(2)}% / ปี`,        color: "#f59e0b" },
          { label: "กำไรเติบโตจากทุน",      value: `${last.totalContrib > 0 ? ((last.totalInterest / last.totalContrib) * 100).toFixed(0) : 0}%`, color: "#8b5cf6" },
        ].map(s => (
          <div key={s.label} style={{ background: "#f8fafc", borderRadius: 10, padding: "10px 12px", border: "1px solid #f1f5f9" }}>
            <div style={{ fontSize: 11, color: "#64748b", marginBottom: 4, fontWeight: 600 }}>{s.label}</div>
            <div style={{ fontWeight: 800, fontSize: 14, color: s.color, letterSpacing: "-0.5px" }}>{s.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Amortization Table ───────────────────────────────────────────────────────
function SimTable({ assets, showRows = 10 }) {
  const [show, setShow] = useState(showRows);
  const maxYears = Math.max(...assets.map(a => a.rows.length), 0);

  if (!maxYears) return null;

  return (
    <div style={{ overflowX: "auto", borderRadius: 12, border: "1px solid #e2e8f0" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead style={{ position: "sticky", top: 0, background: "#f8fafc", zIndex: 1 }}>
          <tr>
            <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: 800, color: "#475569", borderBottom: "2px solid #e2e8f0", whiteSpace: "nowrap" }}>ปีที่</th>
            {assets.map(a => (
              <th key={a.id + "_end"} style={{ padding: "12px 10px", textAlign: "right", fontWeight: 800, color: a.color, borderBottom: "2px solid #e2e8f0", whiteSpace: "nowrap" }}>
                {a.name} <br/><span style={{fontSize: 10, opacity: 0.8}}>มูลค่าสุทธิ</span>
              </th>
            ))}
            {assets.map(a => (
              <th key={a.id + "_contrib"} style={{ padding: "12px 10px", textAlign: "right", fontWeight: 800, color: "#64748b", borderBottom: "2px solid #e2e8f0", whiteSpace: "nowrap", borderLeft: "1px solid #f1f5f9" }}>
                {a.name} <br/><span style={{fontSize: 10, opacity: 0.8}}>ทุนสะสม</span>
              </th>
            ))}
            {assets.map(a => (
              <th key={a.id + "_int"} style={{ padding: "12px 10px", textAlign: "right", fontWeight: 800, color: "#22c55e", borderBottom: "2px solid #e2e8f0", whiteSpace: "nowrap", borderLeft: "1px solid #f1f5f9" }}>
                {a.name} <br/><span style={{fontSize: 10, opacity: 0.8}}>กำไรสะสม</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: Math.min(show, maxYears) }, (_, i) => {
            const yr = i + 1;
            return (
              <tr key={yr} style={{ background: yr % 2 === 0 ? "#f8fafc" : "#fff", borderBottom: "1px solid #f1f5f9" }}>
                <td style={{ padding: "10px 16px", fontWeight: 800, color: "#0f172a" }}>ปี {yr}</td>
                {assets.map(a => {
                  const row = a.rows[yr - 1];
                  return <td key={a.id + "_e"} style={{ padding: "10px 10px", textAlign: "right", fontWeight: 700, color: a.color }}>{row ? `฿${fmt(row.endBalance)}` : "—"}</td>;
                })}
                {assets.map(a => {
                  const row = a.rows[yr - 1];
                  return <td key={a.id + "_c"} style={{ padding: "10px 10px", textAlign: "right", color: "#64748b", borderLeft: "1px solid #f1f5f9" }}>{row ? `฿${fmt(row.totalContrib)}` : "—"}</td>;
                })}
                {assets.map(a => {
                  const row = a.rows[yr - 1];
                  return <td key={a.id + "_i"} style={{ padding: "10px 10px", textAlign: "right", color: "#22c55e", fontWeight: 700, borderLeft: "1px solid #f1f5f9" }}>{row ? `+ ฿${fmt(row.totalInterest)}` : "—"}</td>;
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
      {show < maxYears && (
        <div style={{ padding: "16px", textAlign: "center", background: "#fff" }}>
          <button onClick={() => setShow(s => Math.min(s + 10, maxYears))} style={{
            padding: "10px 24px", borderRadius: 12, border: "2px solid #e2e8f0",
            background: "#fff", fontSize: 13, fontWeight: 700, color: "#64748b", cursor: "pointer", transition: "all 0.2s"
          }}>แสดงเพิ่ม ({maxYears - show} ปีที่เหลือ)</button>
        </div>
      )}
    </div>
  );
}

// ─── Default asset factory ─────────────────────────────────────────────────────
function newAsset(overrides = {}) {
  return {
    id: genId(),
    name: "สินทรัพย์ใหม่",
    preset: "stock_th",
    principal: 100000,
    additionalAmount: 5000,
    additionalFreq: "monthly",
    years: 10,
    annualRate: 8,
    compoundFreq: "yearly",
    annualIncreaseRate: 0,
    ...overrides,
  };
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function InvestmentSimulator() {
  const [assets, setAssets] = useState([
    newAsset({ id: "s1", name: "หุ้นไทย (DCA)", preset: "stock_th", annualRate: 8, color: "#6366f1" }),
    newAsset({ id: "s2", name: "กองทุน S&P500", preset: "stock_us", annualRate: 10, color: "#3b82f6" }),
  ]);
  const [showTable, setShowTable] = useState(false);
  
  // compareMode: true = แยกรายสินทรัพย์, false = รวมทุกสินทรัพย์เป็นพอร์ตเดียว
  const [compareMode, setCompareMode] = useState(true);

  const COLORS = ["#6366f1", "#f59e0b", "#22c55e", "#ef4444", "#3b82f6", "#ec4899"];

  const assetColors = useMemo(() => {
    const m = {};
    assets.forEach((a, i) => { m[a.id] = COLORS[i % COLORS.length]; });
    return m;
  }, [assets]);

  const computed = useMemo(() =>
    assets.map(a => ({
      ...a,
      color: assetColors[a.id] || "#6366f1",
      rows: calcCompound({
        principal: parseFloat(a.principal) || 0,
        annualRate: parseFloat(a.annualRate) || 0,
        additionalAmount: parseFloat(a.additionalAmount) || 0,
        additionalFreq: a.additionalFreq,
        years: Math.min(parseInt(a.years) || 1, 50),
        compoundFreq: a.compoundFreq,
        annualIncreaseRate: parseFloat(a.annualIncreaseRate) || 0,
      }),
    })),
    [assets, assetColors]
  );

  const updateAsset = useCallback((id, updated) => {
    setAssets(prev => prev.map(a => a.id === id ? { ...updated, id } : a));
  }, []);

  const addAsset = () => {
    if (assets.length >= 6) return;
    setAssets(prev => [...prev, newAsset({ name: `สินทรัพย์ ${prev.length + 1}` })]);
  };

  const removeAsset = (id) => {
    if (assets.length <= 1) return;
    setAssets(prev => prev.filter(a => a.id !== id));
  };

  // ── คำนวณพอร์ตรวม (Grand Total / Combined Portfolio) ──
  const grandTotal = useMemo(() => {
    const totals = { endBalance: 0, totalContrib: 0, totalInterest: 0 };
    computed.forEach(a => {
      const last = a.rows[a.rows.length - 1];
      if (!last) return;
      totals.endBalance += last.endBalance;
      totals.totalContrib += last.totalContrib;
      totals.totalInterest += last.totalInterest;
    });
    return totals;
  }, [computed]);

  // สร้าง Object เสมือนเป็น 1 สินทรัพย์ เพื่อวาดกราฟรวมเมื่อปิดโหมดเปรียบเทียบ
  const combinedPortfolio = useMemo(() => {
    const maxYear = Math.max(...computed.map(a => a.rows.length), 0);
    const combinedRows = [];
    
    for (let y = 1; y <= maxYear; y++) {
      let sb = 0, cont = 0, int = 0, eb = 0, tc = 0, ti = 0;
      computed.forEach(a => {
        // ใช้ข้อมูลปีที่ y หรือปีสุดท้ายถ้าสินทรัพย์นั้นครบอายุก่อน
        const row = a.rows[y - 1] || a.rows[a.rows.length - 1]; 
        if (row) {
          sb += row.startBalance;  cont += row.contribution;
          int += row.interest;     eb += row.endBalance;
          tc += row.totalContrib;  ti += row.totalInterest;
        }
      });
      if (eb > 0) {
        combinedRows.push({ year: y, startBalance: sb, contribution: cont, interest: int, endBalance: eb, totalContrib: tc, totalInterest: ti });
      }
    }
    return {
      id: "total_portfolio",
      name: "💰 พอร์ตรวมทั้งหมด",
      color: "#22c55e",
      rows: combinedRows
    };
  }, [computed]);

  // กำหนดข้อมูลที่จะส่งไปให้กราฟวาด
  const chartData = compareMode ? computed : [combinedPortfolio];

  return (
    <div style={{ fontFamily: "'Noto Sans Thai','Sarabun',sans-serif", minHeight: "100vh", background: "#f8fafc" }}>
      
      {/* ── CSS สำหรับ Responsive Grid โดยไม่ต้องใช้ไฟล์แยก ── */}
      <style>{`
        .layout-container { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.4fr); gap: 20px; align-items: start; }
        .result-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
        @media (max-width: 960px) {
          .layout-container { grid-template-columns: 1fr; }
        }
      `}</style>

      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #0f172a, #1e293b, #334155)", padding: "24px 20px 20px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16, marginBottom: 20 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: "#6366f1", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, boxShadow: "0 4px 12px rgba(99,102,241,0.3)" }}>🔮</div>
                <span style={{ fontSize: 24, fontWeight: 900, color: "#fff", letterSpacing: "-0.5px" }}>FinFlow</span>
                <span style={{ fontSize: 11, padding: "3px 10px", background: "rgba(255,255,255,0.15)", borderRadius: 99, color: "#f8fafc", fontWeight: 700 }}>SIMULATOR</span>
              </div>
              <p style={{ margin: "6px 0 0 52px", fontSize: 13, color: "#94a3b8", fontWeight: 500 }}>
                เครื่องมือวางแผนเกษียณและจำลองผลตอบแทนแบบทบต้น
              </p>
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button onClick={() => setCompareMode(c => !c)} style={{
                padding: "10px 16px", borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: "pointer", transition: "all 0.2s",
                border: "2px solid",
                borderColor: compareMode ? "#6366f1" : "rgba(255,255,255,0.2)",
                background: compareMode ? "rgba(99,102,241,0.2)" : "rgba(255,255,255,0.05)",
                color: "#fff",
              }}>
                {compareMode ? "📊 แยกรายสินทรัพย์" : "💰 แสดงรวมพอร์ต"}
              </button>
              <button onClick={addAsset} disabled={assets.length >= 6} style={{
                padding: "10px 20px", background: assets.length >= 6 ? "rgba(255,255,255,0.1)" : "#6366f1",
                color: assets.length >= 6 ? "rgba(255,255,255,0.4)" : "#fff",
                border: "none", borderRadius: 12, fontSize: 14, fontWeight: 800,
                cursor: assets.length >= 6 ? "not-allowed" : "pointer", boxShadow: assets.length < 6 ? "0 4px 12px rgba(99,102,241,0.3)" : "none"
              }}>+ เพิ่มสินทรัพย์ ({assets.length}/6)</button>
            </div>
          </div>

          {/* Grand Total KPI */}
          <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 4 }}>
            {[
              { label: "มูลค่ารวมปลายทาง", v: grandTotal.endBalance,    c: "#fff" },
              { label: "เงินที่ลงทุนไปจริงทั้งหมด",   v: grandTotal.totalContrib,  c: "#cbd5e1" },
              { label: "กำไรจากดอกเบี้ยทบต้น",  v: grandTotal.totalInterest, c: "#4ade80" },
            ].map(k => (
              <div key={k.label} style={{ flex: "0 0 auto", minWidth: 180, background: "rgba(255,255,255,0.05)", borderRadius: 16, padding: "16px", border: "1px solid rgba(255,255,255,0.08)" }}>
                <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 6, fontWeight: 600 }}>{k.label}</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: k.c, letterSpacing: "-0.5px" }}>฿{fmtShort(k.v || 0)}</div>
              </div>
            ))}
            {grandTotal.totalContrib > 0 && (
              <div style={{ flex: "0 0 auto", minWidth: 150, background: "rgba(255,255,255,0.05)", borderRadius: 16, padding: "16px", border: "1px solid rgba(255,255,255,0.08)" }}>
                <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 6, fontWeight: 600 }}>ผลตอบแทนรวมทั้งพอร์ต</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: "#fbbf24", letterSpacing: "-0.5px" }}>
                  +{(((grandTotal.endBalance - grandTotal.totalContrib) / grandTotal.totalContrib) * 100).toFixed(1)}%
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 16px 80px" }}>
        <div className="layout-container">

          {/* Left: Asset config panels */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: "#475569", marginBottom: 4, display: "flex", alignItems: "center", gap: 8 }}>
              ⚙️ การตั้งค่าแผนการลงทุน
            </div>
            {assets.map((a) => (
              <AssetPanel key={a.id} asset={a}
                onChange={updated => updateAsset(a.id, updated)}
                onRemove={() => removeAsset(a.id)}
                canRemove={assets.length > 1} />
            ))}

            {/* Inflation note */}
            <div style={{ padding: "14px 16px", background: "#fffbeb", borderRadius: 12, border: "1px solid #fde68a", fontSize: 13, color: "#92400e", lineHeight: "1.6" }}>
              💡 <strong>ความรู้เพิ่มเติม:</strong> ตัวเลขในเครื่องมือนี้คือ "มูลค่าเงินในอนาคตตามหน้าตั๋ว" <br/>
              หากต้องการวางแผนเกษียณจริง ควรเผื่อหักอัตราเงินเฟ้อ (โดยเฉลี่ย 2.5% - 3% ต่อปี) เพื่อหาอำนาจซื้อที่แท้จริง
            </div>
          </div>

          {/* Right: Chart + Results */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

            {/* Growth chart */}
            <Card title={compareMode ? "📈 เปรียบเทียบการเติบโต" : "📈 ภาพรวมการเติบโตทั้งพอร์ต"} action={
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                {chartData.map(a => (
                  <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 12, height: 12, borderRadius: 3, background: a.color }} />
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#475569" }}>{a.name}</span>
                  </div>
                ))}
              </div>
            }>
              <SimChart assets={chartData} height={280} />
            </Card>

            {/* Results */}
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#475569", marginBottom: 12 }}>📊 สรุปผลลัพธ์เมื่อสิ้นสุดโครงการ</div>
              <div className="result-grid">
                {/* ถ้าแสดงรวมพอร์ต ก็แสดงแค่การ์ดสรุปรวม ถ้าโหมดเปรียบเทียบ ให้แสดงทุกสินทรัพย์ */}
                {chartData.map(a => <ResultCard key={a.id} asset={a} rows={a.rows} color={a.color} />)}
              </div>
            </div>

            {/* Breakdown bars (Show only in compare mode) */}
            {compareMode && (
              <Card title="สัดส่วน เงินลงทุน vs กำไรสะสม">
                {computed.map(a => {
                  const last = a.rows[a.rows.length - 1];
                  if (!last) return null;
                  const contrib = last.totalContrib, interest = last.totalInterest, total = last.endBalance;
                  return (
                    <div key={a.id} style={{ marginBottom: 16 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}>
                        <span style={{ fontWeight: 800, color: "#1e293b" }}>{a.name}</span>
                        <span style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>
                          ฿{fmtShort(contrib)} (ทุน) + <span style={{color: a.color}}>฿{fmtShort(interest)} (กำไร)</span>
                        </span>
                      </div>
                      <div style={{ display: "flex", height: 12, borderRadius: 99, overflow: "hidden" }}>
                        <div style={{ width: `${(contrib / total) * 100}%`, background: "#e2e8f0", transition: "width 0.4s" }} />
                        <div style={{ width: `${(interest / total) * 100}%`, background: a.color, transition: "width 0.4s" }} />
                      </div>
                      <div style={{ display: "flex", gap: 16, marginTop: 6, fontSize: 11, color: "#64748b", fontWeight: 600 }}>
                        <span>🔲 สัดส่วนทุน {((contrib / total) * 100).toFixed(0)}%</span>
                        <span style={{ color: a.color }}>■ สัดส่วนกำไร {((interest / total) * 100).toFixed(0)}%</span>
                      </div>
                    </div>
                  );
                })}
              </Card>
            )}

            {/* Table toggle */}
            <button onClick={() => setShowTable(s => !s)} style={{
              padding: "14px 20px", borderRadius: 12, border: "2px solid #e2e8f0",
              background: showTable ? "#f8fafc" : "#fff",
              fontSize: 14, fontWeight: 700, color: showTable ? "#6366f1" : "#475569",
              cursor: "pointer", textAlign: "center", transition: "all 0.2s"
            }}>
              {showTable ? "▲ ปิดตารางเงินทุนรายปี" : "▼ เปิดดูตารางวิเคราะห์เงินทุนรายปี"}
            </button>

            {showTable && (
              <Card title="ตารางกระแสเงินสดรายปี (Cash Flow)">
                <SimTable assets={chartData} />
              </Card>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}