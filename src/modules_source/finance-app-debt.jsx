import { useEffect, useMemo, useState } from "react";

const DEBT_KEY = "finapp_debts";
const CONFIG_KEY = "finapp_config";

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function fmt(n, dec = 0) {
  return Number(n || 0).toLocaleString("th-TH", {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec,
  });
}

function fmtShort(n) {
  const a = Math.abs(n || 0);
  if (a >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (a >= 1e4) return (n / 1e3).toFixed(1) + "K";
  return fmt(n);
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  try {
    return new Date(dateStr + "T00:00:00").toLocaleDateString("th-TH", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function daysUntil(dateStr) {
  if (!dateStr) return null;
  return Math.round((new Date(dateStr + "T00:00:00") - new Date(today() + "T00:00:00")) / 86400000);
}

function daysInMonth(year, monthIndexZeroBased) {
  return new Date(year, monthIndexZeroBased + 1, 0).getDate();
}

function clampDueDay(day) {
  const num = Number(day || 1);
  if (Number.isNaN(num)) return 1;
  return Math.max(1, Math.min(31, Math.trunc(num)));
}

function buildMonthlyDueDate(startDate, dueDayOfMonth, monthOffset) {
  const base = new Date(startDate + "T00:00:00");
  const target = new Date(base.getFullYear(), base.getMonth() + monthOffset, 1);
  const maxDay = daysInMonth(target.getFullYear(), target.getMonth());
  const finalDay = Math.min(clampDueDay(dueDayOfMonth), maxDay);
  return new Date(target.getFullYear(), target.getMonth(), finalDay).toISOString().slice(0, 10);
}

function getEffectiveDueDay(debt) {
  if (debt?.dueDayOfMonth) return clampDueDay(debt.dueDayOfMonth);
  if (debt?.dueDate) {
    const d = new Date(debt.dueDate + "T00:00:00");
    if (!Number.isNaN(d.getTime())) return d.getDate();
  }
  if (debt?.startDate) {
    const d = new Date(debt.startDate + "T00:00:00");
    if (!Number.isNaN(d.getTime())) return d.getDate();
  }
  return 1;
}

function getActivePaymentRecords(debt) {
  return (debt?.paymentRecords || []).filter((r) => !r.deleted).sort((a, b) => a.installmentNo - b.installmentNo);
}

function getPaidInstallmentCount(debt) {
  return getActivePaymentRecords(debt).length;
}

function getNextDueDate(debt) {
  if (!debt?.startDate) return "";
  return buildMonthlyDueDate(debt.startDate, getEffectiveDueDay(debt), getPaidInstallmentCount(debt));
}

function getLastDueDate(debt) {
  if (!debt?.startDate || !debt?.totalMonths) return "";
  const totalMonths = Number(debt.totalMonths || 0);
  if (totalMonths <= 0) return "";
  return buildMonthlyDueDate(debt.startDate, getEffectiveDueDay(debt), totalMonths - 1);
}

const DEBT_TYPES = [
  { key: "credit_card", label: "บัตรเครดิต", icon: "💳", color: "#ef4444" },
  { key: "installment", label: "ผ่อน 0%", icon: "🛍️", color: "#f59e0b" },
  { key: "mortgage", label: "ผ่อนบ้าน", icon: "🏠", color: "#6366f1" },
  { key: "car", label: "ผ่อนรถ", icon: "🚗", color: "#22c55e" },
  { key: "personal", label: "สินเชื่อส่วนบุคคล", icon: "👤", color: "#8b5cf6" },
  { key: "other", label: "อื่นๆ", icon: "📋", color: "#9ca3af" },
];

const BANK_CARDS = [
  { name: "KBank", color: "#1a6b3c", abbr: "KBank" },
  { name: "SCB", color: "#4b0082", abbr: "SCB" },
  { name: "BBL", color: "#003087", abbr: "BBL" },
  { name: "KTB", color: "#0066cc", abbr: "KTB" },
  { name: "BAY", color: "#ec6600", abbr: "BAY" },
  { name: "UOB", color: "#0033a0", abbr: "UOB" },
  { name: "อื่นๆ", color: "#6b7280", abbr: "อื่นๆ" },
];

function seedIfEmpty() {
  if (localStorage.getItem(DEBT_KEY)) return;
  const mock = [
    {
      id: "d1",
      type: "mortgage",
      name: "สินเชื่อบ้าน ธ.กสิกร",
      bank: "KBank",
      totalDebt: 2800000,
      paidAmount: 320000,
      monthlyPayment: 14500,
      annualRate: 4.5,
      startDate: "2022-03-01",
      dueDayOfMonth: 1,
      totalMonths: 240,
      note: "ผ่อน 20 ปี ดอกเบี้ย 4.5%/ปี",
      active: true,
      paymentRecords: Array.from({ length: 26 }, (_, i) => ({
        id: genId(),
        installmentNo: i + 1,
        amount: 14500,
        date: buildMonthlyDueDate("2022-03-01", 1, i),
        note: "migrated",
        deleted: false,
      })),
    },
    {
      id: "d2",
      type: "car",
      name: "ผ่อนรถ Honda Civic",
      bank: "BAY",
      totalDebt: 680000,
      paidAmount: 204000,
      monthlyPayment: 12000,
      annualRate: 3.8,
      startDate: "2023-01-01",
      dueDayOfMonth: 1,
      totalMonths: 60,
      note: "ผ่อน 5 ปี",
      active: true,
      paymentRecords: Array.from({ length: 18 }, (_, i) => ({
        id: genId(),
        installmentNo: i + 1,
        amount: 12000,
        date: buildMonthlyDueDate("2023-01-01", 1, i),
        note: "migrated",
        deleted: false,
      })),
    },
    {
      id: "d3",
      type: "installment",
      name: "ผ่อน iPhone 15 Pro 0%",
      bank: "SCB",
      totalDebt: 42900,
      paidAmount: 17160,
      monthlyPayment: 4290,
      annualRate: 0,
      startDate: "2024-02-01",
      dueDayOfMonth: 1,
      totalMonths: 10,
      note: "0% 10 เดือน",
      active: true,
      paymentRecords: Array.from({ length: 4 }, (_, i) => ({
        id: genId(),
        installmentNo: i + 1,
        amount: 4290,
        date: buildMonthlyDueDate("2024-02-01", 1, i),
        note: "migrated",
        deleted: false,
      })),
    },
  ];
  localStorage.setItem(DEBT_KEY, JSON.stringify(mock));
}

function calcAmortization(totalPrincipal, annualRate, monthlyPayment, startDate, dueDayOfMonth, paymentRecords = []) {
  if (!totalPrincipal || !monthlyPayment || !startDate) return [];

  const activeRecords = paymentRecords.filter((r) => !r.deleted);
  const recordMap = new Map(activeRecords.map((r) => [r.installmentNo, r]));
  const monthlyRate = annualRate / 100 / 12;
  const rows = [];
  let balance = Number(totalPrincipal);
  let mo = 0;

  while (balance > 0.01 && mo < 600) {
    const interest = monthlyRate > 0 ? balance * monthlyRate : 0;
    const principalPaid = Math.min(monthlyPayment - interest, balance);
    const payment = principalPaid + interest;
    balance -= principalPaid;

    const installmentNo = mo + 1;
    const dueDate = buildMonthlyDueDate(startDate, dueDayOfMonth, mo);
    const record = recordMap.get(installmentNo);
    const isPaid = !!record;

    rows.push({
      installmentNo,
      dueDate,
      scheduledAmount: Math.round(payment * 100) / 100,
      paidAmount: Number(record?.amount || 0),
      paidDate: record?.date || "",
      note: record?.note || "",
      principal: Math.round(principalPaid * 100) / 100,
      interest: Math.round(interest * 100) / 100,
      balance: Math.max(0, Math.round(balance * 100) / 100),
      isPaid,
    });

    mo += 1;
    if (monthlyRate === 0 && principalPaid <= 0) break;
  }

  const totalInstallments = rows.length;
  const nextUnpaid = rows.find((r) => !r.isPaid)?.installmentNo || null;

  return rows.map((row) => {
    const diff = daysUntil(row.dueDate);
    let status = "future";

    if (row.isPaid) status = "paid";
    else if (diff !== null && diff < 0) status = "overdue";
    else if (row.installmentNo === nextUnpaid) status = "upcoming";

    return {
      ...row,
      isLastInstallment: row.installmentNo === totalInstallments,
      status,
      futureMonthsAhead: nextUnpaid ? Math.max(0, row.installmentNo - nextUnpaid) : 0,
    };
  });
}

function Card({ children, style = {}, title, action }) {
  return (
    <div style={{ background: "#fff", borderRadius: 16, border: "1.5px solid #f3f4f6", padding: "16px 18px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)", ...style }}>
      {title ? (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#374151" }}>{title}</h3>
          {action}
        </div>
      ) : null}
      {children}
    </div>
  );
}

function ProgressBar({ value, max, color = "#6366f1", height = 8 }) {
  const p = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div style={{ background: "#f3f4f6", borderRadius: 99, height, overflow: "hidden" }}>
      <div style={{ width: `${p}%`, height: "100%", background: color, borderRadius: 99, transition: "width 0.5s ease" }} />
    </div>
  );
}

function DebtVisualCard({ debt, color, icon, onEdit, onDelete }) {
  const activePaymentRecords = getActivePaymentRecords(debt);
  const paidInstallmentCount = activePaymentRecords.length;
  const remaining = Math.max(0, debt.totalDebt - debt.paidAmount);
  const paidPct = debt.totalDebt > 0 ? Math.min(100, Math.round((debt.paidAmount / debt.totalDebt) * 100)) : 0;
  const monthsLeft = debt.totalMonths ? Math.max(0, debt.totalMonths - paidInstallmentCount) : null;
  const nextDueDate = getNextDueDate(debt);
  const due = daysUntil(nextDueDate);
  const nextInstallmentNo = paidInstallmentCount + 1;
  const [confirm, setConfirm] = useState(false);
  const bankInfo = BANK_CARDS.find((b) => b.name === debt.bank) || { color: "#6b7280", abbr: debt.bank || "" };

  return (
    <div style={{ background: "#fff", borderRadius: 18, border: `2px solid ${color}22`, overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
      <div style={{ background: `linear-gradient(135deg, ${color}dd, ${color}99)`, padding: "16px 18px", minHeight: 90 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: 24, marginBottom: 4 }}>{icon}</div>
            <div style={{ fontWeight: 800, fontSize: 14, color: "#fff" }}>{debt.name}</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.75)", marginTop: 2 }}>{debt.note || ""}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            {debt.bank ? <div style={{ background: bankInfo.color, color: "#fff", fontWeight: 800, fontSize: 10, padding: "3px 8px", borderRadius: 6, marginBottom: 6 }}>{bankInfo.abbr}</div> : null}
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.8)" }}>{debt.annualRate > 0 ? `${debt.annualRate}% ต่อปี` : "0% ดอกเบี้ย"}</div>
          </div>
        </div>
        <div style={{ marginTop: 10 }}>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.65)" }}>ยอดคงค้าง</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: "#fff" }}>฿{fmt(remaining)}</div>
        </div>
      </div>

      <div style={{ padding: "14px 18px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6 }}>
          <span style={{ color: "#6b7280" }}>จ่ายแล้ว ฿{fmt(debt.paidAmount)}</span>
          <span style={{ fontWeight: 700, color }}>{paidPct}% <span style={{ color: "#9ca3af", fontWeight: 400 }}>จาก ฿{fmt(debt.totalDebt)}</span></span>
        </div>
        <ProgressBar value={debt.paidAmount} max={debt.totalDebt} color={color} height={8} />

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
          <div style={{ flex: 1, minWidth: 90, background: "#f9fafb", borderRadius: 10, padding: "8px 10px" }}>
            <div style={{ fontSize: 10, color: "#9ca3af" }}>ผ่อน/เดือน</div>
            <div style={{ fontWeight: 700, fontSize: 13, color: "#1a1a2e" }}>฿{fmt(debt.monthlyPayment)}</div>
          </div>
          <div style={{ flex: 1, minWidth: 90, background: "#f9fafb", borderRadius: 10, padding: "8px 10px" }}>
            <div style={{ fontSize: 10, color: "#9ca3af" }}>วันครบกำหนดทุกเดือน</div>
            <div style={{ fontWeight: 700, fontSize: 13, color: "#1a1a2e" }}>ทุกวันที่ {getEffectiveDueDay(debt)}</div>
          </div>
          {monthsLeft !== null ? (
            <div style={{ flex: 1, minWidth: 90, background: "#f9fafb", borderRadius: 10, padding: "8px 10px" }}>
              <div style={{ fontSize: 10, color: "#9ca3af" }}>งวดที่เหลือ</div>
              <div style={{ fontWeight: 700, fontSize: 13, color: "#1a1a2e" }}>{monthsLeft} งวด</div>
            </div>
          ) : null}
          {nextDueDate ? (
            <div style={{ flex: 1, minWidth: 120, background: due !== null && due <= 3 ? "#fef9ec" : due !== null && due < 0 ? "#fef2f2" : "#f9fafb", borderRadius: 10, padding: "8px 10px" }}>
              <div style={{ fontSize: 10, color: "#9ca3af" }}>วันต้องชำระงวดถัดไป</div>
              <div style={{ fontWeight: 700, fontSize: 12, color: "#1a1a2e" }}>{formatDate(nextDueDate)}</div>
              <div style={{ fontSize: 11, marginTop: 2, color: due !== null && due < 0 ? "#ef4444" : due !== null && due <= 7 ? "#f59e0b" : "#6b7280" }}>
                งวดที่ {nextInstallmentNo}
                {due !== null && due < 0 ? ` · เกิน ${Math.abs(due)} วัน` : due === 0 ? " · วันนี้!" : due !== null ? ` · อีก ${due} วัน` : ""}
              </div>
            </div>
          ) : null}
          {debt.totalMonths ? (
            <div style={{ flex: 1, minWidth: 110, background: "#f9fafb", borderRadius: 10, padding: "8px 10px" }}>
              <div style={{ fontSize: 10, color: "#9ca3af" }}>งวดสุดท้าย</div>
              <div style={{ fontWeight: 700, fontSize: 12, color: "#1a1a2e" }}>{formatDate(getLastDueDate(debt))}</div>
            </div>
          ) : null}
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <button onClick={() => onEdit(debt)} style={{ flex: 1, padding: "8px", borderRadius: 10, border: "1.5px solid #e5e7eb", background: "#fff", fontSize: 12, fontWeight: 600, color: "#374151", cursor: "pointer" }}>✏️ แก้ไข</button>
          {!confirm ? (
            <button onClick={() => setConfirm(true)} style={{ padding: "8px 14px", borderRadius: 10, border: "1.5px solid #fecaca", background: "#fef2f2", fontSize: 12, fontWeight: 600, color: "#dc2626", cursor: "pointer" }}>🗑️</button>
          ) : (
            <button onClick={() => onDelete(debt.id)} style={{ padding: "8px 14px", borderRadius: 10, border: "none", background: "#dc2626", fontSize: 12, fontWeight: 700, color: "#fff", cursor: "pointer" }}>ยืนยันลบ</button>
          )}
        </div>
      </div>
    </div>
  );
}

const EMPTY_FORM = {
  type: "credit_card",
  name: "",
  bank: "KBank",
  totalDebt: "",
  paidAmount: "",
  monthlyPayment: "",
  annualRate: "",
  startDate: today(),
  dueDayOfMonth: "1",
  totalMonths: "",
  note: "",
  active: true,
};

function DebtForm({ editing, onSave, onClose }) {
  const [form, setForm] = useState(() => ({ ...(editing || EMPTY_FORM), dueDayOfMonth: String(getEffectiveDueDay(editing || EMPTY_FORM)) }));
  const [errors, setErrors] = useState({});
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const debtType = DEBT_TYPES.find((t) => t.key === form.type);

  const validate = () => {
    const e = {};
    if (!form.name) e.name = true;
    if (!form.totalDebt || Number.isNaN(parseFloat(form.totalDebt))) e.totalDebt = true;
    if (!form.monthlyPayment || Number.isNaN(parseFloat(form.monthlyPayment))) e.monthlyPayment = true;
    const dueDay = Number(form.dueDayOfMonth);
    if (!form.dueDayOfMonth || Number.isNaN(dueDay) || dueDay < 1 || dueDay > 31) e.dueDayOfMonth = true;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    const existingRecords = editing?.paymentRecords || [];
    const paidAmountFromRecords = existingRecords.filter((r) => !r.deleted).reduce((sum, r) => sum + Number(r.amount || 0), 0);
    onSave({
      ...form,
      id: form.id || genId(),
      totalDebt: parseFloat(form.totalDebt) || 0,
      paidAmount: paidAmountFromRecords || parseFloat(form.paidAmount) || 0,
      monthlyPayment: parseFloat(form.monthlyPayment) || 0,
      annualRate: parseFloat(form.annualRate) || 0,
      dueDayOfMonth: clampDueDay(form.dueDayOfMonth),
      totalMonths: form.totalMonths ? parseInt(form.totalMonths, 10) : null,
      paymentRecords: existingRecords,
    });
  };

  const fieldStyle = (key) => ({ width: "100%", padding: "9px 12px", borderRadius: 8, border: `1.5px solid ${errors[key] ? "#ef4444" : "#e5e7eb"}`, fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box", background: errors[key] ? "#fef2f2" : "#fff" });
  const previewLastDate = form.startDate && form.totalMonths ? getLastDueDate({ ...form, totalMonths: Number(form.totalMonths), dueDayOfMonth: clampDueDay(form.dueDayOfMonth) }) : "";

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 16 }}>
      <div style={{ background: "#fff", borderRadius: 20, maxWidth: 540, width: "100%", boxShadow: "0 24px 80px rgba(0,0,0,0.25)", overflow: "hidden", maxHeight: "90vh", display: "flex", flexDirection: "column" }}>
        <div style={{ background: `linear-gradient(135deg, ${debtType?.color || "#6366f1"}cc, ${debtType?.color || "#6366f1"}88)`, padding: "16px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#fff" }}>{editing ? "✏️ แก้ไขหนี้สิน" : "➕ เพิ่มหนี้สินใหม่"}</h3>
            <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "rgba(255,255,255,0.7)" }}>×</button>
          </div>
        </div>

        <div style={{ overflowY: "auto", flex: 1, padding: "20px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 14px" }}>
            <div style={{ marginBottom: 12, gridColumn: "1 / -1" }}><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 4 }}>ชื่อหนี้</label><input value={form.name} onChange={(e) => set("name", e.target.value)} style={fieldStyle("name")} /></div>
            <div style={{ marginBottom: 12 }}><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 4 }}>ประเภทหนี้</label><select value={form.type} onChange={(e) => set("type", e.target.value)} style={fieldStyle("type")}>{DEBT_TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}</select></div>
            <div style={{ marginBottom: 12 }}><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 4 }}>ธนาคาร</label><select value={form.bank} onChange={(e) => set("bank", e.target.value)} style={fieldStyle("bank")}>{BANK_CARDS.map((b) => <option key={b.name} value={b.name}>{b.name}</option>)}</select></div>
            <div style={{ marginBottom: 12 }}><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 4 }}>ยอดหนี้ทั้งหมด</label><input type="number" value={form.totalDebt} onChange={(e) => set("totalDebt", e.target.value)} style={fieldStyle("totalDebt")} /></div>
            <div style={{ marginBottom: 12 }}><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 4 }}>ผ่อนต่อเดือน</label><input type="number" value={form.monthlyPayment} onChange={(e) => set("monthlyPayment", e.target.value)} style={fieldStyle("monthlyPayment")} /></div>
            <div style={{ marginBottom: 12 }}><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 4 }}>ดอกเบี้ย % ต่อปี</label><input type="number" value={form.annualRate} onChange={(e) => set("annualRate", e.target.value)} style={fieldStyle("annualRate")} /></div>
            <div style={{ marginBottom: 12 }}><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 4 }}>วันเริ่มต้น</label><input type="date" value={form.startDate} onChange={(e) => set("startDate", e.target.value)} style={fieldStyle("startDate")} /></div>
            <div style={{ marginBottom: 12 }}><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 4 }}>วันครบกำหนดรายเดือน</label><input type="number" min={1} max={31} value={form.dueDayOfMonth} onChange={(e) => set("dueDayOfMonth", e.target.value)} style={fieldStyle("dueDayOfMonth")} /></div>
            <div style={{ marginBottom: 12 }}><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 4 }}>จำนวนงวดทั้งหมด</label><input type="number" value={form.totalMonths} onChange={(e) => set("totalMonths", e.target.value)} style={fieldStyle("totalMonths")} /></div>
            <div style={{ marginBottom: 12, gridColumn: "1 / -1" }}><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 4 }}>หมายเหตุ</label><input value={form.note} onChange={(e) => set("note", e.target.value)} style={fieldStyle("note")} /></div>
            {previewLastDate ? <div style={{ marginBottom: 12, gridColumn: "1 / -1", background: "#f9fafb", borderRadius: 10, padding: "10px 12px", border: "1px solid #f3f4f6" }}><div style={{ fontSize: 11, color: "#6b7280", marginBottom: 3 }}>วันชำระงวดสุดท้าย</div><div style={{ fontWeight: 700, fontSize: 13, color: "#1a1a2e" }}>{formatDate(previewLastDate)}</div></div> : null}
          </div>
        </div>

        <div style={{ padding: "12px 20px 20px", borderTop: "1px solid #f3f4f6", display: "flex", gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: 11, borderRadius: 10, border: "1.5px solid #e5e7eb", background: "#fff", fontSize: 13, fontWeight: 600, color: "#6b7280", cursor: "pointer" }}>ยกเลิก</button>
          <button onClick={handleSave} style={{ flex: 2, padding: 11, borderRadius: 10, border: "none", background: debtType?.color || "#6366f1", fontSize: 13, fontWeight: 700, color: "#fff", cursor: "pointer" }}>{editing ? "💾 บันทึก" : "➕ เพิ่มหนี้สิน"}</button>
        </div>
      </div>
    </div>
  );
}

