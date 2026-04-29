import { useState, useEffect, useMemo } from "react";

// ─── Constants ────────────────────────────────────────────────────────────────
const CONFIG_KEY = "finapp_config";
const RECURRING_KEY = "finapp_recurring";
const TX_KEY = "finapp_transactions";

const TYPE_COLORS = {
  income: "#22c55e", expense: "#ef4444",
  saving: "#3b82f6", investment: "#f59e0b", debt: "#ec4899",
};
const TYPE_LABELS = {
  income: "รายได้", expense: "รายจ่าย",
  saving: "ออม", investment: "ลงทุน", debt: "หนี้",
};
const TYPE_ICONS = {
  income: "↑", expense: "↓", saving: "🏦", investment: "📈", debt: "💳",
};
const CURRENCIES = ["THB", "USD", "EUR", "JPY", "GBP", "SGD", "CNY"];

const FREQ_OPTIONS = [
  { value: "weekly",     label: "ทุกสัปดาห์",  days: 7 },
  { value: "biweekly",  label: "ทุก 2 สัปดาห์", days: 14 },
  { value: "monthly",   label: "ทุกเดือน",     days: 30 },
  { value: "quarterly", label: "ทุก 3 เดือน",  days: 90 },
  { value: "biannual",  label: "ทุก 6 เดือน",  days: 180 },
  { value: "yearly",    label: "ทุกปี",        days: 365 },
];

const CATEGORY_ICONS = {
  "ที่พักอาศัย": "🏠", "อาหาร": "🍜", "การเดินทาง": "🚗",
  "สุขภาพ": "💊", "ความบันเทิง": "🎮", "การศึกษา": "📚",
  "เงินเดือน": "💼", "Freelance": "💻", "การลงทุน": "📈",
  "เงินออม": "🏦", "หนี้สิน": "💳",
};

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}
function today() { return new Date().toISOString().slice(0, 10); }

// ─── helpers ──────────────────────────────────────────────────────────────────
function nextDueDate(rec) {
  const freq = FREQ_OPTIONS.find(f => f.value === rec.frequency);
  if (!freq || !rec.startDate) return null;
  const start = new Date(rec.startDate + "T00:00:00");
  const now = new Date(); now.setHours(0, 0, 0, 0);
  if (start > now) return rec.startDate;
  let d = new Date(start);
  while (d <= now) d.setDate(d.getDate() + freq.days);
  return d.toISOString().slice(0, 10);
}

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const diff = new Date(dateStr + "T00:00:00") - new Date(today() + "T00:00:00");
  return Math.round(diff / 86400000);
}

function statusBadge(rec) {
  if (!rec.active) return { label: "หยุดชั่วคราว", color: "#9ca3af" };
  if (rec.endDate && rec.endDate < today()) return { label: "หมดอายุ", color: "#ef4444" };
  const d = daysUntil(nextDueDate(rec));
  if (d === 0) return { label: "ครบกำหนดวันนี้!", color: "#ef4444" };
  if (d <= 3) return { label: `อีก ${d} วัน`, color: "#f59e0b" };
  if (d <= 7) return { label: `อีก ${d} วัน`, color: "#6366f1" };
  return { label: `อีก ${d} วัน`, color: "#9ca3af" };
}

// ─── Shared UI ────────────────────────────────────────────────────────────────
function FancySelect({ label, value, onChange, options, placeholder = "เลือก...", disabled }) {
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      {label && <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 4, letterSpacing: "0.04em", textTransform: "uppercase" }}>{label}</label>}
      <select value={value} onChange={e => onChange(e.target.value)} disabled={disabled}
        style={{
          width: "100%", padding: "9px 28px 9px 12px", borderRadius: 8, border: "1.5px solid #e5e7eb",
          fontSize: 13, background: disabled ? "#f9fafb" : "#fff", fontFamily: "inherit",
          cursor: disabled ? "not-allowed" : "pointer", outline: "none", appearance: "none",
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath d='M2 4l4 4 4-4' fill='none' stroke='%239ca3af' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E")`,
          backgroundRepeat: "no-repeat", backgroundPosition: "right 10px center",
          color: value ? "#1a1a2e" : "#9ca3af",
        }}>
        <option value="">{placeholder}</option>
        {options.map(o => <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>)}
      </select>
    </div>
  );
}

