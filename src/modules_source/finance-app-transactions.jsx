import { useState, useEffect, useRef, useMemo } from "react";

// ─── Constants ────────────────────────────────────────────────────────────────
const CONFIG_KEY = "finapp_config";
const TX_KEY = "finapp_transactions";
const SPLIT_KEY = "finapp_splits";

const CURRENCIES = ["THB", "USD", "EUR", "JPY", "GBP", "SGD", "CNY"];
const TYPE_COLORS = {
  income: "#22c55e",
  expense: "#ef4444",
  saving: "#3b82f6",
  investment: "#f59e0b",
  debt: "#ec4899",
};
const TYPE_LABELS = {
  income: "รายได้",
  expense: "รายจ่าย",
  saving: "ออม",
  investment: "ลงทุน",
  debt: "หนี้",
};
const TYPE_ICONS = {
  income: "↑",
  expense: "↓",
  saving: "🏦",
  investment: "📈",
  debt: "💳",
};

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

// ─── Shared UI ────────────────────────────────────────────────────────────────
function Badge({ color, bg, children, style = {} }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      padding: "2px 9px", borderRadius: 99,
      fontSize: 11, fontWeight: 600, letterSpacing: "0.03em",
      background: bg || color + "18", color: color,
      border: `1px solid ${color}33`, ...style,
    }}>{children}</span>
  );
}

function Pill({ active, onClick, color, children }) {
  return (
    <button onClick={onClick} style={{
      padding: "5px 14px", borderRadius: 99, fontSize: 12, fontWeight: 500,
      border: `1.5px solid ${active ? color : "#e5e7eb"}`,
      background: active ? color + "15" : "#fff",
      color: active ? color : "#9ca3af",
      cursor: "pointer", transition: "all 0.15s", whiteSpace: "nowrap",
    }}>{children}</button>
  );
}

function FancySelect({ label, value, onChange, options, placeholder = "เลือก...", disabled }) {
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      {label && <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 4, letterSpacing: "0.04em", textTransform: "uppercase" }}>{label}</label>}
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
        style={{
          width: "100%", padding: "9px 12px",
          borderRadius: 8, border: "1.5px solid #e5e7eb",
          fontSize: 13, background: disabled ? "#f9fafb" : "#fff",
          color: value ? "#1a1a2e" : "#9ca3af",
          fontFamily: "inherit", cursor: disabled ? "not-allowed" : "pointer",
          outline: "none", appearance: "none",
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath d='M2 4l4 4 4-4' fill='none' stroke='%239ca3af' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E")`,
          backgroundRepeat: "no-repeat", backgroundPosition: "right 10px center",
          paddingRight: 28,
        }}
      >
        <option value="">{placeholder}</option>
        {options.map(o => (
          <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>
        ))}
      </select>
    </div>
  );
}

function FancyInput({ label, value, onChange, type = "text", placeholder, prefix, style = {} }) {
  return (
    <div style={{ flex: 1, minWidth: 0, ...style }}>
      {label && <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 4, letterSpacing: "0.04em", textTransform: "uppercase" }}>{label}</label>}
      <div style={{ position: "relative" }}>
        {prefix && (
          <span style={{
            position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)",
            fontSize: 12, color: "#9ca3af", pointerEvents: "none",
          }}>{prefix}</span>
        )}
        <input
          type={type} value={value} onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          style={{
            width: "100%", padding: prefix ? "9px 12px 9px 28px" : "9px 12px",
            borderRadius: 8, border: "1.5px solid #e5e7eb",
            fontSize: 13, fontFamily: "inherit", outline: "none",
            boxSizing: "border-box", background: "#fff", color: "#1a1a2e",
          }}
        />
      </div>
    </div>
  );
}

// ─── Transaction Form ─────────────────────────────────────────────────────────
const EMPTY_FORM = {
  date: today(), type: "", mainCat: "", subCat: "",
  account: "", amount: "", currency: "THB",
  paidBy: "", splitWith: [], remark: "",
};