function AmortizationModal({ debt, onClose, onMarkPaid, onUpdateInstallment, onDeleteInstallmentRecord, onBulkMarkPaidToCurrent }) {
  const dueDayOfMonth = getEffectiveDueDay(debt);
  const rows = useMemo(() => calcAmortization(debt.totalDebt, debt.annualRate, debt.monthlyPayment, debt.startDate, dueDayOfMonth, debt.paymentRecords || []), [debt, dueDayOfMonth]);
  const totalInterest = rows.reduce((s, r) => s + r.interest, 0);
  const color = DEBT_TYPES.find((t) => t.key === debt.type)?.color || "#6366f1";
  const [showAll, setShowAll] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [editingInstallmentNo, setEditingInstallmentNo] = useState(null);
  const [editingAmount, setEditingAmount] = useState("");
  const [editingDate, setEditingDate] = useState(today());
  const [editingNote, setEditingNote] = useState("");

  const filteredRows = useMemo(() => {
    if (statusFilter === "all") return rows;
    if (statusFilter === "paid") return rows.filter((r) => r.status === "paid");
    if (statusFilter === "pending") return rows.filter((r) => r.status === "overdue");
    if (statusFilter === "upcoming") return rows.filter((r) => r.status === "upcoming" || r.status === "future");
    return rows;
  }, [rows, statusFilter]);

  const visible = showAll ? filteredRows : filteredRows.slice(0, 12);
  const payableToCurrentRows = rows.filter((r) => !r.isPaid && (daysUntil(r.dueDate) ?? 1) <= 0);
  const payableToCurrentCount = payableToCurrentRows.length;
  const payableToCurrentAmount = payableToCurrentRows.reduce((sum, r) => sum + Number(r.scheduledAmount || 0), 0);

  const startEdit = (row) => {
    setEditingInstallmentNo(row.installmentNo);
    setEditingAmount(String(row.paidAmount || row.scheduledAmount));
    setEditingDate(row.paidDate || today());
    setEditingNote(row.note || "");
  };

  const cancelEdit = () => {
    setEditingInstallmentNo(null);
    setEditingAmount("");
    setEditingDate(today());
    setEditingNote("");
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 16 }}>
      <div style={{ background: "#fff", borderRadius: 20, maxWidth: 980, width: "100%", boxShadow: "0 24px 80px rgba(0,0,0,0.25)", overflow: "hidden", maxHeight: "90vh", display: "flex", flexDirection: "column" }}>
        <div style={{ background: `linear-gradient(135deg, ${color}cc, ${color}88)`, padding: "16px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h3 style={{ margin: "0 0 2px", fontSize: 15, fontWeight: 700, color: "#fff" }}>📊 ตารางผ่อนชำระ</h3>
              <p style={{ margin: 0, fontSize: 12, color: "rgba(255,255,255,0.7)" }}>{debt.name}</p>
            </div>
            <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "rgba(255,255,255,0.7)" }}>×</button>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, padding: "14px 20px", borderBottom: "1px solid #f3f4f6", overflowX: "auto" }}>
          {[
            { label: "ยอดคงค้าง", value: `฿${fmt(Math.max(0, debt.totalDebt - debt.paidAmount))}`, color: "#ef4444" },
            { label: "ผ่อน/เดือน", value: `฿${fmt(debt.monthlyPayment)}`, color },
            { label: "ครบกำหนดทุกเดือน", value: `วันที่ ${dueDayOfMonth}`, color: "#6b7280" },
            { label: "วันต้องจ่ายงวดถัดไป", value: rows.find((r) => !r.isPaid)?.dueDate ? formatDate(rows.find((r) => !r.isPaid)?.dueDate) : "ชำระครบแล้ว", color: "#6366f1" },
            { label: "จำนวนงวดที่เหลือ", value: `${rows.filter((r) => !r.isPaid).length} งวด`, color: "#6b7280" },
            { label: "ดอกเบี้ยรวม", value: `฿${fmt(totalInterest)}`, color: "#f59e0b" },
          ].map((s) => (
            <div key={s.label} style={{ flex: "0 0 auto", minWidth: 120, background: "#f9fafb", borderRadius: 10, padding: "8px 12px" }}>
              <div style={{ fontSize: 10, color: "#9ca3af", marginBottom: 2 }}>{s.label}</div>
              <div style={{ fontWeight: 700, fontSize: 13, color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>

        <div style={{ padding: "10px 20px 0", display: "flex", gap: 6, flexWrap: "wrap", borderBottom: "1px solid #f3f4f6", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {[
              { key: "all", label: "ทั้งหมด" },
              { key: "paid", label: "จ่ายแล้ว" },
              { key: "pending", label: "ค้าง" },
              { key: "upcoming", label: "งวดถัดไปเป็นต้นไป" },
            ].map((f) => (
              <button key={f.key} onClick={() => setStatusFilter(f.key)} style={{ padding: "5px 12px", borderRadius: 99, fontSize: 12, fontWeight: 600, border: `1.5px solid ${statusFilter === f.key ? color : "#e5e7eb"}`, background: statusFilter === f.key ? color + "15" : "#fff", color: statusFilter === f.key ? color : "#6b7280", cursor: "pointer", marginBottom: 10 }}>
                {f.label}
              </button>
            ))}
          </div>

          <button
            onClick={onBulkMarkPaidToCurrent}
            disabled={payableToCurrentCount === 0}
            style={{
              padding: "6px 12px",
              borderRadius: 10,
              border: "none",
              background: payableToCurrentCount === 0 ? "#e5e7eb" : "#16a34a",
              color: payableToCurrentCount === 0 ? "#9ca3af" : "#fff",
              fontSize: 12,
              fontWeight: 700,
              cursor: payableToCurrentCount === 0 ? "not-allowed" : "pointer",
              marginBottom: 10,
            }}
            title={payableToCurrentCount === 0 ? "ไม่มีงวดที่ต้องจ่ายถึงปัจจุบัน" : `จ่าย ${payableToCurrentCount} งวด รวม ฿${fmt(payableToCurrentAmount)}`}
          >
            ✅ จ่ายให้ครบถึงงวดปัจจุบัน{payableToCurrentCount > 0 ? ` (${payableToCurrentCount} งวด)` : ""}
          </button>
        </div>

        <div style={{ overflowY: "auto", flex: 1 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead style={{ position: "sticky", top: 0, background: "#f9fafb", zIndex: 1 }}>
              <tr>
                {[
                  "งวด",
                  "วันครบกำหนด",
                  "ยอดงวด",
                  "เงินต้น",
                  "ดอกเบี้ย",
                  "คงเหลือ",
                  "สถานะ",
                  "จัดการ",
                ].map((h) => (
                  <th key={h} style={{ padding: "10px 12px", textAlign: h === "งวด" || h === "วันครบกำหนด" || h === "สถานะ" || h === "จัดการ" ? "left" : "right", fontWeight: 600, color: "#6b7280", fontSize: 11, whiteSpace: "nowrap", borderBottom: "1px solid #f3f4f6" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map((r, i) => (
                <tr key={i} style={{ borderBottom: "1px solid #f9fafb", background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                  <td style={{ padding: "8px 12px", fontWeight: 600, color: "#6b7280" }}>{r.installmentNo}</td>
                  <td style={{ padding: "8px 12px", color: "#374151" }}>{formatDate(r.dueDate)}</td>
                  <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: 600, color: "#374151" }}>฿{fmt(r.isPaid ? r.paidAmount : r.scheduledAmount)}</td>
                  <td style={{ padding: "8px 12px", textAlign: "right", color }}>{fmt(r.principal)}</td>
                  <td style={{ padding: "8px 12px", textAlign: "right", color: "#f59e0b" }}>฿{fmt(r.interest)}</td>
                  <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: 600, color: r.balance < 1 ? "#22c55e" : "#ef4444" }}>{r.balance < 1 ? "฿0" : `฿${fmt(r.balance)}`}</td>
                  <td style={{ padding: "8px 12px" }}>
                    {r.isPaid ? (
                      <span style={{ fontSize: 11, fontWeight: 700, color: "#16a34a" }}>✅ จ่ายแล้ว</span>
                    ) : r.status === "overdue" ? (
                      <span style={{ fontSize: 11, fontWeight: 700, color: "#dc2626" }}>ค้าง</span>
                    ) : r.status === "upcoming" ? (
                      <span style={{ fontSize: 11, fontWeight: 700, color: "#d97706" }}>งวดถัดไป</span>
                    ) : r.isLastInstallment ? (
                      <span style={{ fontSize: 11, fontWeight: 700, color: "#6b7280" }}>งวดสุดท้าย</span>
                    ) : (
                      <span style={{ fontSize: 11, fontWeight: 700, color: "#6b7280" }}>{`งวดอีก ${r.futureMonthsAhead + 1} เดือน`}</span>
                    )}
                    {r.paidDate ? <div style={{ fontSize: 10, color: "#9ca3af", marginTop: 2 }}>{formatDate(r.paidDate)}</div> : null}
                  </td>
                  <td style={{ padding: "8px 12px" }}>
                    {r.isPaid ? (
                      editingInstallmentNo === r.installmentNo ? (
                        <div style={{ display: "grid", gap: 6, minWidth: 180 }}>
                          <input type="number" value={editingAmount} onChange={(e) => setEditingAmount(e.target.value)} style={{ padding: "5px 8px", borderRadius: 7, border: "1px solid #d1d5db", fontSize: 11 }} />
                          <input type="date" value={editingDate} onChange={(e) => setEditingDate(e.target.value)} style={{ padding: "5px 8px", borderRadius: 7, border: "1px solid #d1d5db", fontSize: 11 }} />
                          <input type="text" value={editingNote} onChange={(e) => setEditingNote(e.target.value)} placeholder="หมายเหตุ" style={{ padding: "5px 8px", borderRadius: 7, border: "1px solid #d1d5db", fontSize: 11 }} />
                          <div style={{ display: "flex", gap: 6 }}>
                            <button onClick={() => { onUpdateInstallment(r.installmentNo, { amount: parseFloat(editingAmount) || r.paidAmount, date: editingDate, note: editingNote }); cancelEdit(); }} style={{ padding: "5px 8px", borderRadius: 8, border: "none", background: "#f59e0b", color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>บันทึก</button>
                            <button onClick={cancelEdit} style={{ padding: "5px 8px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", color: "#6b7280", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>ยกเลิก</button>
                          </div>
                        </div>
                      ) : (
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          <button onClick={() => startEdit(r)} style={{ padding: "5px 8px", borderRadius: 8, border: "1px solid #fde68a", background: "#fef9ec", color: "#b45309", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>✏️ แก้</button>
                          <button onClick={() => onDeleteInstallmentRecord(r.installmentNo)} style={{ padding: "5px 8px", borderRadius: 8, border: "1px solid #fecaca", background: "#fef2f2", color: "#dc2626", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>🗑️ ลบ</button>
                        </div>
                      )
                    ) : (
                      <button onClick={() => onMarkPaid(r.installmentNo, { amount: r.scheduledAmount, date: today(), note: "" })} style={{ padding: "5px 10px", borderRadius: 8, border: "none", background: "#22c55e", color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>กดจ่าย</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredRows.length > 12 ? (
            <div style={{ padding: "12px 20px", textAlign: "center" }}>
              <button onClick={() => setShowAll((s) => !s)} style={{ padding: "8px 20px", borderRadius: 10, border: "1.5px solid #e5e7eb", background: "#fff", fontSize: 12, fontWeight: 600, color: "#6b7280", cursor: "pointer" }}>{showAll ? "แสดงน้อยลง" : `แสดงทั้งหมด ${filteredRows.length} งวด`}</button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function SummaryOverview({ debts }) {
  const active = debts.filter((d) => d.active !== false);
  const totalDebt = active.reduce((s, d) => s + (d.totalDebt || 0), 0);
  const totalPaid = active.reduce((s, d) => s + (d.paidAmount || 0), 0);
  const totalRemaining = totalDebt - totalPaid;
  const totalMonthly = active.reduce((s, d) => s + (d.monthlyPayment || 0), 0);
  const overallPct = totalDebt > 0 ? Math.round((totalPaid / totalDebt) * 100) : 0;

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4, marginBottom: 12 }}>
        {[
          { label: "หนี้สินทั้งหมด", value: totalDebt, color: "#ef4444", icon: "💰" },
          { label: "จ่ายไปแล้ว", value: totalPaid, color: "#22c55e", icon: "✅" },
          { label: "ยังคงค้าง", value: totalRemaining, color: "#f59e0b", icon: "⏳" },
          { label: "ผ่อนต่อเดือน", value: totalMonthly, color: "#6366f1", icon: "📅" },
          { label: `ชำระแล้ว (${overallPct}%)`, value: null, color: "#3b82f6", icon: "📊" },
        ].map((c) => (
          <div key={c.label} style={{ flex: "0 0 auto", minWidth: 130, background: "#fff", borderRadius: 14, border: `1.5px solid ${c.color}30`, padding: "12px 14px" }}>
            <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 4 }}>{c.icon} {c.label}</div>
            {c.value !== null ? (
              <div style={{ fontSize: 17, fontWeight: 800, color: c.color }}>฿{fmtShort(c.value)}</div>
            ) : (
              <div>
                <div style={{ background: "#f3f4f6", borderRadius: 99, height: 8, overflow: "hidden", marginBottom: 4 }}>
                  <div style={{ width: `${overallPct}%`, height: "100%", background: "#3b82f6", borderRadius: 99 }} />
                </div>
                <div style={{ fontSize: 13, fontWeight: 800, color: "#3b82f6" }}>{overallPct}%</div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DebtManagementV3() {
  const [debts, setDebts] = useState([]);
  const [config, setConfig] = useState({ profile: { baseCurrency: "THB" } });
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [amortDebt, setAmortDebt] = useState(null);
  const [filterType, setFilterType] = useState("all");
  const [sortBy, setSortBy] = useState("remaining_desc");

  useEffect(() => {
    seedIfEmpty();
    try {
      const d = localStorage.getItem(DEBT_KEY);
      if (d) {
        const parsed = JSON.parse(d).map((item) => {
          const dueDayOfMonth = getEffectiveDueDay(item);
          const paymentRecords = item.paymentRecords || (item.paidMonths ? Array.from({ length: item.paidMonths }, (_, i) => ({
            id: genId(),
            installmentNo: i + 1,
            amount: Number(item.monthlyPayment || 0),
            date: buildMonthlyDueDate(item.startDate, dueDayOfMonth, i),
            note: "migrated",
            deleted: false,
          })) : []);
          return {
            ...item,
            dueDayOfMonth,
            paymentRecords,
          };
        }).map((item) => ({
          ...item,
          paidAmount: item.paymentRecords.filter((r) => !r.deleted).reduce((sum, r) => sum + Number(r.amount || 0), 0),
        }));
        setDebts(parsed);
        localStorage.setItem(DEBT_KEY, JSON.stringify(parsed));
      }
      const c = localStorage.getItem(CONFIG_KEY);
      if (c) setConfig(JSON.parse(c));
    } catch (e) {
      console.error(e);
    }
  }, []);

  const saveDebts = (data) => {
    setDebts(data);
    try {
      localStorage.setItem(DEBT_KEY, JSON.stringify(data));
    } catch (e) {
      console.error(e);
    }
  };

  const handleSave = (debt) => {
    const idx = debts.findIndex((d) => d.id === debt.id);
    const next = idx >= 0 ? debts.map((d) => (d.id === debt.id ? debt : d)) : [debt, ...debts];
    saveDebts(next);
    setShowForm(false);
    setEditing(null);
  };

  const handleDelete = (id) => saveDebts(debts.filter((d) => d.id !== id));
  const handleEdit = (debt) => {
    setEditing(debt);
    setShowForm(true);
  };

  const updateDebtPaymentRecords = (debtId, updater) => {
    const next = debts.map((debt) => {
      if (debt.id !== debtId) return debt;
      const nextRecords = updater([...(debt.paymentRecords || [])]);
      return {
        ...debt,
        paymentRecords: nextRecords,
        paidAmount: nextRecords.filter((r) => !r.deleted).reduce((sum, r) => sum + Number(r.amount || 0), 0),
      };
    });
    saveDebts(next);
    const updated = next.find((d) => d.id === debtId);
    if (updated) setAmortDebt(updated);
  };

  const filtered = useMemo(() => {
    const list = filterType === "all" ? debts : debts.filter((d) => d.type === filterType);
    return [...list].sort((a, b) => {
      const remA = Math.max(0, a.totalDebt - a.paidAmount);
      const remB = Math.max(0, b.totalDebt - b.paidAmount);
      if (sortBy === "remaining_desc") return remB - remA;
      if (sortBy === "remaining_asc") return remA - remB;
      if (sortBy === "monthly_desc") return (b.monthlyPayment || 0) - (a.monthlyPayment || 0);
      if (sortBy === "rate_desc") return (b.annualRate || 0) - (a.annualRate || 0);
      return 0;
    });
  }, [debts, filterType, sortBy]);

  const dueSoon = debts.filter((d) => {
    const nextDue = getNextDueDate(d);
    const dd = daysUntil(nextDue);
    return dd !== null && dd >= 0 && dd <= 7;
  });

  return (
    <div style={{ fontFamily: "'Noto Sans Thai','Sarabun',sans-serif", minHeight: "100vh", background: "#f8f9fb" }}>
      <div style={{ background: "linear-gradient(135deg,#1a1a2e,#16213e,#0f3460)", padding: "20px 20px 16px" }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 34, height: 34, borderRadius: 9, background: "#ef4444", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>💳</div>
                <span style={{ fontSize: 20, fontWeight: 800, color: "#fff" }}>FinFlow</span>
                <span style={{ fontSize: 11, padding: "2px 8px", background: "rgba(255,255,255,0.12)", borderRadius: 99, color: "rgba(255,255,255,0.7)" }}>DEBT V3</span>
              </div>
              <p style={{ margin: "4px 0 0 44px", fontSize: 12, color: "rgba(255,255,255,0.5)" }}>{debts.length} รายการหนี้</p>
            </div>
            <button onClick={() => { setEditing(null); setShowForm(true); }} style={{ padding: "9px 18px", background: "#ef4444", color: "#fff", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>+ เพิ่มหนี้สิน</button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 960, margin: "0 auto", padding: "20px 16px 60px" }}>
        {dueSoon.length > 0 ? (
          <div style={{ background: "#fef9ec", borderRadius: 14, border: "1.5px solid #fde68a", padding: "12px 16px", marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 20 }}>⏰</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 13, color: "#92400e" }}>ครบกำหนดชำระใน 7 วัน</div>
              <div style={{ fontSize: 12, color: "#b45309" }}>{dueSoon.map((d) => d.name).join(" · ")}</div>
            </div>
          </div>
        ) : null}

        <SummaryOverview debts={debts} />

        <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ display: "flex", gap: 6, flex: 1, flexWrap: "wrap" }}>
            <button onClick={() => setFilterType("all")} style={{ padding: "5px 14px", borderRadius: 99, fontSize: 12, fontWeight: 500, cursor: "pointer", border: `1.5px solid ${filterType === "all" ? "#6366f1" : "#e5e7eb"}`, background: filterType === "all" ? "#6366f115" : "#fff", color: filterType === "all" ? "#6366f1" : "#9ca3af" }}>ทั้งหมด ({debts.length})</button>
            {DEBT_TYPES.filter((t) => debts.some((d) => d.type === t.key)).map((t) => (
              <button key={t.key} onClick={() => setFilterType(t.key)} style={{ padding: "5px 14px", borderRadius: 99, fontSize: 12, fontWeight: 500, cursor: "pointer", border: `1.5px solid ${filterType === t.key ? t.color : "#e5e7eb"}`, background: filterType === t.key ? t.color + "15" : "#fff", color: filterType === t.key ? t.color : "#9ca3af" }}>{t.icon} {t.label}</button>
            ))}
          </div>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{ padding: "6px 12px", borderRadius: 99, fontSize: 12, fontWeight: 600, border: "1.5px solid #e5e7eb", background: "#fff", color: "#6b7280", cursor: "pointer" }}>
            <option value="remaining_desc">ยอดค้างมากสุดก่อน</option>
            <option value="remaining_asc">ยอดค้างน้อยสุดก่อน</option>
            <option value="monthly_desc">ผ่อนต่อเดือนมากสุด</option>
            <option value="rate_desc">ดอกเบี้ยสูงสุดก่อน</option>
          </select>
        </div>

        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#9ca3af" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>💳</div>
            <p style={{ fontWeight: 600, fontSize: 15, color: "#6b7280" }}>ยังไม่มีหนี้สิน</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
            {filtered.map((debt) => {
              const dt = DEBT_TYPES.find((t) => t.key === debt.type) || DEBT_TYPES[5];
              return (
                <div key={debt.id}>
                  <DebtVisualCard debt={debt} color={dt.color} icon={dt.icon} onEdit={handleEdit} onDelete={handleDelete} />
                  {debt.type === "mortgage" || debt.type === "car" || debt.type === "personal" || debt.type === "installment" ? (
                    <button onClick={() => setAmortDebt(debt)} style={{ width: "100%", marginTop: 6, padding: "8px", background: dt.color + "10", border: `1.5px solid ${dt.color}22`, borderRadius: 10, fontSize: 12, fontWeight: 600, color: dt.color, cursor: "pointer" }}>📊 ดูตารางผ่อนชำระ</button>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showForm ? <DebtForm editing={editing} onSave={handleSave} onClose={() => { setShowForm(false); setEditing(null); }} /> : null}
      {amortDebt ? (
        <AmortizationModal
          debt={amortDebt}
          onClose={() => setAmortDebt(null)}
          onMarkPaid={(installmentNo, payload) => {
            updateDebtPaymentRecords(amortDebt.id, (records) => {
              const existed = records.find((r) => r.installmentNo === installmentNo && !r.deleted);
              if (existed) return records;
              return [...records, { id: genId(), installmentNo, amount: payload.amount, date: payload.date, note: payload.note || "", deleted: false }];
            });
          }}
          onUpdateInstallment={(installmentNo, payload) => {
            updateDebtPaymentRecords(amortDebt.id, (records) => records.map((r) => (r.installmentNo === installmentNo && !r.deleted ? { ...r, amount: payload.amount, date: payload.date, note: payload.note || "" } : r)));
          }}
          onDeleteInstallmentRecord={(installmentNo) => {
            updateDebtPaymentRecords(amortDebt.id, (records) => records.map((r) => (r.installmentNo === installmentNo && !r.deleted ? { ...r, deleted: true } : r)));
          }}
          onBulkMarkPaidToCurrent={() => {
            updateDebtPaymentRecords(amortDebt.id, (records) => {
              const activeRows = calcAmortization(amortDebt.totalDebt, amortDebt.annualRate, amortDebt.monthlyPayment, amortDebt.startDate, getEffectiveDueDay(amortDebt), records);
              const dueRows = activeRows.filter((r) => !r.isPaid && (daysUntil(r.dueDate) ?? 1) <= 0);
              const existingNos = new Set(records.filter((r) => !r.deleted).map((r) => r.installmentNo));
              const additions = dueRows.filter((r) => !existingNos.has(r.installmentNo)).map((r) => ({
                id: genId(),
                installmentNo: r.installmentNo,
                amount: r.scheduledAmount,
                date: today(),
                note: "bulk paid to current",
                deleted: false,
              }));
              return [...records, ...additions];
            });
          }}
        />
      ) : null}
    </div>
  );
}
