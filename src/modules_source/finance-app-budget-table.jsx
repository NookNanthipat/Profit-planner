import React, { useEffect, useMemo, useState } from "react";

const CONFIG_KEY = "finapp_config";
const TX_KEY = "finapp_transactions";
const BUDGET_KEY = "finapp_budgets";

const MONTHS = [
  { key: "01", label: "Jan" },
  { key: "02", label: "Feb" },
  { key: "03", label: "Mar" },
  { key: "04", label: "Apr" },
  { key: "05", label: "May" },
  { key: "06", label: "Jun" },
  { key: "07", label: "Jul" },
  { key: "08", label: "Aug" },
  { key: "09", label: "Sep" },
  { key: "10", label: "Oct" },
  { key: "11", label: "Nov" },
  { key: "12", label: "Dec" },
];

const SECTION_TYPES = [
  { key: "income", label: "รายได้", color: "#22c55e" },
  { key: "expense", label: "รายจ่าย", color: "#ef4444" },
  { key: "saving", label: "เงินออม", color: "#3b82f6" },
  { key: "investment", label: "การลงทุน", color: "#8b5cf6" },
];

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function money(n, ccy = "THB") {
  const sym = ccy === "THB" ? "฿" : ccy === "USD" ? "$" : ccy;
  return `${sym}${Number(n || 0).toLocaleString("th-TH", { maximumFractionDigits: 0 })}`;
}

function Badge({ color, children }) {
  return <span style={{ display: "inline-flex", alignItems: "center", padding: "2px 8px", borderRadius: 99, fontSize: 10, fontWeight: 700, background: `${color}18`, color, border: `1px solid ${color}33` }}>{children}</span>;
}

function FancySelect({ label, value, onChange, options }) {
  return (
    <div style={{ minWidth: 160 }}>
      {label && <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: "#6b7280", marginBottom: 4, textTransform: "uppercase" }}>{label}</label>}
      <select value={value} onChange={(e) => onChange(e.target.value)} style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #dbe2ea", fontSize: 12, background: "#fff" }}>
        {options.map((o) => {
          const optionValue = typeof o === "object" ? o.value : o;
          const optionLabel = typeof o === "object" ? o.label : o;
          return <option key={String(optionValue)} value={optionValue}>{optionLabel}</option>;
        })}
      </select>
    </div>
  );
}

function FancyInput({ label, value, onChange, type = "text", placeholder }) {
  return (
    <div style={{ minWidth: 0 }}>
      {label && <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: "#6b7280", marginBottom: 4, textTransform: "uppercase" }}>{label}</label>}
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #dbe2ea", fontSize: 12, background: "#fff", boxSizing: "border-box" }} />
    </div>
  );
}

function progressMeta(actual, planned, type) {
  if (planned <= 0) return { progress: 0, color: "#d1d5db" };
  const ratio = (actual / planned) * 100;
  if (type === "income") return { progress: Math.min(100, ratio), color: ratio >= 100 ? "#16a34a" : ratio >= 70 ? "#2563eb" : "#f59e0b" };
  return { progress: Math.min(100, ratio), color: ratio > 100 ? "#ef4444" : ratio >= 80 ? "#2563eb" : "#16a34a" };
}

function buildBudgetTree(categories, type) {
  const mains = Array.from(new Set((categories || []).filter((c) => c.type === type).map((c) => c.main).filter(Boolean)));
  return mains.map((main) => ({ main, subs: (categories || []).filter((c) => c.type === type && c.main === main && c.sub).map((c) => c.sub) }));
}

function getDefaultCategories() {
  return [
    { id: "c1", type: "expense", main: "อาหาร", sub: "อาหารเย็น" },
    { id: "c2", type: "expense", main: "อาหาร", sub: "กาแฟ/เครื่องดื่ม" },
    { id: "c3", type: "expense", main: "การเดินทาง", sub: "น้ำมัน" },
    { id: "c4", type: "expense", main: "การเดินทาง", sub: "Grab/Taxi" },
    { id: "c5", type: "saving", main: "เงินออม", sub: "ออมฉุกเฉิน" },
    { id: "c6", type: "saving", main: "เงินออม", sub: "ออมท่องเที่ยว" },
    { id: "c7", type: "investment", main: "การลงทุน", sub: "หุ้น" },
    { id: "c8", type: "investment", main: "การลงทุน", sub: "BTC" },
    { id: "c9", type: "income", main: "เงินเดือน", sub: "เงินเดือนประจำ" },
    { id: "c10", type: "income", main: "Freelance", sub: "รับจ้างเขียน Code" },
  ];
}