function FancyInput({ label, value, onChange, type = "text", placeholder, prefix }) {
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      {label && <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 4, letterSpacing: "0.04em", textTransform: "uppercase" }}>{label}</label>}
      <div style={{ position: "relative" }}>
        {prefix && <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 12, color: "#9ca3af" }}>{prefix}</span>}
        <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
          style={{
            width: "100%", padding: prefix ? "9px 12px 9px 28px" : "9px 12px",
            borderRadius: 8, border: "1.5px solid #e5e7eb", fontSize: 13,
            fontFamily: "inherit", outline: "none", boxSizing: "border-box", background: "#fff",
          }} />
      </div>
    </div>
  );
}

function Toggle({ value, onChange, label }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <button onClick={() => onChange(!value)} style={{
        width: 44, height: 24, borderRadius: 99, border: "none", cursor: "pointer",
        background: value ? "#22c55e" : "#d1d5db", transition: "background 0.2s",
        position: "relative", padding: 0, flexShrink: 0,
      }}>
        <span style={{
          position: "absolute", top: 3, left: value ? 23 : 3,
          width: 18, height: 18, borderRadius: "50%", background: "#fff",
          transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
        }} />
      </button>
      {label && <span style={{ fontSize: 13, color: "#374151" }}>{label}</span>}
    </div>
  );
}

// ─── Recurring Form ───────────────────────────────────────────────────────────
const EMPTY_FORM = {
  name: "", type: "", mainCat: "", subCat: "",
  frequency: "monthly", amount: "", currency: "THB",
  startDate: today(), endDate: "", account: "",
  paidBy: "self", active: true, remark: "",
};