function TransactionForm({ config, onSave, editing, onCancel }) {
  const [form, setForm] = useState(editing || { ...EMPTY_FORM, currency: config.profile?.baseCurrency || "THB" });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (editing) setForm(editing);
  }, [editing]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // Derived category options
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

  const showPaidBy = form.type === "expense" || form.type === "debt";

  const paidByOptions = useMemo(() => [
    { value: "self", label: "ฉันเอง" },
    { value: "shared", label: "✂️ ร่วมกันจ่าย" },
    ...config.people.map(p => ({ value: p.id, label: p.name })),
  ], [config.people]);

  // คนที่จ่ายแทน (ไม่ใช่ self และ shared) → จะ auto-create split 100%
  const paidByPerson = useMemo(() =>
    config.people.find(p => p.id === form.paidBy) || null,
    [form.paidBy, config.people]
  );

  const validate = () => {
    const e = {};
    if (!form.date) e.date = true;
    if (!form.type) e.type = true;
    if (!form.amount || isNaN(parseFloat(form.amount))) e.amount = true;
    if (!form.account) e.account = true;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    const saved = {
      ...form,
      id: form.id || genId(),
      amount: parseFloat(form.amount),
      createdAt: form.createdAt || Date.now(),
    };
    // ถ้า paidBy เป็นคนอื่น (ไม่ใช่ self/shared) → auto-create split 100% ให้คนนั้น
    const isPersonPayer = form.paidBy && form.paidBy !== "self" && form.paidBy !== "shared";
    onSave(saved, isPersonPayer ? form.paidBy : null);
    if (!editing) setForm({ ...EMPTY_FORM, currency: config.profile?.baseCurrency || "THB" });
    setErrors({});
  };

  const typeColor = TYPE_COLORS[form.type] || "#6366f1";

  const fieldErr = (k) => errors[k] ? { borderColor: "#ef4444" } : {};

  return (
    <div style={{
      background: "#fff", borderRadius: 16,
      border: editing ? `2px solid #f59e0b` : "1.5px solid #e5e7eb",
      overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
    }}>
      {/* Form header */}
      <div style={{
        background: editing ? "#fffbeb" : "linear-gradient(135deg,#1a1a2e,#16213e)",
        padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <span style={{ fontWeight: 700, fontSize: 14, color: editing ? "#92400e" : "#fff" }}>
          {editing ? "✏️ แก้ไข Transaction" : "➕ บันทึกรายการใหม่"}
        </span>
        {editing && (
          <button onClick={onCancel} style={{ background: "none", border: "none", cursor: "pointer", color: "#92400e", fontSize: 18 }}>×</button>
        )}
      </div>

      <div style={{ padding: "20px 20px 16px" }}>
        {/* Row 1: Date + Type */}
        <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
          <FancyInput label="วันที่" type="date" value={form.date} onChange={v => set("date", v)} style={{ ...fieldErr("date"), flex: 1 }} />
          <div style={{ flex: 1 }}>
            <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 4, letterSpacing: "0.04em", textTransform: "uppercase" }}>ประเภท</label>
            <div style={{ display: "flex", gap: 4 }}>
              {Object.entries(TYPE_LABELS).map(([k, v]) => (
                <button key={k} onClick={() => {
                    set("type", k);
                    set("mainCat", "");
                    set("subCat", "");
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

        {/* Row 2: Main + Sub Category */}
        <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
          <FancySelect label="หมวดหลัก" value={form.mainCat}
            onChange={v => { set("mainCat", v); set("subCat", ""); }}
            options={mainCats} placeholder="เลือกหมวดหลัก..." disabled={!form.type} />
          <FancySelect label="หมวดย่อย" value={form.subCat}
            onChange={v => set("subCat", v)}
            options={subCats} placeholder="เลือกหมวดย่อย..." disabled={!form.mainCat} />
        </div>

        {/* Row 3: Amount + Currency + Account */}
        <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
          <FancyInput label="จำนวนเงิน" type="number" value={form.amount}
            onChange={v => set("amount", v)} placeholder="0.00" prefix={form.currency === "THB" ? "฿" : "$"}
            style={{ flex: 2, ...(errors.amount ? { border: "1.5px solid #ef4444" } : {}) }} />
          <FancySelect label="สกุลเงิน" value={form.currency}
            onChange={v => set("currency", v)} options={CURRENCIES} style={{ flex: 1 }} />
          <FancySelect label="บัญชี" value={form.account}
            onChange={v => set("account", v)}
            options={config.accounts.map(a => ({ value: a.id, label: a.name }))}
            placeholder="เลือกบัญชี..." />
        </div>

        {/* Row 4: Paid by (expense/debt only) + Remark */}
        <div style={{ display: "flex", gap: 12, marginBottom: paidByPerson ? 8 : 16 }}>
          {showPaidBy && (
            <FancySelect label="ผู้จ่าย" value={form.paidBy}
              onChange={v => set("paidBy", v)} options={paidByOptions} placeholder="ผู้จ่าย..." />
          )}
          <FancyInput label="หมายเหตุ" value={form.remark}
            onChange={v => set("remark", v)} placeholder="รายละเอียดเพิ่มเติม..." />
        </div>
        {paidByPerson && (
          <div style={{ padding: "8px 12px", background: "#fef9ec", borderRadius: 8, border: "1px solid #fde68a", marginBottom: 16, fontSize: 12, color: "#92400e" }}>
            💡 <strong>{paidByPerson.name}</strong> จ่ายแทน — ระบบจะสร้าง Split ให้อัตโนมัติ 100% แก้ไขได้ในหน้า Split Payment
          </div>
        )}

        {/* Validation errors */}
        {Object.keys(errors).length > 0 && (
          <div style={{ padding: "8px 12px", background: "#fef2f2", borderRadius: 8, border: "1px solid #fecaca", marginBottom: 12 }}>
            <p style={{ margin: 0, fontSize: 12, color: "#dc2626" }}>⚠️ กรุณากรอกข้อมูล: {[errors.date && "วันที่", errors.type && "ประเภท", errors.amount && "จำนวนเงิน", errors.account && "บัญชี"].filter(Boolean).join(", ")}</p>
          </div>
        )}

        <button onClick={handleSave} style={{
          width: "100%", padding: "11px 0",
          background: editing ? "#f59e0b" : typeColor || "#6366f1",
          color: "#fff", border: "none", borderRadius: 10,
          fontSize: 14, fontWeight: 700, cursor: "pointer",
          opacity: !form.type ? 0.6 : 1,
          transition: "all 0.15s",
        }}>
          {editing ? "💾 บันทึกการแก้ไข" : `${TYPE_ICONS[form.type] || "+"} บันทึกรายการ`}
        </button>
      </div>
    </div>
  );
}

// ─── Filter Panel ─────────────────────────────────────────────────────────────
function FilterPanel({ config, filter, setFilter }) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const mainCatsForType = useMemo(() => {
    if (!filter.type) return [];
    const seen = new Set();
    return config.categories
      .filter(c => c.type === filter.type && c.main)
      .filter(c => { if (seen.has(c.main)) return false; seen.add(c.main); return true; })
      .map(c => c.main);
  }, [filter.type, config.categories]);

  const subCatsForMain = useMemo(() => {
    if (!filter.mainCat) return [];
    return config.categories
      .filter(c => c.type === filter.type && c.main === filter.mainCat && c.sub)
      .map(c => c.sub);
  }, [filter.type, filter.mainCat, config.categories]);

  const activeCount = [filter.type, filter.mainCat, filter.subCat, filter.account, filter.paidBy, filter.currency, filter.dateFrom, filter.dateTo, filter.search].filter(Boolean).length;

  const reset = () => setFilter({
    type: "", mainCat: "", subCat: "", account: "", paidBy: "",
    currency: "", dateFrom: "", dateTo: "", search: "", month: "", year: "",
  });

  // Month/Year quick selects
  const now = new Date();
  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), i, 1);
    return { value: `${now.getFullYear()}-${String(i + 1).padStart(2, "0")}`, label: d.toLocaleString("th-TH", { month: "long" }) };
  });
  const years = [now.getFullYear() - 2, now.getFullYear() - 1, now.getFullYear()].map(y => ({ value: String(y), label: String(y) }));

  return (
    <div style={{ background: "#fff", borderRadius: 14, border: "1.5px solid #e5e7eb", padding: "16px 18px", marginBottom: 16 }}>
      {/* Search + toggle */}
      <div style={{ display: "flex", gap: 10, marginBottom: 12, alignItems: "center" }}>
        <div style={{ flex: 1, position: "relative" }}>
          <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#9ca3af", fontSize: 14 }}>🔍</span>
          <input
            value={filter.search} onChange={e => setFilter(f => ({ ...f, search: e.target.value }))}
            placeholder="ค้นหา remark, หมวดหมู่..."
            style={{
              width: "100%", padding: "9px 12px 9px 32px", borderRadius: 8,
              border: "1.5px solid #e5e7eb", fontSize: 13, fontFamily: "inherit",
              outline: "none", boxSizing: "border-box",
            }}
          />
        </div>
        <button onClick={() => setShowAdvanced(s => !s)} style={{
          padding: "9px 14px", borderRadius: 8, border: "1.5px solid #e5e7eb",
          background: showAdvanced ? "#f0f0ff" : "#fff", fontSize: 12, fontWeight: 600,
          color: showAdvanced ? "#6366f1" : "#6b7280", cursor: "pointer",
          display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap",
        }}>
          ⚙️ ตัวกรอง {activeCount > 0 && <span style={{ background: "#6366f1", color: "#fff", borderRadius: 99, padding: "1px 6px", fontSize: 11 }}>{activeCount}</span>}
        </button>
        {activeCount > 0 && (
          <button onClick={reset} style={{
            padding: "9px 12px", borderRadius: 8, border: "1.5px solid #fecaca",
            background: "#fef2f2", fontSize: 12, fontWeight: 600, color: "#dc2626", cursor: "pointer",
          }}>✕ ล้าง</button>
        )}
      </div>

      {/* Quick type filter */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: showAdvanced ? 12 : 0 }}>
        <Pill active={!filter.type} onClick={() => setFilter(f => ({ ...f, type: "", mainCat: "", subCat: "" }))} color="#6366f1">ทั้งหมด</Pill>
        {Object.entries(TYPE_LABELS).map(([k, v]) => (
          <Pill key={k} active={filter.type === k} onClick={() => setFilter(f => ({ ...f, type: k === f.type ? "" : k, mainCat: "", subCat: "" }))} color={TYPE_COLORS[k]}>
            {TYPE_ICONS[k]} {v}
          </Pill>
        ))}
      </div>

      {showAdvanced && (
        <div style={{ borderTop: "1px solid #f3f4f6", paddingTop: 12 }}>
          {/* Month/Year slicer */}
          <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
            <FancySelect label="เดือน" value={filter.month}
              onChange={v => setFilter(f => ({ ...f, month: v, dateFrom: "", dateTo: "" }))}
              options={months} placeholder="ทุกเดือน..." />
            <FancySelect label="ปี" value={filter.year}
              onChange={v => setFilter(f => ({ ...f, year: v }))}
              options={years} placeholder="ทุกปี..." />
          </div>

          {/* Date range */}
          <div style={{ display: "flex", gap: 10, marginBottom: 12, alignItems: "flex-end" }}>
            <FancyInput label="วันที่เริ่ม" type="date" value={filter.dateFrom}
              onChange={v => setFilter(f => ({ ...f, dateFrom: v, month: "" }))} />
            <span style={{ fontSize: 13, color: "#9ca3af", paddingBottom: 10 }}>–</span>
            <FancyInput label="วันที่สิ้นสุด" type="date" value={filter.dateTo}
              onChange={v => setFilter(f => ({ ...f, dateTo: v, month: "" }))} />
          </div>

          <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
            <FancySelect label="หมวดหลัก" value={filter.mainCat}
              onChange={v => setFilter(f => ({ ...f, mainCat: v, subCat: "" }))}
              options={mainCatsForType} placeholder="ทั้งหมด..." disabled={!filter.type} />
            <FancySelect label="หมวดย่อย" value={filter.subCat}
              onChange={v => setFilter(f => ({ ...f, subCat: v }))}
              options={subCatsForMain} placeholder="ทั้งหมด..." disabled={!filter.mainCat} />
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <FancySelect label="บัญชี" value={filter.account}
              onChange={v => setFilter(f => ({ ...f, account: v }))}
              options={config.accounts.map(a => ({ value: a.id, label: a.name }))}
              placeholder="ทุกบัญชี..." />
            <FancySelect label="ผู้จ่าย" value={filter.paidBy}
              onChange={v => setFilter(f => ({ ...f, paidBy: v }))}
              options={[{ value: "self", label: "ฉันเอง" }, { value: "shared", label: "ร่วมกัน" }, ...config.people.map(p => ({ value: p.id, label: p.name }))]}
              placeholder="ทุกคน..." />
            <FancySelect label="สกุลเงิน" value={filter.currency}
              onChange={v => setFilter(f => ({ ...f, currency: v }))}
              options={CURRENCIES} placeholder="ทุกสกุล..." />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Summary Bar ──────────────────────────────────────────────────────────────
function SummaryBar({ transactions, baseCurrency }) {
  const totals = useMemo(() => {
    let inc = 0, exp = 0, sav = 0, inv = 0;
    transactions.forEach(tx => {
      const amt = tx.amount || 0;
      if (tx.type === "income") inc += amt;
      else if (tx.type === "expense") exp += amt;
      else if (tx.type === "saving") sav += amt;
      else if (tx.type === "investment") inv += amt;
    });
    return { inc, exp, sav, inv, net: inc - exp - sav - inv };
  }, [transactions]);

  const fmt = (n) => Math.abs(n).toLocaleString("th-TH", { maximumFractionDigits: 0 });

  const cards = [
    { label: "รายได้", value: totals.inc, color: "#22c55e", sign: "+" },
    { label: "รายจ่าย", value: totals.exp, color: "#ef4444", sign: "-" },
    { label: "ออม", value: totals.sav, color: "#3b82f6", sign: "" },
    { label: "ลงทุน", value: totals.inv, color: "#f59e0b", sign: "" },
    { label: "คงเหลือสุทธิ", value: totals.net, color: totals.net >= 0 ? "#22c55e" : "#ef4444", sign: totals.net >= 0 ? "+" : "-" },
  ];

  return (
    <div style={{ display: "flex", gap: 8, marginBottom: 16, overflowX: "auto", paddingBottom: 4 }}>
      {cards.map(c => (
        <div key={c.label} style={{
          flex: "0 0 auto", minWidth: 110,
          background: "#fff", borderRadius: 12, border: `1.5px solid ${c.color}30`,
          padding: "10px 14px",
        }}>
          <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 3 }}>{c.label}</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: c.color }}>
            {c.sign}{fmt(c.value)}
            <span style={{ fontSize: 10, marginLeft: 3, opacity: 0.7 }}>{baseCurrency}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Transaction Row ──────────────────────────────────────────────────────────
function TxRow({ tx, config, onEdit, onDelete }) {
  const [confirm, setConfirm] = useState(false);
  const color = TYPE_COLORS[tx.type] || "#6b7280";
  const account = config.accounts.find(a => a.id === tx.account);
  const person = tx.paidBy !== "self" && tx.paidBy !== "shared"
    ? config.people.find(p => p.id === tx.paidBy)
    : null;

  const paidLabel = tx.paidBy === "self" ? "ฉัน" : tx.paidBy === "shared" ? "ร่วม" : person?.name || tx.paidBy;

  const currencySymbol = tx.currency === "THB" ? "฿" : tx.currency === "USD" ? "$" : tx.currency;

  return (
    <div style={{
      background: "#fff", borderRadius: 12,
      border: "1.5px solid #f3f4f6",
      padding: "12px 16px",
      display: "flex", alignItems: "center", gap: 12,
      transition: "box-shadow 0.15s",
    }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.07)"}
      onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}
    >
      {/* Type icon */}
      <div style={{
        width: 38, height: 38, borderRadius: 10, flexShrink: 0,
        background: color + "15", display: "flex", alignItems: "center",
        justifyContent: "center", fontSize: 16, color: color, fontWeight: 700,
      }}>{TYPE_ICONS[tx.type]}</div>

      {/* Main info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
          <span style={{ fontWeight: 600, fontSize: 13, color: "#1a1a2e", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {tx.subCat || tx.mainCat || TYPE_LABELS[tx.type]}
          </span>
          {tx.mainCat && tx.subCat && (
            <span style={{ fontSize: 11, color: "#9ca3af" }}>· {tx.mainCat}</span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <span style={{ fontSize: 11, color: "#9ca3af" }}>{tx.date}</span>
          {account && (
            <span style={{ fontSize: 11, color: "#9ca3af", display: "flex", alignItems: "center", gap: 3 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: account.color || "#6366f1", display: "inline-block" }} />
              {account.name}
            </span>
          )}
          {tx.remark && (
            <span style={{ fontSize: 11, color: "#9ca3af", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 120 }}>
              "{tx.remark}"
            </span>
          )}
          {tx.paidBy && (
            <Badge color={tx.paidBy === "shared" ? "#8b5cf6" : "#6b7280"} style={{ fontSize: 10, padding: "1px 7px" }}>
              {paidLabel}
            </Badge>
          )}
        </div>
      </div>

      {/* Amount */}
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: tx.type === "income" ? "#22c55e" : tx.type === "expense" ? "#ef4444" : "#1a1a2e" }}>
          {tx.type === "income" ? "+" : tx.type === "expense" ? "-" : ""}
          {currencySymbol}{(tx.amount || 0).toLocaleString("th-TH", { maximumFractionDigits: 2 })}
        </div>
        <div style={{ fontSize: 10, color: "#9ca3af" }}>{tx.currency}</div>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
        <button onClick={() => onEdit(tx)} style={{
          width: 30, height: 30, borderRadius: 7, background: "#f9fafb",
          border: "1.5px solid #e5e7eb", cursor: "pointer", fontSize: 13,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>✏️</button>
        {confirm ? (
          <button onClick={() => { onDelete(tx.id); setConfirm(false); }} style={{
            width: 30, height: 30, borderRadius: 7, background: "#fef2f2",
            border: "1.5px solid #fecaca", cursor: "pointer", fontSize: 11, fontWeight: 700, color: "#dc2626",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>✓</button>
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

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function TransactionsPage() {
  const [config, setConfig] = useState({
    profile: { baseCurrency: "THB" }, accounts: [], categories: [], goals: [], people: [],
  });
  const [transactions, setTransactions] = useState([]);
  const [splits, setSplits] = useState([]);
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState({
    type: "", mainCat: "", subCat: "", account: "", paidBy: "",
    currency: "", dateFrom: "", dateTo: "", search: "", month: "", year: "",
  });
  const [sortBy, setSortBy] = useState("date_desc");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  useEffect(() => {
    try {
      const cfg = localStorage.getItem(CONFIG_KEY);
      if (cfg) setConfig(JSON.parse(cfg));
      const txs = localStorage.getItem(TX_KEY);
      if (txs) setTransactions(JSON.parse(txs));
      const sp = localStorage.getItem(SPLIT_KEY);
      if (sp) setSplits(JSON.parse(sp));
    } catch (e) {}
  }, []);

  const saveTx = (txs) => {
    setTransactions(txs);
    try { localStorage.setItem(TX_KEY, JSON.stringify(txs)); } catch (e) {}
  };

  const saveSplits = (data) => {
    setSplits(data);
    try { localStorage.setItem(SPLIT_KEY, JSON.stringify(data)); } catch (e) {}
  };

  const handleSave = (tx, autoSplitPersonId) => {
    const exists = transactions.findIndex(t => t.id === tx.id);
    let next;
    if (exists >= 0) {
      next = transactions.map(t => t.id === tx.id ? tx : t);
    } else {
      next = [tx, ...transactions];
    }
    saveTx(next);

    // Auto-create or update split if someone paid on behalf
    if (autoSplitPersonId) {
      const newSplit = {
        id: genId(),
        txId: tx.id,
        participants: [{ personId: autoSplitPersonId, mode: "amount", value: tx.amount, actualAmount: tx.amount }],
        dueDate: "",
        note: `${tx.remark || ""} — จ่ายแทนโดย auto`,
      };
      const existingIdx = splits.findIndex(s => s.txId === tx.id);
      const nextSplits = existingIdx >= 0
        ? splits.map(s => s.txId === tx.id ? newSplit : s)
        : [...splits, newSplit];
      saveSplits(nextSplits);
    }

    setEditing(null);
    setShowForm(false);
  };

  const handleDelete = (id) => saveTx(transactions.filter(t => t.id !== id));

  // Filtering
  const filtered = useMemo(() => {
    return transactions.filter(tx => {
      if (filter.type && tx.type !== filter.type) return false;
      if (filter.mainCat && tx.mainCat !== filter.mainCat) return false;
      if (filter.subCat && tx.subCat !== filter.subCat) return false;
      if (filter.account && tx.account !== filter.account) return false;
      if (filter.paidBy && tx.paidBy !== filter.paidBy) return false;
      if (filter.currency && tx.currency !== filter.currency) return false;
      if (filter.month && !tx.date?.startsWith(filter.month)) return false;
      if (filter.year && !tx.date?.startsWith(filter.year)) return false;
      if (filter.dateFrom && tx.date < filter.dateFrom) return false;
      if (filter.dateTo && tx.date > filter.dateTo) return false;
      if (filter.search) {
        const q = filter.search.toLowerCase();
        if (!(
          tx.remark?.toLowerCase().includes(q) ||
          tx.mainCat?.toLowerCase().includes(q) ||
          tx.subCat?.toLowerCase().includes(q)
        )) return false;
      }
      return true;
    });
  }, [transactions, filter]);

  // Sorting
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      if (sortBy === "date_desc") return b.date?.localeCompare(a.date) || b.createdAt - a.createdAt;
      if (sortBy === "date_asc") return a.date?.localeCompare(b.date) || a.createdAt - b.createdAt;
      if (sortBy === "amount_desc") return (b.amount || 0) - (a.amount || 0);
      if (sortBy === "amount_asc") return (a.amount || 0) - (b.amount || 0);
      return 0;
    });
  }, [filtered, sortBy]);

  const paginated = sorted.slice(0, page * PAGE_SIZE);
  const hasMore = paginated.length < sorted.length;

  // Group by date
  const grouped = useMemo(() => {
    const groups = {};
    paginated.forEach(tx => {
      const key = tx.date || "ไม่มีวันที่";
      if (!groups[key]) groups[key] = [];
      groups[key].push(tx);
    });
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  }, [paginated]);

  const formatDateHeader = (dateStr) => {
    try {
      const d = new Date(dateStr + "T00:00:00");
      const today_str = today();
      const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
      const yesterday_str = yesterday.toISOString().slice(0, 10);
      if (dateStr === today_str) return "วันนี้";
      if (dateStr === yesterday_str) return "เมื่อวาน";
      return d.toLocaleDateString("th-TH", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
    } catch { return dateStr; }
  };

  const dayTotal = (txs) => {
    let inc = 0, exp = 0;
    txs.forEach(tx => {
      if (tx.type === "income") inc += tx.amount || 0;
      else if (tx.type === "expense") exp += tx.amount || 0;
    });
    return { inc, exp };
  };

  return (
    <div style={{ fontFamily: "'Noto Sans Thai','Sarabun',sans-serif", minHeight: "100vh", background: "#f8f9fb" }}>

      {/* Header */}
      <div style={{ background: "linear-gradient(135deg,#1a1a2e,#16213e,#0f3460)", padding: "20px 20px 16px" }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 34, height: 34, borderRadius: 9, background: "#6366f1", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>💎</div>
                <span style={{ fontSize: 20, fontWeight: 800, color: "#fff", letterSpacing: "-0.5px" }}>FinFlow</span>
                <span style={{ fontSize: 11, padding: "2px 8px", background: "rgba(255,255,255,0.12)", borderRadius: 99, color: "rgba(255,255,255,0.7)", letterSpacing: "0.05em" }}>TRANSACTIONS</span>
              </div>
              <p style={{ margin: "4px 0 0 44px", fontSize: 12, color: "rgba(255,255,255,0.5)" }}>
                {sorted.length} รายการ {filtered.length !== transactions.length ? `(กรองจาก ${transactions.length})` : ""}
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

        {/* Add/Edit Form */}
        {(showForm || editing) && (
          <div style={{ marginBottom: 20 }}>
            <TransactionForm
              config={config}
              onSave={handleSave}
              editing={editing}
              onCancel={() => { setEditing(null); setShowForm(false); }}
            />
          </div>
        )}

        {/* Summary */}
        <SummaryBar transactions={filtered} baseCurrency={config.profile?.baseCurrency || "THB"} />

        {/* Filter */}
        <FilterPanel config={config} filter={filter} setFilter={(v) => { setFilter(v); setPage(1); }} />

        {/* Sort bar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>รายการทั้งหมด</span>
          <div style={{ display: "flex", gap: 6 }}>
            {[
              { value: "date_desc", label: "ล่าสุด" },
              { value: "date_asc", label: "เก่าสุด" },
              { value: "amount_desc", label: "มากสุด" },
              { value: "amount_asc", label: "น้อยสุด" },
            ].map(s => (
              <button key={s.value} onClick={() => setSortBy(s.value)} style={{
                padding: "5px 11px", borderRadius: 7, fontSize: 11, fontWeight: 500,
                border: `1.5px solid ${sortBy === s.value ? "#6366f1" : "#e5e7eb"}`,
                background: sortBy === s.value ? "#f0f0ff" : "#fff",
                color: sortBy === s.value ? "#6366f1" : "#6b7280",
                cursor: "pointer",
              }}>{s.label}</button>
            ))}
          </div>
        </div>

        {/* Transaction groups */}
        {transactions.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "#9ca3af" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: "#6b7280" }}>ยังไม่มีรายการ</p>
            <p style={{ margin: "6px 0 0", fontSize: 13 }}>กดปุ่ม "+ เพิ่มรายการ" ด้านบนเพื่อเริ่มบันทึก</p>
          </div>
        ) : sorted.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 20px", color: "#9ca3af" }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>🔍</div>
            <p style={{ margin: 0, fontSize: 14 }}>ไม่พบรายการที่ตรงกับตัวกรอง</p>
          </div>
        ) : (
          <>
            {grouped.map(([date, txs]) => {
              const { inc, exp } = dayTotal(txs);
              return (
                <div key={date} style={{ marginBottom: 16 }}>
                  {/* Date header */}
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#374151" }}>{formatDateHeader(date)}</span>
                    <div style={{ flex: 1, height: 1, background: "#f3f4f6" }} />
                    <div style={{ display: "flex", gap: 8 }}>
                      {inc > 0 && <span style={{ fontSize: 11, color: "#22c55e", fontWeight: 600 }}>+{inc.toLocaleString("th-TH", { maximumFractionDigits: 0 })}</span>}
                      {exp > 0 && <span style={{ fontSize: 11, color: "#ef4444", fontWeight: 600 }}>-{exp.toLocaleString("th-TH", { maximumFractionDigits: 0 })}</span>}
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {txs.map(tx => (
                      <TxRow key={tx.id} tx={tx} config={config}
                        onEdit={(t) => { setEditing(t); setShowForm(false); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                        onDelete={handleDelete}
                      />
                    ))}
                  </div>
                </div>
              );
            })}

            {/* Load more */}
            {hasMore && (
              <button onClick={() => setPage(p => p + 1)} style={{
                width: "100%", padding: "12px", background: "#fff",
                border: "1.5px solid #e5e7eb", borderRadius: 12,
                fontSize: 13, fontWeight: 600, color: "#6b7280",
                cursor: "pointer", marginTop: 8,
              }}>
                โหลดเพิ่ม ({sorted.length - paginated.length} รายการ)
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