function CellProgress({ planned, actual, type }) {
  const meta = progressMeta(actual, planned, type);
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}><span style={{ fontSize: 10, color: "#1a1a2e", fontWeight: 700 }}>{planned > 0 ? Number(planned).toLocaleString("th-TH") : "-"}</span><span style={{ fontSize: 9, color: meta.color, fontWeight: 700 }}>{planned > 0 ? `${Math.min(100, Math.round(meta.progress))}%` : ""}</span></div>
      <div style={{ fontSize: 9, color: type === "income" ? "#16a34a" : "#ef4444", marginBottom: 3 }}>{actual > 0 ? Number(actual).toLocaleString("th-TH") : "-"}</div>
      <div style={{ background: "#e5e7eb", borderRadius: 999, height: 6, overflow: "hidden" }}><div style={{ width: `${Math.min(100, meta.progress)}%`, height: "100%", background: meta.color, borderRadius: 999 }} /></div>
    </div>
  );
}

function BudgetEditModal({ open, onClose, onSave, record, currency }) {
  const [amount, setAmount] = useState(record?.plannedAmount ? String(record.plannedAmount) : "");
  const [note, setNote] = useState(record?.note || "");
  useEffect(() => { setAmount(record?.plannedAmount ? String(record.plannedAmount) : ""); setNote(record?.note || ""); }, [record]);
  if (!open || !record) return null;
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 100 }}>
      <div style={{ width: "100%", maxWidth: 420, background: "#fff", borderRadius: 16, padding: 24, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
        <h3 style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 700, color: "#1a1a2e" }}>✏️ แก้ไขงบประมาณหมวดย่อย</h3>
        <p style={{ margin: "0 0 16px", fontSize: 13, color: "#6b7280" }}>{record.typeLabel} • {record.rowLabel} • {record.monthLabel}</p>
        <div style={{ display: "grid", gap: 12, marginBottom: 16 }}>
          <FancyInput label={`งบประมาณ (${currency})`} type="number" value={amount} onChange={setAmount} placeholder="0" />
          <FancyInput label="หมายเหตุ" value={note} onChange={setNote} placeholder="ใส่หมายเหตุเพิ่มเติม" />
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: 10, borderRadius: 10, border: "1px solid #dbe2ea", background: "#fff", cursor: "pointer", fontWeight: 600, color: "#6b7280" }}>ยกเลิก</button>
          <button onClick={() => onSave({ ...record, plannedAmount: Number(amount || 0), note, currency })} style={{ flex: 1.4, padding: 10, borderRadius: 10, border: "none", background: "#6366f1", color: "#fff", cursor: "pointer", fontWeight: 700 }}>💾 บันทึก</button>
        </div>
      </div>
    </div>
  );
}

function GenerateYearModal({ open, onClose, onConfirm, year }) {
  const [sourceMonth, setSourceMonth] = useState("01");
  const [scope, setScope] = useState("all");
  const [mode, setMode] = useState("fill_empty");
  useEffect(() => { setSourceMonth("01"); setScope("all"); setMode("fill_empty"); }, [open]);
  if (!open) return null;
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 120 }}>
      <div style={{ width: "100%", maxWidth: 420, background: "#fff", borderRadius: 16, padding: 24, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
        <h3 style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 700, color: "#1a1a2e" }}>🪄 Gen งบให้เหมือนกันทั้งปี</h3>
        <p style={{ margin: "0 0 16px", fontSize: 13, color: "#6b7280" }}>คัดลอกงบจากเดือนต้นแบบไปยังทุกเดือนของปี {year}</p>
        <div style={{ display: "grid", gap: 12, marginBottom: 16 }}>
          <FancySelect label="เดือนต้นแบบ" value={sourceMonth} onChange={setSourceMonth} options={MONTHS.map((m) => ({ value: m.key, label: `${m.label}` }))} />
          <FancySelect label="ขอบเขต" value={scope} onChange={setScope} options={[{ value: "all", label: "ทุกประเภท" }, { value: "income", label: "เฉพาะรายได้" }, { value: "expense", label: "เฉพาะรายจ่าย" }, { value: "saving", label: "เฉพาะเงินออม" }, { value: "investment", label: "เฉพาะการลงทุน" }]} />
          <FancySelect label="วิธีเขียนทับ" value={mode} onChange={setMode} options={[{ value: "fill_empty", label: "เฉพาะช่องที่ยังว่าง" }, { value: "overwrite", label: "เขียนทับทุกช่อง" }]} />
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: 10, borderRadius: 10, border: "1px solid #dbe2ea", background: "#fff", cursor: "pointer", fontWeight: 600, color: "#6b7280" }}>ยกเลิก</button>
          <button onClick={() => onConfirm({ sourceMonth, scope, mode })} style={{ flex: 1.4, padding: 10, borderRadius: 10, border: "none", background: "#6366f1", color: "#fff", cursor: "pointer", fontWeight: 700 }}>📋 Gen ทั้งปี</button>
        </div>
      </div>
    </div>
  );
}