function RecurringForm({ config, onSave, editing, onCancel }) {
  const [form, setForm] = useState(editing || { ...EMPTY_FORM, currency: config.profile?.baseCurrency || "THB" });
  const [errors, setErrors] = useState({});

  useEffect(() => { if (editing) setForm(editing); }, [editing]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const showPaidBy = form.type === "expense" || form.type === "debt";

  const mainCats = useMemo(() => {
    if (!form.type) return [];
    const seen = new Set();
    return config.categories
      .filter(c => c.type === form.type && c.main)
      .filter(c => { if (seen.has(c.main)) return false; seen.add(c.main); return true; })
      .map(c => c.main);
  }, [form.type, config.categories]);

  const subCats = useMemo(() => {
    if (!form.mainCat) return [];
    return config.categories
      .filter(c => c.type === form.type && c.main === form.mainCat && c.sub)
      .map(c => c.sub);
  }, [form.type, form.mainCat, config.categories]);

  const paidByOptions = [
    { value: "self", label: "ฉันเอง" },
    ...config.people.map(p => ({ value: p.id, label: p.name })),
    { value: "shared", label: "ร่วมกันจ่าย" },
  ];

  const validate = () => {
    const e = {};
    if (!form.name) e.name = true;
    if (!form.type) e.type = true;
    if (!form.amount || isNaN(parseFloat(form.amount))) e.amount = true;
    if (!form.startDate) e.startDate = true;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    onSave({ ...form, id: form.id || genId(), amount: parseFloat(form.amount) });
    if (!editing) setForm({ ...EMPTY_FORM, currency: config.profile?.baseCurrency || "THB" });
    setErrors({});
  };

  const typeColor = TYPE_COLORS[form.type] || "#6366f1";

  return (
    <div style={{
      background: "#fff", borderRadius: 16,
      border: editing ? "2px solid #f59e0b" : "1.5px solid #e5e7eb",
      overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", marginBottom: 20,
    }}>
      <div style={{
        background: editing ? "#fffbeb" : "linear-gradient(135deg,#1a1a2e,#16213e)",
        padding: "14px 20px", display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <span style={{ fontWeight: 700, fontSize: 14, color: editing ? "#92400e" : "#fff" }}>
          {editing ? "✏️ แก้ไขรายการประจำ" : "➕ เพิ่มรายการประจำ"}
        </span>
        {editing && <button onClick={onCancel} style={{ background: "none", border: "none", cursor: "pointer", color: "#92400e", fontSize: 20 }}>×</button>}
      </div>

      <div style={{ padding: "20px 20px 16px" }}>
        {/* Row 1: ชื่อ + ประเภท */}
        <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
          <FancyInput label="ชื่อรายการ" value={form.name} onChange={v => set("name", v)}
            placeholder="เช่น Netflix, ค่าเช่า, เงินเดือน" />
          <div style={{ flex: 1 }}>
            <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 4, letterSpacing: "0.04em", textTransform: "uppercase" }}>ประเภท</label>
            <div style={{ display: "flex", gap: 4 }}>
              {Object.entries(TYPE_LABELS).map(([k, v]) => (
                <button key={k} onClick={() => {
                  set("type", k); set("mainCat", ""); set("subCat", "");
                  if (k !== "expense" && k !== "debt") set("paidBy", "self");
                }} style={{
                  flex: 1, padding: "8px 4px", borderRadius: 8, fontSize: 11, fontWeight: 600,
                  border: `1.5px solid ${form.type === k ? TYPE_COLORS[k] : "#e5e7eb"}`,
                  background: form.type === k ? TYPE_COLORS[k] + "15" : "#fff",
                  color: form.type === k ? TYPE_COLORS[k] : "#9ca3af",
                  cursor: "pointer", transition: "all 0.15s",
                }}>{v}</button>
              ))}
            </div>
          </div>
        </div>

        {/* Row 2: หมวดหมู่ */}
        <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
          <FancySelect label="หมวดหลัก" value={form.mainCat}
            onChange={v => { set("mainCat", v); set("subCat", ""); }}
            options={mainCats} placeholder="เลือกหมวดหลัก..." disabled={!form.type} />
          <FancySelect label="หมวดย่อย" value={form.subCat}
            onChange={v => set("subCat", v)}
            options={subCats} placeholder="เลือกหมวดย่อย..." disabled={!form.mainCat} />
        </div>

        {/* Row 3: จำนวนเงิน + สกุลเงิน + บัญชี */}
        <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
          <FancyInput label="จำนวนเงิน" type="number" value={form.amount}
            onChange={v => set("amount", v)} placeholder="0.00"
            prefix={form.currency === "THB" ? "฿" : "$"} />
          <FancySelect label="สกุลเงิน" value={form.currency}
            onChange={v => set("currency", v)} options={CURRENCIES} />
          <FancySelect label="บัญชี" value={form.account}
            onChange={v => set("account", v)}
            options={config.accounts.map(a => ({ value: a.id, label: a.name }))}
            placeholder="เลือกบัญชี..." />
        </div>

        {/* Row 4: ความถี่ + วันเริ่ม + วันสิ้นสุด */}
        <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
          <FancySelect label="ความถี่" value={form.frequency}
            onChange={v => set("frequency", v)}
            options={FREQ_OPTIONS.map(f => ({ value: f.value, label: f.label }))} />
          <FancyInput label="วันที่ชำระครั้งแรก" type="date" value={form.startDate}
            onChange={v => set("startDate", v)} />
          <FancyInput label="วันสิ้นสุด (ถ้ามี)" type="date" value={form.endDate}
            onChange={v => set("endDate", v)} />
        </div>

        {/* Row 5: ผู้จ่าย (expense/debt) + หมายเหตุ + Active */}
        <div style={{ display: "flex", gap: 12, marginBottom: 16, alignItems: "flex-end" }}>
          {showPaidBy && (
            <FancySelect label="ผู้จ่าย" value={form.paidBy}
              onChange={v => set("paidBy", v)} options={paidByOptions} placeholder="ผู้จ่าย..." />
          )}
          <FancyInput label="หมายเหตุ" value={form.remark}
            onChange={v => set("remark", v)} placeholder="รายละเอียด..." />
          <div style={{ flexShrink: 0, paddingBottom: 2 }}>
            <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 8, letterSpacing: "0.04em", textTransform: "uppercase" }}>สถานะ</label>
            <Toggle value={form.active} onChange={v => set("active", v)} label={form.active ? "เปิดใช้" : "หยุด"} />
          </div>
        </div>

        {Object.keys(errors).length > 0 && (
          <div style={{ padding: "8px 12px", background: "#fef2f2", borderRadius: 8, border: "1px solid #fecaca", marginBottom: 12 }}>
            <p style={{ margin: 0, fontSize: 12, color: "#dc2626" }}>
              ⚠️ กรุณากรอก: {[errors.name && "ชื่อรายการ", errors.type && "ประเภท", errors.amount && "จำนวนเงิน", errors.startDate && "วันเริ่ม"].filter(Boolean).join(", ")}
            </p>
          </div>
        )}

        <button onClick={handleSave} style={{
          width: "100%", padding: "11px 0",
          background: editing ? "#f59e0b" : typeColor || "#6366f1",
          color: "#fff", border: "none", borderRadius: 10,
          fontSize: 14, fontWeight: 700, cursor: "pointer",
        }}>
          {editing ? "💾 บันทึกการแก้ไข" : "✅ เพิ่มรายการประจำ"}
        </button>
      </div>
    </div>
  );
}