function ConfirmGenerateModal({ open, payload, onClose, onConfirm, year }) {
  if (!open || !payload) return null;
  const scopeLabel = payload.scope === "all" ? "ทุกประเภท" : SECTION_TYPES.find((s) => s.key === payload.scope)?.label || payload.scope;
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 130 }}>
      <div style={{ width: "100%", maxWidth: 420, background: "#fff", borderRadius: 16, padding: 24, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
        <h3 style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 700, color: "#1a1a2e" }}>⚠️ ยืนยันการ Gen งบทั้งปี</h3>
        <div style={{ display: "grid", gap: 6, marginBottom: 16, fontSize: 13, color: "#4b5563" }}>
          <div>ปี: <strong>{year}</strong></div>
          <div>เดือนต้นแบบ: <strong>{payload.sourceMonth}</strong></div>
          <div>ขอบเขต: <strong>{scopeLabel}</strong></div>
          <div>โหมด: <strong>{payload.mode === "fill_empty" ? "เฉพาะช่องที่ยังว่าง" : "เขียนทับทุกช่อง"}</strong></div>
          <div>จำนวนรายการต้นแบบ: <strong>{payload.count}</strong></div>
        </div>
        <div style={{ padding: "10px 12px", borderRadius: 10, background: payload.mode === "overwrite" ? "#fef2f2" : "#eff6ff", border: `1px solid ${payload.mode === "overwrite" ? "#fecaca" : "#bfdbfe"}`, marginBottom: 16, fontSize: 12, color: payload.mode === "overwrite" ? "#b91c1c" : "#1d4ed8" }}>
          {payload.mode === "overwrite" ? "การทำรายการนี้จะเขียนทับงบเดิมของเดือนอื่นที่มีอยู่แล้ว" : "การทำรายการนี้จะเติมเฉพาะช่องที่ยังไม่มีงบหรือเป็น 0 เท่านั้น"}
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: 10, borderRadius: 10, border: "1px solid #dbe2ea", background: "#fff", cursor: "pointer", fontWeight: 600, color: "#6b7280" }}>ยกเลิก</button>
          <button onClick={onConfirm} style={{ flex: 1.4, padding: 10, borderRadius: 10, border: "none", background: "#6366f1", color: "#fff", cursor: "pointer", fontWeight: 700 }}>✅ ยืนยัน</button>
        </div>
      </div>
    </div>
  );
}

function DonutChart({ items, total }) {
  const size = 170; const stroke = 22; const radius = (size - stroke) / 2; const circumference = 2 * Math.PI * radius; let offset = 0;
  if (!items.length || total <= 0) return <div style={{ width: size, height: size, borderRadius: "50%", border: "12px solid #e5e7eb", display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af", fontSize: 12, textAlign: "center" }}>ยังไม่มีงบย่อย</div>;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#eef2f7" strokeWidth={stroke} />
        {items.map((item, index) => { const value = Number(item.planned || 0); const dash = (value / total) * circumference; const circle = <circle key={`${item.label}-${index}`} cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={item.color} strokeWidth={stroke} strokeDasharray={`${dash} ${circumference - dash}`} strokeDashoffset={-offset} />; offset += dash; return circle; })}
      </g>
    </svg>
  );
}

function MainCategoryInsightModal({ open, onClose, record, currency }) {
  if (!open || !record) return null;
  const ratio = record.plannedTotal > 0 ? (record.actualTotal / record.plannedTotal) * 100 : 0;
  const overBudget = record.actualTotal > record.plannedTotal && record.plannedTotal > 0;
  const barColor = overBudget ? "#ef4444" : ratio >= 70 ? "#2563eb" : "#16a34a";
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 110 }}>
      <div style={{ width: "100%", maxWidth: 760, background: "#fff", borderRadius: 18, padding: 24, boxShadow: "0 24px 60px rgba(0,0,0,0.22)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 18 }}><div><h3 style={{ margin: "0 0 6px", fontSize: 18, fontWeight: 800, color: "#1a1a2e" }}>📊 วิเคราะห์หมวดหลัก</h3><p style={{ margin: 0, fontSize: 13, color: "#6b7280" }}>{record.typeLabel} • {record.mainCat} • {record.monthLabel}</p></div><button onClick={onClose} style={{ border: "none", background: "none", cursor: "pointer", fontSize: 22, color: "#6b7280" }}>×</button></div>
        <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 20, alignItems: "start" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}><DonutChart items={record.subRows} total={record.subRows.reduce((s, r) => s + Number(r.planned || 0), 0)} /></div>
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 14 }}>
              <div style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid #dbeafe", background: "#eff6ff" }}><div style={{ fontSize: 10, color: "#6b7280", marginBottom: 4 }}>Budget</div><div style={{ fontSize: 16, fontWeight: 800, color: "#2563eb" }}>{money(record.plannedTotal, currency)}</div></div>
              <div style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid #fee2e2", background: "#fef2f2" }}><div style={{ fontSize: 10, color: "#6b7280", marginBottom: 4 }}>Actual</div><div style={{ fontSize: 16, fontWeight: 800, color: overBudget ? "#ef4444" : "#16a34a" }}>{money(record.actualTotal, currency)}</div></div>
              <div style={{ padding: "10px 12px", borderRadius: 12, border: `1px solid ${overBudget ? "#fecaca" : "#bbf7d0"}`, background: overBudget ? "#fef2f2" : "#f0fdf4" }}><div style={{ fontSize: 10, color: "#6b7280", marginBottom: 4 }}>Budget vs Actual</div><div style={{ fontSize: 16, fontWeight: 800, color: overBudget ? "#ef4444" : "#16a34a" }}>{overBudget ? "⚠️ เกินงบ" : "✅ อยู่ในงบ"}</div></div>
            </div>
            <div style={{ marginBottom: 12 }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}><span style={{ fontSize: 12, color: "#6b7280", fontWeight: 700 }}>Budget Progress</span><span style={{ fontSize: 12, color: barColor, fontWeight: 800 }}>{Math.min(100, Math.round(ratio))}%</span></div><div style={{ background: "#e5e7eb", borderRadius: 999, height: 10, overflow: "hidden" }}><div style={{ width: `${Math.min(100, ratio)}%`, height: "100%", background: barColor, borderRadius: 999 }} /></div></div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BudgetModulePreviewV2() {
  const [config, setConfig] = useState({ profile: { baseCurrency: "THB" }, categories: [] });
  const [transactions, setTransactions] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [selectedYear, setSelectedYear] = useState(String(new Date().getFullYear()));
  const [expanded, setExpanded] = useState({});
  const [editingCell, setEditingCell] = useState(null);
  const [insightCell, setInsightCell] = useState(null);
  const [showGenerateYear, setShowGenerateYear] = useState(false);
  const [pendingGenerate, setPendingGenerate] = useState(null);

  useEffect(() => {
    try {
      const cfg = localStorage.getItem(CONFIG_KEY);
      const tx = localStorage.getItem(TX_KEY);
      const bg = localStorage.getItem(BUDGET_KEY);
      if (cfg) {
        const parsedConfig = JSON.parse(cfg);
        const defaultCategories = getDefaultCategories();
        const mergedConfig = { ...parsedConfig, profile: parsedConfig.profile || { name: "Demo User", baseCurrency: "THB" }, categories: Array.isArray(parsedConfig.categories) && parsedConfig.categories.length > 0 ? parsedConfig.categories : defaultCategories };
        if (!Array.isArray(parsedConfig.categories) || parsedConfig.categories.length === 0) localStorage.setItem(CONFIG_KEY, JSON.stringify(mergedConfig));
        setConfig(mergedConfig);
      } else {
        const sampleConfig = { profile: { name: "Demo User", baseCurrency: "THB" }, categories: getDefaultCategories() };
        localStorage.setItem(CONFIG_KEY, JSON.stringify(sampleConfig));
        setConfig(sampleConfig);
      }
      if (tx) setTransactions(JSON.parse(tx));

      if (bg) {
        const parsedBg = JSON.parse(bg);
        const normalized = [];
        const seen = new Set();
        
        // 🌟 Auto-Heal: กรองข้อมูลผี (Duplicate Data) ทิ้งไปทันทีตั้งแต่โหลด
        parsedBg.forEach(b => {
          const y = String(b.year || new Date().getFullYear());
          const m = String(b.month || "01").padStart(2, '0');
          const type = String(b.type || "expense");
          const main = String(b.mainCat || "").trim();
          const sub = String(b.subCat || "").trim();
          
          const key = `${type}|${main}|${sub}|${y}|${m}`;
          
          if (!seen.has(key)) {
            seen.add(key);
            normalized.push({
              ...b,
              year: y, month: m, type, mainCat: main, subCat: sub,
              plannedAmount: Number(b.plannedAmount !== undefined ? b.plannedAmount : (b.amount || 0))
            });
          }
        });
        setBudgets(normalized);
      }
    } catch (e) { console.error(e); }
  }, []);

  const persist = (next) => { setBudgets(next); localStorage.setItem(BUDGET_KEY, JSON.stringify(next)); };
  const years = useMemo(() => { const yearSet = new Set([...budgets.map((b) => b.year), ...transactions.map((t) => (t.date || "").slice(0, 4)), String(new Date().getFullYear())]); return Array.from(yearSet).filter(Boolean).sort().reverse(); }, [budgets, transactions]);
  const currency = config.profile?.baseCurrency || "THB";
  
  // 🌟 แก้บั๊ก Table View แสดงแต่ค่าเก่าๆ โดยการบังคับให้อ่านตัวใหม่เสมอ (ไล่จากล่าสุดมาเก่าสุด)
  const budgetLookup = useMemo(() => { 
    const map = new Map(); 
    [...budgets].reverse().filter((b) => String(b.year) === String(selectedYear)).forEach((b) => {
      const key = `${b.type}|${(b.mainCat || "").trim()}|${(b.subCat || "").trim()}|${String(b.month).padStart(2,'0')}`;
      map.set(key, b);
    }); 
    return map; 
  }, [budgets, selectedYear]);

  const actualLookup = useMemo(() => { const map = new Map(); transactions.filter((t) => (t.date || "").slice(0, 4) === selectedYear).forEach((t) => { const month = (t.date || "").slice(5, 7); const subKey = `${t.type}|${t.mainCat || ""}|${t.subCat || ""}|${month}`; const mainKey = `${t.type}|${t.mainCat || ""}||${month}`; map.set(subKey, (map.get(subKey) || 0) + Number(t.amount || 0)); map.set(mainKey, (map.get(mainKey) || 0) + Number(t.amount || 0)); }); return map; }, [transactions, selectedYear]);

  const openEditor = ({ type, mainCat, subCat, month }) => {
    const existing = budgetLookup.get(`${type}|${mainCat || ""}|${subCat || ""}|${month}`);
    setEditingCell({ id: existing?.id || genId(), year: selectedYear, month, type, typeLabel: SECTION_TYPES.find((s) => s.key === type)?.label || type, mainCat, subCat, rowLabel: subCat || mainCat || "รวมทั้งหมด", monthLabel: MONTHS.find((m) => m.key === month)?.label || month, plannedAmount: existing?.plannedAmount || 0, note: existing?.note || "", currency });
  };

  const openInsight = ({ type, mainCat, month, subs }) => {
    const directMainBudget = budgetLookup.get(`${type}|${mainCat || ""}||${month}`);
    const subRows = (subs || []).map((sub, index) => {
      const planned = Number(budgetLookup.get(`${type}|${mainCat}|${sub}|${month}`)?.plannedAmount || 0);
      const actual = Number(actualLookup.get(`${type}|${mainCat}|${sub}|${month}`) || 0);
      const colors = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];
      return { label: sub, planned, actual, color: colors[index % colors.length] };
    }).filter((row) => row.planned > 0 || row.actual > 0);
    const subBudgetSum = subRows.reduce((sum, row) => sum + Number(row.planned || 0), 0);
    const plannedTotal = subBudgetSum > 0 ? subBudgetSum : Number(directMainBudget?.plannedAmount || 0);
    const actualTotal = Number(actualLookup.get(`${type}|${mainCat}||${month}`) || 0);
    setInsightCell({ type, typeLabel: SECTION_TYPES.find((s) => s.key === type)?.label || type, mainCat, month, monthLabel: MONTHS.find((m) => m.key === month)?.label || month, plannedTotal, actualTotal, subRows, subRowsTotal: subRows.reduce((sum, row) => sum + Number(row.planned || 0), 0) });
  };

  const saveBudgetCell = (record) => {
    const nextRecord = { 
      id: record.id, year: String(record.year), month: String(record.month).padStart(2,'0'), 
      type: record.type, mainCat: (record.mainCat||"").trim(), subCat: (record.subCat||"").trim(), 
      plannedAmount: Number(record.plannedAmount || 0), currency: record.currency, note: record.note || "" 
    };
    
    // 🌟 ระบบล้างข้อมูลผี: ถ้าเซฟใหม่ ให้ลบของเก่าที่ category ชนกันทิ้งให้หมด ไม่ใช่แค่หา ID ชน
    const filtered = budgets.filter(b => !(
      String(b.year) === nextRecord.year &&
      String(b.month).padStart(2,'0') === nextRecord.month &&
      b.type === nextRecord.type &&
      (b.mainCat || "").trim() === nextRecord.mainCat &&
      (b.subCat || "").trim() === nextRecord.subCat
    ));
    
    const next = [nextRecord, ...filtered];
    persist(next);
    setEditingCell(null);
  };

  const requestGenerateYear = ({ sourceMonth, scope, mode }) => {
    const sourceBudgets = budgets.filter((b) => b.year === selectedYear && b.month === sourceMonth && (scope === "all" ? true : b.type === scope));
    if (!sourceBudgets.length) { setShowGenerateYear(false); return; }
    setShowGenerateYear(false);
    setPendingGenerate({ sourceMonth, scope, mode, count: sourceBudgets.length });
  };

  const confirmGenerateYear = () => {
    if (!pendingGenerate) return;
    const { sourceMonth, scope, mode } = pendingGenerate;
    const sourceBudgets = budgets.filter((b) => b.year === selectedYear && b.month === sourceMonth && (scope === "all" ? true : b.type === scope));
    let next = [...budgets];
    MONTHS.forEach((m) => {
      sourceBudgets.forEach((source) => {
        const existingIndex = next.findIndex((b) => b.year === selectedYear && b.month === m.key && b.type === source.type && (b.mainCat || "") === (source.mainCat || "") && (b.subCat || "") === (source.subCat || ""));
        if (existingIndex >= 0 && mode === "fill_empty" && Number(next[existingIndex].plannedAmount || 0) > 0) return;
        const cloned = { ...source, id: existingIndex >= 0 ? next[existingIndex].id : genId(), month: m.key, year: selectedYear };
        if (existingIndex >= 0) next[existingIndex] = cloned;
        else next.push(cloned);
      });
    });
    persist(next);
    setPendingGenerate(null);
  };

  const totalSummary = useMemo(() => {
    const yearlyBudgets = budgets.filter((b) => String(b.year) === String(selectedYear));
    const annualIncomeBudget = yearlyBudgets.filter((b) => b.type === "income").reduce((s, b) => s + Number(b.plannedAmount || 0), 0);
    const annualExpenseBudget = yearlyBudgets.filter((b) => b.type === "expense").reduce((s, b) => s + Number(b.plannedAmount || 0), 0);
    const annualSavingBudget = yearlyBudgets.filter((b) => b.type === "saving").reduce((s, b) => s + Number(b.plannedAmount || 0), 0);
    const annualInvestmentBudget = yearlyBudgets.filter((b) => b.type === "investment").reduce((s, b) => s + Number(b.plannedAmount || 0), 0);
    return { annualIncomeBudget, annualExpenseBudget, annualSavingBudget, annualInvestmentBudget, expectedLeftover: annualIncomeBudget - annualExpenseBudget - annualSavingBudget - annualInvestmentBudget };
  }, [budgets, selectedYear]);

  const typeActualStats = useMemo(() => {
    const byType = {};
    SECTION_TYPES.forEach((section) => {
      const txs = transactions.filter((t) => (t.date || "").slice(0, 4) === String(selectedYear) && t.type === section.key);
      const annualActual = txs.reduce((s, t) => s + Number(t.amount || 0), 0);
      const monthsWithActual = new Set(txs.map((t) => (t.date || "").slice(5, 7))).size;
      byType[section.key] = { annualActual, avgMonthlyActual: monthsWithActual > 0 ? annualActual / monthsWithActual : 0 };
    });
    return byType;
  }, [transactions, selectedYear]);

  const toggleExpand = (type, main) => setExpanded((prev) => ({ ...prev, [`${type}|${main}`]: !prev[`${type}|${main}`] }));
  const trees = useMemo(() => Object.fromEntries(SECTION_TYPES.map((section) => [section.key, buildBudgetTree(config.categories || [], section.key)])), [config.categories]);

  return (
    <div style={{ fontFamily: "'Noto Sans Thai','Sarabun',sans-serif", minHeight: "100vh", background: "#f8f9fb" }}>
      <div style={{ background: "linear-gradient(135deg,#1a1a2e,#16213e,#0f3460)", padding: "18px 20px 14px" }}>
        <div style={{ maxWidth: 1380, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <div><div style={{ display: "flex", alignItems: "center", gap: 10 }}><div style={{ width: 32, height: 32, borderRadius: 9, background: "#6366f1", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15 }}>🎯</div><span style={{ fontSize: 19, fontWeight: 800, color: "#fff" }}>FinFlow</span><span style={{ fontSize: 10, padding: "2px 7px", background: "rgba(255,255,255,0.12)", borderRadius: 99, color: "rgba(255,255,255,0.75)" }}>BUDGET TABLE V2</span></div><p style={{ margin: "4px 0 0 42px", fontSize: 11, color: "rgba(255,255,255,0.55)" }}>ตารางงบประมาณรายปีแบบเห็นครบ 12 เดือน</p></div>
            <div style={{ display: "flex", gap: 8, alignItems: "end", flexWrap: "wrap" }}><button onClick={() => setShowGenerateYear(true)} style={{ padding: "8px 12px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.12)", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>🪄 Gen งบทั้งปี</button><FancySelect label="ปี" value={selectedYear} onChange={setSelectedYear} options={years} /></div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1380, margin: "0 auto", padding: "18px 14px 40px" }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
          {[{ label: "งบรายรับทั้งปี", value: totalSummary.annualIncomeBudget, color: "#22c55e" }, { label: "งบรายจ่ายทั้งปี", value: totalSummary.annualExpenseBudget, color: "#ef4444" }, { label: "เงินที่คาดว่าจะเหลือเก็บทั้งปี", value: totalSummary.expectedLeftover, color: totalSummary.expectedLeftover >= 0 ? "#3b82f6" : "#ef4444" }].map((c) => <div key={c.label} style={{ minWidth: 160, background: "#fff", borderRadius: 12, border: `1px solid ${c.color}30`, padding: "9px 12px" }}><div style={{ fontSize: 10, color: "#9ca3af", marginBottom: 3 }}>{c.label}</div><div style={{ fontSize: 14, fontWeight: 800, color: c.color }}>{money(c.value, currency)}</div></div>)}
        </div>

        <div style={{ display: "grid", gap: 18 }}>
          {SECTION_TYPES.map((section) => {
            const tree = trees[section.key] || [];
            const stats = typeActualStats[section.key] || { annualActual: 0, avgMonthlyActual: 0 };
            return (
              <div key={section.key} style={{ background: "#fff", borderRadius: 16, border: "1px solid #e5e7eb", overflow: "hidden" }}>
                <div style={{ padding: "12px 16px", borderBottom: `2px solid ${section.color}22`, background: `${section.color}10`, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}><div style={{ width: 9, height: 9, borderRadius: 999, background: section.color }} /><h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: "#1a1a2e" }}>{section.label}</h3></div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}><Badge color={section.color}>{section.label}ทั้งปี {money(stats.annualActual, currency)}</Badge><Badge color="#2563eb">เฉลี่ยต่อเดือน {money(stats.avgMonthlyActual, currency)}</Badge><Badge color={section.color}>{tree.length} หมวดหลัก</Badge></div>
                </div>
                <table style={{ width: "100%", tableLayout: "fixed", borderCollapse: "collapse" }}>
                  <colgroup><col style={{ width: "16%" }} />{MONTHS.map((m) => <col key={m.key} style={{ width: "7%" }} />)}</colgroup>
                  <thead><tr><th style={{ textAlign: "left", padding: "10px 10px", borderBottom: "1px solid #eef2f7", fontSize: 11, color: "#6b7280", background: "#fafbfc" }}>หมวดหมู่</th>{MONTHS.map((m) => <th key={m.key} style={{ textAlign: "center", padding: "10px 4px", borderBottom: "1px solid #eef2f7", fontSize: 11, color: "#6b7280", background: "#fafbfc" }}>{m.label}</th>)}</tr></thead>
                  <tbody>
                    {tree.map((node) => {
                      const isOpen = !!expanded[`${section.key}|${node.main}`];
                      return <React.Fragment key={`${section.key}|${node.main}`}>
                        <tr>
                          <td style={{ padding: "10px 10px", borderBottom: "1px solid #f3f5f8", verticalAlign: "top" }}><button onClick={() => toggleExpand(section.key, node.main)} style={{ border: "none", background: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, padding: 0, fontWeight: 800, fontSize: 12, color: "#1a1a2e" }}><span style={{ color: section.color }}>{isOpen ? "▾" : "▸"}</span><span>{node.main}</span></button></td>
                          {MONTHS.map((m) => {
                            const directMainBudget = budgetLookup.get(`${section.key}|${node.main}||${m.key}`);
                            const subBudgetSum = node.subs.reduce((sum, sub) => sum + Number(budgetLookup.get(`${section.key}|${node.main}|${sub}|${m.key}`)?.plannedAmount || 0), 0);
                            const plannedForMain = subBudgetSum > 0 ? subBudgetSum : Number(directMainBudget?.plannedAmount || 0);
                            const actual = actualLookup.get(`${section.key}|${node.main}||${m.key}`) || 0;
                            return <td key={m.key} style={{ padding: 4, borderBottom: "1px solid #f3f5f8", verticalAlign: "top" }}><button onClick={() => openInsight({ type: section.key, mainCat: node.main, month: m.key, subs: node.subs })} style={{ width: "100%", border: "1px solid #eef2f7", background: "#fff", borderRadius: 8, padding: "6px 6px", cursor: "pointer", textAlign: "left" }}><CellProgress planned={plannedForMain} actual={actual} type={section.key} /><div style={{ marginTop: 4, fontSize: 9, color: actual > plannedForMain && plannedForMain > 0 ? "#ef4444" : "#6b7280", fontWeight: 700 }}>{actual > plannedForMain && plannedForMain > 0 ? "⚠️ เกินงบ" : "ดูสัดส่วน"}</div></button></td>;
                          })}
                        </tr>
                        {isOpen && node.subs.map((sub) => <tr key={`${section.key}|${node.main}|${sub}`}><td style={{ padding: "8px 10px 8px 28px", borderBottom: "1px solid #f7f8fb", background: "#fcfcfd", fontSize: 11, color: "#4b5563", fontWeight: 600 }}>└ {sub}</td>{MONTHS.map((m) => { const budget = budgetLookup.get(`${section.key}|${node.main}|${sub}|${m.key}`); const actual = actualLookup.get(`${section.key}|${node.main}|${sub}|${m.key}`) || 0; return <td key={m.key} style={{ padding: 4, borderBottom: "1px solid #f7f8fb", background: "#fcfcfd", verticalAlign: "top" }}><button onClick={() => openEditor({ type: section.key, mainCat: node.main, subCat: sub, month: m.key })} style={{ width: "100%", border: "1px solid #eef2f7", background: "#fff", borderRadius: 8, padding: "6px 6px", cursor: "pointer", textAlign: "left" }}><CellProgress planned={budget?.plannedAmount || 0} actual={actual} type={section.key} /></button></td>; })}</tr>)}
                      </React.Fragment>;
                    })}
                  </tbody>
                </table>
              </div>)
          })}
        </div>
      </div>

      <BudgetEditModal open={!!editingCell} record={editingCell} currency={currency} onClose={() => setEditingCell(null)} onSave={saveBudgetCell} />
      <MainCategoryInsightModal open={!!insightCell} record={insightCell} currency={currency} onClose={() => setInsightCell(null)} />
      <GenerateYearModal open={showGenerateYear} year={selectedYear} onClose={() => setShowGenerateYear(false)} onConfirm={requestGenerateYear} />
      <ConfirmGenerateModal open={!!pendingGenerate} payload={pendingGenerate} year={selectedYear} onClose={() => setPendingGenerate(null)} onConfirm={confirmGenerateYear} />
    </div>
  );
}