// ─── Summary Cards ────────────────────────────────────────────────────────────
function SummaryCards({ recurring }) {
  const active = recurring.filter(r => r.active && !(r.endDate && r.endDate < today()));

  const monthly = { income: 0, expense: 0, saving: 0, investment: 0, debt: 0 };
  active.forEach(r => {
    const freq = FREQ_OPTIONS.find(f => f.value === r.frequency);
    if (!freq) return;
    const timesPerMonth = 30 / freq.days;
    const amt = (r.amount || 0) * timesPerMonth;
    if (monthly[r.type] !== undefined) monthly[r.type] += amt;
  });

  const dueThisWeek = active.filter(r => {
    const d = daysUntil(nextDueDate(r));
    return d !== null && d >= 0 && d <= 7;
  }).length;

  const fmt = (n) => Math.round(n).toLocaleString("th-TH");

  const cards = [
    { label: "รายได้/เดือน", value: fmt(monthly.income), color: "#22c55e", icon: "↑" },
    { label: "รายจ่าย/เดือน", value: fmt(monthly.expense + monthly.debt), color: "#ef4444", icon: "↓" },
    { label: "ออม+ลงทุน/เดือน", value: fmt(monthly.saving + monthly.investment), color: "#3b82f6", icon: "🏦" },
    { label: "ครบกำหนดสัปดาห์นี้", value: dueThisWeek, color: "#f59e0b", icon: "⏰" },
    { label: "รายการทั้งหมด", value: active.length, color: "#6366f1", icon: "📋" },
  ];

  return (
    <div style={{ display: "flex", gap: 8, marginBottom: 16, overflowX: "auto", paddingBottom: 4 }}>
      {cards.map(c => (
        <div key={c.label} style={{
          flex: "0 0 auto", minWidth: 110, background: "#fff",
          borderRadius: 12, border: `1.5px solid ${c.color}30`, padding: "10px 14px",
        }}>
          <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 3 }}>{c.label}</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: c.color }}>
            {c.icon} {c.value}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Recurring Card ───────────────────────────────────────────────────────────
function RecurringCard({ rec, config, onEdit, onDelete, onToggle, onPostNow }) {
  const [confirm, setConfirm] = useState(false);
  const color = TYPE_COLORS[rec.type] || "#6b7280";
  const account = config.accounts.find(a => a.id === rec.account);
  const freq = FREQ_OPTIONS.find(f => f.value === rec.frequency);
  const next = nextDueDate(rec);
  const badge = statusBadge(rec);
  const catIcon = CATEGORY_ICONS[rec.mainCat] || TYPE_ICONS[rec.type] || "📌";
  const isExpired = rec.endDate && rec.endDate < today();
  const currSym = rec.currency === "THB" ? "฿" : rec.currency === "USD" ? "$" : rec.currency;

  return (
    <div style={{
      background: "#fff", borderRadius: 14,
      border: `1.5px solid ${rec.active && !isExpired ? color + "30" : "#f3f4f6"}`,
      padding: "14px 16px", opacity: rec.active && !isExpired ? 1 : 0.6,
      transition: "all 0.15s",
    }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = "0 2px 10px rgba(0,0,0,0.07)"}
      onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        {/* Icon */}
        <div style={{
          width: 42, height: 42, borderRadius: 12, flexShrink: 0,
          background: color + "15", display: "flex", alignItems: "center",
          justifyContent: "center", fontSize: 20,
        }}>{catIcon}</div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{ fontWeight: 700, fontSize: 14, color: "#1a1a2e" }}>{rec.name}</span>
            <span style={{
              padding: "2px 8px", borderRadius: 99, fontSize: 10, fontWeight: 600,
              background: badge.color + "18", color: badge.color, border: `1px solid ${badge.color}33`,
            }}>{badge.label}</span>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 12, color: "#6b7280" }}>
              {catIcon !== TYPE_ICONS[rec.type] ? rec.mainCat : TYPE_LABELS[rec.type]}
              {rec.subCat ? ` › ${rec.subCat}` : ""}
            </span>
            <span style={{ fontSize: 12, color: "#9ca3af" }}>·</span>
            <span style={{ fontSize: 12, color: "#6b7280" }}>{freq?.label || rec.frequency}</span>
            {account && (
              <>
                <span style={{ fontSize: 12, color: "#9ca3af" }}>·</span>
                <span style={{ fontSize: 12, color: "#6b7280", display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: account.color || "#6366f1", display: "inline-block" }} />
                  {account.name}
                </span>
              </>
            )}
          </div>

          <div style={{ display: "flex", gap: 12, fontSize: 11, color: "#9ca3af" }}>
            <span>เริ่ม {rec.startDate}</span>
            {rec.endDate && <span>สิ้นสุด {rec.endDate}</span>}
            {next && rec.active && <span style={{ color: daysUntil(next) <= 3 ? "#f59e0b" : "#9ca3af" }}>ครั้งถัดไป {next}</span>}
          </div>
        </div>

        {/* Amount */}
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ fontWeight: 800, fontSize: 16, color }}>
            {rec.type === "income" ? "+" : rec.type === "expense" || rec.type === "debt" ? "-" : ""}
            {currSym}{(rec.amount || 0).toLocaleString("th-TH", { maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: 10, color: "#9ca3af" }}>{rec.currency} / {freq?.label?.replace("ทุก", "").trim() || ""}</div>
        </div>
      </div>

      {/* Action bar */}
      <div style={{ display: "flex", gap: 6, marginTop: 12, paddingTop: 10, borderTop: "1px solid #f9fafb", alignItems: "center" }}>
        <Toggle value={rec.active} onChange={() => onToggle(rec.id)} label="" />
        <span style={{ fontSize: 11, color: "#9ca3af", marginRight: "auto" }}>{rec.active ? "เปิดใช้งาน" : "หยุดชั่วคราว"}</span>

        {rec.active && !isExpired && (
          <button onClick={() => onPostNow(rec)} style={{
            padding: "5px 12px", borderRadius: 8, fontSize: 11, fontWeight: 600,
            background: "#f0fdf4", border: "1.5px solid #bbf7d0", color: "#15803d", cursor: "pointer",
          }}>⚡ บันทึกเลย</button>
        )}
        <button onClick={() => onEdit(rec)} style={{
          width: 30, height: 30, borderRadius: 7, background: "#f9fafb",
          border: "1.5px solid #e5e7eb", cursor: "pointer", fontSize: 13,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>✏️</button>
        {confirm ? (
          <button onClick={() => { onDelete(rec.id); setConfirm(false); }} style={{
            padding: "5px 12px", borderRadius: 7, background: "#fef2f2",
            border: "1.5px solid #fecaca", cursor: "pointer", fontSize: 11,
            fontWeight: 700, color: "#dc2626",
          }}>ยืนยันลบ</button>
        ) : (
          <button onClick={() => setConfirm(true)} style={{
            width: 30, height: 30, borderRadius: 7, background: "#f9fafb",
            border: "1.5px solid #e5e7eb", cursor: "pointer", fontSize: 13,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>🗑️</button>
        )}
      </div>
    </div>
  );
}

// ─── Post Now Modal ───────────────────────────────────────────────────────────
function PostNowModal({ rec, config, onConfirm, onClose }) {
  const [date, setDate] = useState(today());
  const [amount, setAmount] = useState(String(rec.amount));
  const freq = FREQ_OPTIONS.find(f => f.value === rec.frequency);

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 16,
    }}>
      <div style={{
        background: "#fff", borderRadius: 16, padding: "24px", maxWidth: 400, width: "100%",
        boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
      }}>
        <h3 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 700, color: "#1a1a2e" }}>⚡ บันทึก Transaction เลย</h3>
        <p style={{ margin: "0 0 20px", fontSize: 13, color: "#6b7280" }}>
          จาก: <strong>{rec.name}</strong> · {freq?.label}
        </p>

        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 4, letterSpacing: "0.04em", textTransform: "uppercase" }}>วันที่</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1.5px solid #e5e7eb", fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
        </div>
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 4, letterSpacing: "0.04em", textTransform: "uppercase" }}>จำนวนเงิน</label>
          <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
            style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1.5px solid #e5e7eb", fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onClose} style={{
            flex: 1, padding: "10px", borderRadius: 10, border: "1.5px solid #e5e7eb",
            background: "#fff", fontSize: 13, fontWeight: 600, color: "#6b7280", cursor: "pointer",
          }}>ยกเลิก</button>
          <button onClick={() => onConfirm({ date, amount: parseFloat(amount) })} style={{
            flex: 2, padding: "10px", borderRadius: 10, border: "none",
            background: TYPE_COLORS[rec.type] || "#6366f1",
            fontSize: 13, fontWeight: 700, color: "#fff", cursor: "pointer",
          }}>✅ บันทึก Transaction</button>
        </div>
      </div>
    </div>
  );
}

// ─── Upcoming Timeline ────────────────────────────────────────────────────────
function UpcomingTimeline({ recurring }) {
  const active = recurring.filter(r => r.active && !(r.endDate && r.endDate < today()));

  const upcoming = active
    .map(r => ({ ...r, next: nextDueDate(r), days: daysUntil(nextDueDate(r)) }))
    .filter(r => r.days !== null && r.days >= 0 && r.days <= 30)
    .sort((a, b) => a.days - b.days);

  if (upcoming.length === 0) return null;

  return (
    <div style={{ background: "#fff", borderRadius: 14, border: "1.5px solid #e5e7eb", padding: "16px 18px", marginBottom: 16 }}>
      <h3 style={{ margin: "0 0 14px", fontSize: 14, fontWeight: 700, color: "#1a1a2e" }}>📅 ครบกำหนดใน 30 วัน</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {upcoming.map(r => {
          const color = TYPE_COLORS[r.type] || "#6b7280";
          const urgency = r.days === 0 ? "#ef4444" : r.days <= 3 ? "#f59e0b" : r.days <= 7 ? "#6366f1" : "#9ca3af";
          const currSym = r.currency === "THB" ? "฿" : r.currency;
          return (
            <div key={r.id} style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "8px 12px", borderRadius: 10,
              background: urgency + "0D", border: `1px solid ${urgency}22`,
            }}>
              <div style={{ width: 36, textAlign: "center", flexShrink: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: urgency }}>{r.days}</div>
                <div style={{ fontSize: 9, color: urgency, fontWeight: 600, lineHeight: 1 }}>วัน</div>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 13, color: "#1a1a2e", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</div>
                <div style={{ fontSize: 11, color: "#9ca3af" }}>{r.next}</div>
              </div>
              <div style={{ fontWeight: 700, fontSize: 14, color, flexShrink: 0 }}>
                {currSym}{(r.amount || 0).toLocaleString("th-TH", { maximumFractionDigits: 0 })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function RecurringPage() {
  const [config, setConfig] = useState({ profile: { baseCurrency: "THB" }, accounts: [], categories: [], goals: [], people: [] });
  const [recurring, setRecurring] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [postTarget, setPostTarget] = useState(null);
  const [filterType, setFilterType] = useState("");
  const [filterActive, setFilterActive] = useState("all");
  const [view, setView] = useState("list"); // list | timeline

  useEffect(() => {
    try {
      const cfg = localStorage.getItem(CONFIG_KEY);
      if (cfg) setConfig(JSON.parse(cfg));
      const rc = localStorage.getItem(RECURRING_KEY);
      if (rc) setRecurring(JSON.parse(rc));
      const tx = localStorage.getItem(TX_KEY);
      if (tx) setTransactions(JSON.parse(tx));
    } catch (e) {}
  }, []);

  const saveRecurring = (data) => {
    setRecurring(data);
    try { localStorage.setItem(RECURRING_KEY, JSON.stringify(data)); } catch (e) {}
  };

  const saveTx = (data) => {
    setTransactions(data);
    try { localStorage.setItem(TX_KEY, JSON.stringify(data)); } catch (e) {}
  };

  const handleSave = (rec) => {
    const idx = recurring.findIndex(r => r.id === rec.id);
    const next = idx >= 0 ? recurring.map(r => r.id === rec.id ? rec : r) : [rec, ...recurring];
    saveRecurring(next);
    setEditing(null);
    setShowForm(false);
  };

  const handleDelete = (id) => saveRecurring(recurring.filter(r => r.id !== id));
  const handleToggle = (id) => saveRecurring(recurring.map(r => r.id === id ? { ...r, active: !r.active } : r));

  const handlePostNow = (rec) => setPostTarget(rec);

  const handlePostConfirm = ({ date, amount }) => {
    if (!postTarget) return;
    const tx = {
      id: genId(), date, type: postTarget.type,
      mainCat: postTarget.mainCat, subCat: postTarget.subCat,
      account: postTarget.account, amount, currency: postTarget.currency,
      paidBy: postTarget.paidBy || "self",
      remark: `[Recurring] ${postTarget.name}`, createdAt: Date.now(),
    };
    saveTx([tx, ...transactions]);
    setPostTarget(null);
  };

  // Filter
  const filtered = useMemo(() => {
    return recurring.filter(r => {
      if (filterType && r.type !== filterType) return false;
      const expired = r.endDate && r.endDate < today();
      if (filterActive === "active" && (!r.active || expired)) return false;
      if (filterActive === "inactive" && r.active && !expired) return false;
      if (filterActive === "expired" && !expired) return false;
      return true;
    });
  }, [recurring, filterType, filterActive]);

  const Pill = ({ active, onClick, color, children }) => (
    <button onClick={onClick} style={{
      padding: "5px 14px", borderRadius: 99, fontSize: 12, fontWeight: 500,
      border: `1.5px solid ${active ? color : "#e5e7eb"}`,
      background: active ? color + "15" : "#fff",
      color: active ? color : "#9ca3af",
      cursor: "pointer", transition: "all 0.15s", whiteSpace: "nowrap",
    }}>{children}</button>
  );

  return (
    <div style={{ fontFamily: "'Noto Sans Thai','Sarabun',sans-serif", minHeight: "100vh", background: "#f8f9fb" }}>

      {/* Header */}
      <div style={{ background: "linear-gradient(135deg,#1a1a2e,#16213e,#0f3460)", padding: "20px 20px 16px" }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 34, height: 34, borderRadius: 9, background: "#6366f1", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>💎</div>
                <span style={{ fontSize: 20, fontWeight: 800, color: "#fff", letterSpacing: "-0.5px" }}>FinFlow</span>
                <span style={{ fontSize: 11, padding: "2px 8px", background: "rgba(255,255,255,0.12)", borderRadius: 99, color: "rgba(255,255,255,0.7)", letterSpacing: "0.05em" }}>RECURRING</span>
              </div>
              <p style={{ margin: "4px 0 0 44px", fontSize: 12, color: "rgba(255,255,255,0.5)" }}>
                รายการประจำ {recurring.filter(r => r.active).length} รายการที่ใช้งาน
              </p>
            </div>
            <button onClick={() => { setEditing(null); setShowForm(s => !s); }} style={{
              padding: "9px 18px", background: showForm ? "#374151" : "#6366f1",
              color: "#fff", border: "none", borderRadius: 10,
              fontSize: 13, fontWeight: 700, cursor: "pointer",
            }}>
              {showForm ? "✕ ซ่อนฟอร์ม" : "+ เพิ่มรายการ"}
            </button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "20px 16px 60px" }}>

        {/* Form */}
        {(showForm || editing) && (
          <RecurringForm config={config} onSave={handleSave} editing={editing}
            onCancel={() => { setEditing(null); setShowForm(false); }} />
        )}

        {/* Summary */}
        <SummaryCards recurring={recurring} />

        {/* Upcoming Timeline */}
        <UpcomingTimeline recurring={recurring} />

        {/* Filter bar */}
        <div style={{ background: "#fff", borderRadius: 14, border: "1.5px solid #e5e7eb", padding: "14px 16px", marginBottom: 16 }}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
            <Pill active={!filterType} onClick={() => setFilterType("")} color="#6366f1">ทั้งหมด</Pill>
            {Object.entries(TYPE_LABELS).map(([k, v]) => (
              <Pill key={k} active={filterType === k} onClick={() => setFilterType(k === filterType ? "" : k)} color={TYPE_COLORS[k]}>
                {TYPE_ICONS[k]} {v}
              </Pill>
            ))}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {[
              { value: "all", label: "ทุกสถานะ" },
              { value: "active", label: "✅ ใช้งาน" },
              { value: "inactive", label: "⏸ หยุด" },
              { value: "expired", label: "❌ หมดอายุ" },
            ].map(s => (
              <Pill key={s.value} active={filterActive === s.value} onClick={() => setFilterActive(s.value)} color="#6366f1">{s.label}</Pill>
            ))}
          </div>
        </div>

        {/* List */}
        {recurring.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "#9ca3af" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🔄</div>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: "#6b7280" }}>ยังไม่มีรายการประจำ</p>
            <p style={{ margin: "6px 0 0", fontSize: 13 }}>เพิ่มรายการที่จ่ายซ้ำๆ เช่น ค่าเช่า Netflix เงินเดือน</p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 20px", color: "#9ca3af" }}>
            <p style={{ margin: 0, fontSize: 14 }}>ไม่พบรายการที่ตรงกับตัวกรอง</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {filtered.map(rec => (
              <RecurringCard key={rec.id} rec={rec} config={config}
                onEdit={(r) => { setEditing(r); setShowForm(false); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                onDelete={handleDelete}
                onToggle={handleToggle}
                onPostNow={handlePostNow}
              />
            ))}
          </div>
        )}
      </div>

      {/* Post Now Modal */}
      {postTarget && (
        <PostNowModal rec={postTarget} config={config}
          onConfirm={handlePostConfirm} onClose={() => setPostTarget(null)} />
      )}
    </div>
  );
}
