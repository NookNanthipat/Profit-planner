import { useState, useEffect, useMemo } from "react";

const CONFIG_KEY = "finapp_config";
const TX_KEY = "finapp_transactions";
const BUDGET_KEY = "finapp_budgets";

const TYPE_COLORS = {
  income: "#22c55e",
  expense: "#ef4444",
  saving: "#3b82f6",
  investment: "#f59e0b",
};

const TYPE_LABELS = {
  income: "รายได้",
  expense: "รายจ่าย",
  saving: "ออม",
  investment: "ลงทุน",
};

const TYPE_ICONS = {
  income: "↑",
  expense: "↓",
  saving: "🏦",
  investment: "📈",
};

const ALL_TYPES = ["income", "expense", "saving", "investment"];

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function thisMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(ym) {
  if (!ym) return "";
  try {
    return new Date(ym + "-01T00:00:00").toLocaleDateString("th-TH", {
      month: "long",
      year: "numeric",
    });
  } catch {
    return ym;
  }
}

function fmt(n) {
  return Number(n || 0).toLocaleString("th-TH", { maximumFractionDigits: 0 });
}

function pct(actual, budget) {
  return budget > 0 ? Math.min(Math.round((actual / budget) * 100), 999) : 0;
}

function money(n, ccy = "THB") {
  const sym = ccy === "THB" ? "฿" : ccy === "USD" ? "$" : ccy;
  return `${sym}${Number(n || 0).toLocaleString("th-TH", {
    maximumFractionDigits: 0,
  })}`;
}

function ProgressBar({ value, max, color, height = 8, warn = false }) {
  const p = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const barColor =
    value > max && max > 0 ? "#ef4444" : warn && p >= 80 ? "#f59e0b" : color || "#6366f1";

  return (
    <div
      style={{
        background: "#f3f4f6",
        borderRadius: 99,
        height,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: `${p}%`,
          height: "100%",
          background: barColor,
          borderRadius: 99,
          transition: "width 0.4s ease",
        }}
      />
    </div>
  );
}

function Badge({ color, children, style = {} }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "2px 9px",
        borderRadius: 99,
        fontSize: 11,
        fontWeight: 600,
        background: color + "18",
        color,
        border: `1px solid ${color}33`,
        ...style,
      }}
    >
      {children}
    </span>
  );
}

function Pill({ active, onClick, color, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "5px 14px",
        borderRadius: 99,
        fontSize: 12,
        fontWeight: 500,
        border: `1.5px solid ${active ? color : "#e5e7eb"}`,
        background: active ? color + "15" : "#fff",
        color: active ? color : "#9ca3af",
        cursor: "pointer",
        transition: "all 0.15s",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </button>
  );
}

function FancySelect({ label, value, onChange, options, placeholder = "เลือก..." }) {
  return (
    <div style={{ minWidth: 0 }}>
      {label && (
        <label
          style={{
            display: "block",
            fontSize: 11,
            fontWeight: 600,
            color: "#6b7280",
            marginBottom: 4,
          }}
        >
          {label}
        </label>
      )}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%",
          padding: "9px 12px",
          borderRadius: 8,
          border: "1.5px solid #e5e7eb",
          fontSize: 13,
          background: "#fff",
        }}
      >
        {!value && <option value="">{placeholder}</option>}
        {options.map((o) => {
          const optionValue = typeof o === "object" ? o.value : o;
          const optionLabel = typeof o === "object" ? o.label : o;
          return (
            <option key={String(optionValue)} value={optionValue}>
              {optionLabel}
            </option>
          );
        })}
      </select>
    </div>
  );
}

// ============================================================================
// BUDGET FORM (REWRITTEN FOR STRICT DATA MODEL)
// ============================================================================
function BudgetForm({ config, currentYear, currentMonth, budgets, onSave, onClose }) {
  const grouped = useMemo(() => {
    const map = { income: [], expense: [], saving: [], investment: [] };
    
    // 1. ดึงโครงสร้างหมวดหมู่หลักมาจาก Config
    (config.categories || []).forEach((c) => {
      if (!c.type || c.type === "debt") return;
      map[c.type].push({ main: String(c.main || "").trim(), sub: String(c.sub || "").trim() });
    });

    // 2. ดึงโครงสร้างหมวดหมู่ที่เคยมีข้อมูลอยู่แล้ว แต่ไม่มีใน Config (ป้องกันข้อมูลหาย)
    (budgets || []).forEach((b) => {
      if (b.year === currentYear && b.month === currentMonth && map[b.type]) {
        const exist = map[b.type].find(x => x.main === b.mainCat && x.sub === b.subCat);
        if (!exist) {
          map[b.type].push({ main: b.mainCat, sub: b.subCat });
        }
      }
    });

    return map;
  }, [config.categories, budgets, currentYear, currentMonth]);

  const existing = useMemo(() => {
    const m = {};
    (budgets || [])
      .filter((b) => b.year === currentYear && b.month === currentMonth)
      .forEach((b) => {
        m[`${b.type}__${b.mainCat}__${b.subCat}`] = b.amount;
      });
    return m;
  }, [budgets, currentYear, currentMonth]);

  const [values, setValues] = useState(existing);
  const [typeTab, setTypeTab] = useState("expense");

  useEffect(() => {
    setValues(existing);
  }, [existing]);

  const set = (type, main, sub, val) =>
    setValues((v) => ({ ...v, [`${type}__${main}__${sub}`]: val === "" ? "" : val }));

  const get = (type, main, sub) => values[`${type}__${main}__${sub}`] ?? "";

  const handleSave = () => {
    const newEntries = [];
    Object.entries(values).forEach(([key, v]) => {
      const amount = parseFloat(String(v));
      if (isNaN(amount) || amount <= 0) return; // ถ้าลบให้เป็น 0 หรือว่างเปล่า จะถูกตัดทิ้ง (ล้าง Ghost Data)
      
      const [type, mainCat, subCat] = key.split("__");
      const existingBudget = (budgets || []).find(
        (b) => b.year === currentYear && b.month === currentMonth && b.type === type && b.mainCat === mainCat && b.subCat === subCat
      );

      newEntries.push({
        id: existingBudget?.id || genId(),
        year: currentYear,
        month: currentMonth,
        type,
        mainCat,
        subCat,
        amount,
        note: existingBudget?.note || ""
      });
    });

    // ล้างข้อมูลทั้งหมดของเดือนนี้ แล้วใส่ก้อนใหม่ที่กรองข้อมูลซ้ำซ้อนแล้วลงไปแทน
    const otherMonthsAndTypes = (budgets || []).filter((b) => !(b.year === currentYear && b.month === currentMonth));
    onSave([...otherMonthsAndTypes, ...newEntries]);
  };

  const totalBudget = Object.entries(values)
    .filter(([k]) => k.startsWith(typeTab + "__"))
    .reduce((s, [, v]) => s + (parseFloat(String(v)) || 0), 0);

  const cats = grouped[typeTab] || [];

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
        padding: 16,
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 20,
          maxWidth: 520,
          width: "100%",
          boxShadow: "0 24px 80px rgba(0,0,0,0.25)",
          overflow: "hidden",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ background: "linear-gradient(135deg,#1a1a2e,#16213e)", padding: "16px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h3 style={{ margin: "0 0 2px", fontSize: 15, fontWeight: 700, color: "#fff" }}>
                📊 ตั้งงบประมาณ
              </h3>
              <p style={{ margin: 0, fontSize: 12, color: "rgba(255,255,255,0.6)" }}>
                {monthLabel(`${currentYear}-${currentMonth}`)}
              </p>
            </div>
            <button
              onClick={onClose}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: 20,
                color: "rgba(255,255,255,0.6)",
              }}
            >
              ×
            </button>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: 6,
            padding: "12px 20px 0",
            borderBottom: "1px solid #f3f4f6",
            overflowX: "auto",
          }}
        >
          {ALL_TYPES.map((k) => (
            <button
              key={k}
              onClick={() => setTypeTab(k)}
              style={{
                padding: "8px 16px",
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: typeTab === k ? 700 : 400,
                color: typeTab === k ? TYPE_COLORS[k] : "#6b7280",
                borderBottom: typeTab === k ? `2px solid ${TYPE_COLORS[k]}` : "2px solid transparent",
              }}
            >
              {TYPE_ICONS[k]} {TYPE_LABELS[k]}
            </button>
          ))}
        </div>

        <div style={{ overflowY: "auto", flex: 1, padding: "16px 20px" }}>
          {cats.length === 0 ? (
            <div style={{ textAlign: "center", padding: "30px 0", color: "#9ca3af" }}>
              <p style={{ margin: 0, fontSize: 13 }}>ยังไม่มีหมวดหมู่สำหรับ{TYPE_LABELS[typeTab]}</p>
              <p style={{ margin: "4px 0 0", fontSize: 12 }}>ไปที่ Setup → หมวดหมู่ เพื่อเพิ่ม</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "8px 12px",
                  background: TYPE_COLORS[typeTab] + "10",
                  borderRadius: 10,
                  border: `1px solid ${TYPE_COLORS[typeTab]}22`,
                }}
              >
                <span style={{ fontSize: 12, fontWeight: 600, color: TYPE_COLORS[typeTab] }}>
                  รวม{TYPE_LABELS[typeTab]}ที่ตั้งงบ
                </span>
                <span style={{ fontSize: 14, fontWeight: 800, color: TYPE_COLORS[typeTab] }}>
                  ฿{fmt(totalBudget)}
                </span>
              </div>

              {cats.map((cat, idx) => {
                const label = cat.sub ? `${cat.main} - ${cat.sub}` : cat.main;
                return (
                  <div
                    key={idx}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "10px 14px",
                      background: "#f9fafb",
                      borderRadius: 10,
                      border: "1px solid #f3f4f6",
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 13, color: "#1a1a2e" }}>{label}</div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 12, color: "#9ca3af" }}>฿</span>
                      <input
                        type="number"
                        min={0}
                        placeholder="0"
                        value={String(get(typeTab, cat.main, cat.sub))}
                        onChange={(e) => set(typeTab, cat.main, cat.sub, e.target.value)}
                        style={{
                          width: 110,
                          padding: "7px 10px",
                          borderRadius: 8,
                          border: `1.5px solid ${
                            get(typeTab, cat.main, cat.sub) ? TYPE_COLORS[typeTab] + "66" : "#e5e7eb"
                          }`,
                          fontSize: 13,
                          textAlign: "right",
                          fontWeight: 600,
                          background: get(typeTab, cat.main, cat.sub) ? TYPE_COLORS[typeTab] + "08" : "#fff",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div
          style={{
            padding: "12px 20px 20px",
            borderTop: "1px solid #f3f4f6",
            display: "flex",
            gap: 10,
          }}
        >
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: 11,
              borderRadius: 10,
              border: "1.5px solid #e5e7eb",
              background: "#fff",
              fontSize: 13,
              fontWeight: 600,
              color: "#6b7280",
              cursor: "pointer",
            }}
          >
            ยกเลิก
          </button>
          <button
            onClick={handleSave}
            style={{
              flex: 2,
              padding: 11,
              borderRadius: 10,
              border: "none",
              background: "#6366f1",
              fontSize: 13,
              fontWeight: 700,
              color: "#fff",
              cursor: "pointer",
            }}
          >
            💾 บันทึกงบประมาณ
          </button>
        </div>
      </div>
    </div>
  );
}

function GenerateYearModal({ open, targetYear, targetMonth, onClose, onConfirm }) {
  const [scope, setScope] = useState("all");
  const [mode, setMode] = useState("fill_empty");

  useEffect(() => {
    setScope("all");
    setMode("fill_empty");
  }, [open]);

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 200,
        padding: 16,
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 16,
          maxWidth: 380,
          width: "100%",
          padding: 24,
          boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
        }}
      >
        <h3 style={{ margin: "0 0 6px", fontSize: 15, fontWeight: 700 }}>
          🪄 Gen งบให้เหมือนกันทั้งปี
        </h3>
        <p style={{ margin: "0 0 16px", fontSize: 13, color: "#6b7280" }}>
          คัดลอกงบจาก {monthLabel(`${targetYear}-${targetMonth}`)} ไปยังทุกเดือนในปีเดียวกัน
        </p>

        <div style={{ display: "grid", gap: 12, marginBottom: 16 }}>
          <FancySelect
            label="ขอบเขต"
            value={scope}
            onChange={setScope}
            options={[
              { value: "all", label: "ทุกประเภท" },
              { value: "income", label: "เฉพาะรายได้" },
              { value: "expense", label: "เฉพาะรายจ่าย" },
              { value: "saving", label: "เฉพาะเงินออม" },
              { value: "investment", label: "เฉพาะการลงทุน" },
            ]}
          />
          <FancySelect
            label="วิธีเขียนทับ"
            value={mode}
            onChange={setMode}
            options={[
              { value: "fill_empty", label: "เฉพาะช่องที่ยังว่าง" },
              { value: "overwrite", label: "เขียนทับทุกช่อง" },
            ]}
          />
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: 10,
              borderRadius: 10,
              border: "1.5px solid #e5e7eb",
              background: "#fff",
              cursor: "pointer",
              fontWeight: 600,
              color: "#6b7280",
            }}
          >
            ยกเลิก
          </button>
          <button
            onClick={() => onConfirm({ scope, mode })}
            style={{
              flex: 2,
              padding: 10,
              borderRadius: 10,
              border: "none",
              background: "#6366f1",
              cursor: "pointer",
              fontWeight: 700,
              color: "#fff",
            }}
          >
            📋 Gen ทั้งปี
          </button>
        </div>
      </div>
    </div>
  );
}

function ConfirmGenerateModal({ open, payload, onClose, onConfirm, year, month }) {
  if (!open || !payload) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 220,
        padding: 16,
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 16,
          maxWidth: 400,
          width: "100%",
          padding: 24,
          boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
        }}
      >
        <h3 style={{ margin: "0 0 8px", fontSize: 15, fontWeight: 700 }}>
          ⚠️ ยืนยันการ Gen งบทั้งปี
        </h3>

        <div style={{ display: "grid", gap: 6, marginBottom: 16, fontSize: 13, color: "#4b5563" }}>
          <div>
            เดือนต้นแบบ: <strong>{monthLabel(`${year}-${month}`)}</strong>
          </div>
          <div>
            ขอบเขต: <strong>{payload.scope === "all" ? "ทุกประเภท" : TYPE_LABELS[payload.scope]}</strong>
          </div>
          <div>
            โหมด: <strong>{payload.mode === "fill_empty" ? "เฉพาะช่องที่ยังว่าง" : "เขียนทับทุกช่อง"}</strong>
          </div>
        </div>

        <div
          style={{
            padding: "10px 12px",
            borderRadius: 10,
            background: payload.mode === "overwrite" ? "#fef2f2" : "#eff6ff",
            border: `1px solid ${payload.mode === "overwrite" ? "#fecaca" : "#bfdbfe"}`,
            marginBottom: 16,
            fontSize: 12,
            color: payload.mode === "overwrite" ? "#b91c1c" : "#1d4ed8",
          }}
        >
          {payload.mode === "overwrite"
            ? "การทำรายการนี้จะเขียนทับงบเดิมของเดือนอื่นในปีเดียวกัน"
            : "การทำรายการนี้จะเติมเฉพาะช่องที่ยังไม่มีงบหรือเป็น 0"}
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: 10,
              borderRadius: 10,
              border: "1.5px solid #e5e7eb",
              background: "#fff",
              cursor: "pointer",
              fontWeight: 600,
              color: "#6b7280",
            }}
          >
            ยกเลิก
          </button>
          <button
            onClick={onConfirm}
            style={{
              flex: 2,
              padding: 10,
              borderRadius: 10,
              border: "none",
              background: "#6366f1",
              cursor: "pointer",
              fontWeight: 700,
              color: "#fff",
            }}
          >
            ✅ ยืนยัน
          </button>
        </div>
      </div>
    </div>
  );
}

function BudgetRow({ type, categoryLabel, budgetAmount, actualAmount, onClick }) {
  const color = TYPE_COLORS[type];
  const p = pct(actualAmount, budgetAmount);
  const isOver = actualAmount > budgetAmount && budgetAmount > 0;
  const isNoBudget = budgetAmount === 0;
  const isWarn = !isOver && p >= 80;

  return (
    <div
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "11px 14px",
        background: "#fff",
        borderRadius: 12,
        border: `1.5px solid ${isOver ? "#fecaca" : isWarn ? "#fde68a" : "#f3f4f6"}`,
        cursor: onClick ? "pointer" : "default",
      }}
    >
      <div
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: color,
          flexShrink: 0,
        }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 5,
          }}
        >
          <span
            style={{
              fontWeight: 600,
              fontSize: 13,
              color: "#1a1a2e",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {categoryLabel}
          </span>
          <div
            style={{
              display: "flex",
              gap: 8,
              alignItems: "center",
              flexShrink: 0,
              marginLeft: 8,
            }}
          >
            {isOver && (
              <Badge color="#ef4444" style={{ fontSize: 10 }}>
                เกินงบ
              </Badge>
            )}
            {isWarn && (
              <Badge color="#f59e0b" style={{ fontSize: 10 }}>
                ใกล้เต็ม
              </Badge>
            )}
            {isNoBudget && actualAmount > 0 && (
              <Badge color="#9ca3af" style={{ fontSize: 10 }}>
                ไม่ได้ตั้งงบ
              </Badge>
            )}
            <span style={{ fontSize: 12, fontWeight: 700, color: isOver ? "#ef4444" : "#374151" }}>
              ฿{fmt(actualAmount)}
              {!isNoBudget && (
                <span style={{ fontWeight: 400, color: "#9ca3af" }}> / ฿{fmt(budgetAmount)}</span>
              )}
            </span>
          </div>
        </div>

        {!isNoBudget ? (
          <ProgressBar value={actualAmount} max={budgetAmount} color={color} height={5} warn={true} />
        ) : (
          <div style={{ height: 5, background: "#f3f4f6", borderRadius: 99 }} />
        )}
      </div>

      {!isNoBudget && (
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: isOver ? "#ef4444" : isWarn ? "#f59e0b" : "#9ca3af",
            minWidth: 36,
            textAlign: "right",
            flexShrink: 0,
          }}
        >
          {p}%
        </div>
      )}
    </div>
  );
}

function TypeSection({ type, budgets, actuals, annualStats, monthStr, onEdit }) {
  const color = TYPE_COLORS[type];
  const label = TYPE_LABELS[type];
  const icon = TYPE_ICONS[type];

  // รวบรวมคีย์ทั้งหมดของ หมวดหลัก__หมวดย่อย จากทั้งการตั้งงบและค่าใช้จ่ายจริง
  const budgetKeys = budgets.map((b) => `${b.mainCat}__${b.subCat}`);
  const actualKeys = Object.keys(actuals);
  const allKeys = [...new Set([...budgetKeys, ...actualKeys])].sort();

  const totalBudget = budgets.reduce((s, b) => s + (b.amount || 0), 0);
  const totalActual = Object.values(actuals).reduce((s, v) => s + v, 0);
  const totalPct = pct(totalActual, totalBudget);
  const isOver = totalActual > totalBudget && totalBudget > 0;

  if (allKeys.length === 0) return null;

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 9,
            background: color + "15",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 16,
            flexShrink: 0,
          }}
        >
          {icon}
        </div>
        <div style={{ flex: 1, minWidth: 220 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 3,
              gap: 8,
            }}
          >
            <span style={{ fontWeight: 700, fontSize: 15, color: "#1a1a2e" }}>{label}</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: isOver ? "#ef4444" : "#374151" }}>
              ฿{fmt(totalActual)}
              {totalBudget > 0 && (
                <span style={{ fontWeight: 400, color: "#9ca3af" }}> / ฿{fmt(totalBudget)}</span>
              )}
            </span>
          </div>
          {totalBudget > 0 && <ProgressBar value={totalActual} max={totalBudget} color={color} height={6} warn={true} />}
        </div>
        {totalBudget > 0 && (
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: isOver ? "#ef4444" : "#9ca3af",
              minWidth: 36,
              textAlign: "right",
            }}
          >
            {totalPct}%
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
        <Badge color={color}>{label}ทั้งปี {money(annualStats.annualActual)}</Badge>
        <Badge color="#2563eb">เฉลี่ยต่อเดือน {money(annualStats.avgMonthlyActual)}</Badge>
        <Badge color={color}>{monthLabel(monthStr)}</Badge>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {allKeys.map((key) => {
          const [mainCat, subCat] = key.split("__");
          const bud = budgets.find((b) => b.mainCat === mainCat && b.subCat === subCat);
          const categoryLabel = subCat ? `${mainCat} - ${subCat}` : mainCat;
          return (
            <BudgetRow
              key={key}
              type={type}
              categoryLabel={categoryLabel}
              budgetAmount={bud?.amount || 0}
              actualAmount={actuals[key] || 0}
              onClick={onEdit}
            />
          );
        })}
      </div>
    </div>
  );
}

function SummaryCards({ budgets, actuals, currentYear, currentMonth }) {
  const monthBudgets = budgets.filter((b) => b.year === currentYear && b.month === currentMonth);

  const totalByType = (type) => ({
    budget: monthBudgets.filter((b) => b.type === type).reduce((s, b) => s + b.amount, 0),
    actual: Object.entries(actuals[type] || {}).reduce((s, [, v]) => s + v, 0),
  });

  const income = totalByType("income");
  const expense = totalByType("expense");
  const saving = totalByType("saving");
  const investment = totalByType("investment");

  const netBudget = income.budget - expense.budget - saving.budget - investment.budget;
  const netActual = income.actual - expense.actual - saving.actual - investment.actual;

  const cards = [
    { label: "รายได้", budget: income.budget, actual: income.actual, color: "#22c55e" },
    { label: "รายจ่าย", budget: expense.budget, actual: expense.actual, color: "#ef4444" },
    { label: "ออม", budget: saving.budget, actual: saving.actual, color: "#3b82f6" },
    { label: "ลงทุน", budget: investment.budget, actual: investment.actual, color: "#f59e0b" },
    {
      label: "เหลือสุทธิ (งบ)",
      budget: null,
      actual: netActual,
      color: netActual >= 0 ? "#22c55e" : "#ef4444",
      netBudget,
    },
  ];

  return (
    <div style={{ display: "flex", gap: 8, marginBottom: 20, overflowX: "auto", paddingBottom: 4 }}>
      {cards.map((c) => {
        const p = c.budget != null ? pct(c.actual, c.budget) : null;
        const isOver = c.budget != null && c.actual > c.budget && c.budget > 0;

        return (
          <div
            key={c.label}
            style={{
              flex: "0 0 auto",
              minWidth: 130,
              background: "#fff",
              borderRadius: 14,
              border: `1.5px solid ${c.color}30`,
              padding: "12px 14px",
            }}
          >
            <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 4 }}>{c.label}</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: c.color }}>฿{fmt(c.actual)}</div>

            {c.budget != null && c.budget > 0 && (
              <>
                <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 5 }}>งบ ฿{fmt(c.budget)}</div>
                <ProgressBar value={c.actual} max={c.budget} color={c.color} height={4} warn={true} />
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: isOver ? "#ef4444" : "#9ca3af",
                    marginTop: 3,
                  }}
                >
                  {p}%
                </div>
              </>
            )}

            {c.netBudget != null && (
              <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>
                งบสุทธิ ฿{fmt(c.netBudget)}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function BudgetMobileV2() {
  const [config, setConfig] = useState({
    profile: { baseCurrency: "THB" },
    accounts: [],
    categories: [],
    goals: [],
    people: [],
  });
  const [transactions, setTransactions] = useState([]);
  const [budgets, setBudgets] = useState([]); 
  
  const [monthStr, setMonthStr] = useState(thisMonth()); 
  const currentYear = monthStr.split('-')[0];
  const currentMonth = monthStr.split('-')[1];

  const [showForm, setShowForm] = useState(false);
  const [showGenerateYear, setShowGenerateYear] = useState(false);
  const [pendingGenerate, setPendingGenerate] = useState(null);
  const [activeType, setActiveType] = useState("all");

  useEffect(() => {
    try {
      const cfg = localStorage.getItem(CONFIG_KEY);
      if (cfg) setConfig(JSON.parse(cfg));

      const tx = localStorage.getItem(TX_KEY);
      if (tx) setTransactions(JSON.parse(tx));

      const bg = localStorage.getItem(BUDGET_KEY);
      if (bg) {
        const parsedBg = JSON.parse(bg);
        const map = new Map();
        
        // 🌟 Auto-Heal: วนลูปกรองข้อมูลผีออกแบบเด็ดขาด ข้อมูลที่ถูกต้องจะเขียนทับข้อมูลซ้ำทันที
        parsedBg.forEach(b => {
          const y = String(b.year || new Date().getFullYear());
          const m = String(b.month || "01").padStart(2, '0');
          const type = String(b.type || "expense");
          const main = String(b.mainCat || b.category || "").trim();
          const sub = String(b.subCat || "").trim();
          const amt = Number(b.plannedAmount !== undefined ? b.plannedAmount : (b.amount || 0));
          
          const key = `${type}|${main}|${sub}|${y}|${m}`;
          
          // ถ้าเงิน > 0 ให้เก็บลง Map, ข้อมูลตัวล่าสุดจะทับตัวเก่าทันที ทำให้ข้อมูลไม่เด้งเพี้ยน
          if (amt > 0) {
            map.set(key, {
              id: String(b.id || genId()),
              type, year: y, month: m, mainCat: main, subCat: sub,
              amount: amt,
              note: String(b.note || "")
            });
          } else {
            map.delete(key);
          }
        });
        
        setBudgets(Array.from(map.values()));
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const saveBudgets = (data) => {
    setBudgets(data);
    try {
      // 🌟 บันทึกข้อมูลกลับด้วยโครงสร้างเดียวกับ Table View เป๊ะๆ
      const adaptedForTable = data.map(b => ({
        id: b.id,
        year: String(b.year),
        month: String(b.month).padStart(2, '0'),
        type: b.type,
        mainCat: b.mainCat,
        subCat: b.subCat,
        plannedAmount: b.amount, // ให้ฝั่ง Table ดึงไปใช้
        amount: b.amount, // สำรองไว้ให้เวอร์ชันอื่น
        note: b.note
      }));
      localStorage.setItem(BUDGET_KEY, JSON.stringify(adaptedForTable));
    } catch (e) {
      console.error(e);
    }
  };

  const monthOptions = useMemo(() => {
    const now = new Date();
    const options = [];
    for (let i = -11; i <= 3; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      options.push({ value: val, label: monthLabel(val) });
    }
    return options;
  }, []);

  const actuals = useMemo(() => {
    const map = {
      income: {},
      expense: {},
      saving: {},
      investment: {},
    };

    transactions.forEach((tx) => {
      if (!tx.date?.startsWith(monthStr)) return;
      if (!map[tx.type]) return;
      const main = String(tx.mainCat || "").trim();
      const sub = String(tx.subCat || "").trim();
      const key = `${main}__${sub}`;
      map[tx.type][key] = (map[tx.type][key] || 0) + (Number(tx.amount) || 0);
    });

    return map;
  }, [transactions, monthStr]);

  const monthBudgets = useMemo(() => budgets.filter((b) => b.year === currentYear && b.month === currentMonth), [budgets, currentYear, currentMonth]);

  const annualActualByType = useMemo(() => {
    const byType = {};

    ALL_TYPES.forEach((type) => {
      const txs = transactions.filter((tx) => tx.date?.startsWith(currentYear) && tx.type === type);
      const annualActual = txs.reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
      const monthsWithActual = new Set(txs.map((tx) => tx.date.slice(5, 7))).size;
      byType[type] = {
        annualActual,
        avgMonthlyActual: monthsWithActual > 0 ? annualActual / monthsWithActual : 0,
      };
    });

    return byType;
  }, [transactions, currentYear]);

  const requestGenerateYear = ({ scope, mode }) => {
    const sourceBudgets = budgets.filter((b) => b.year === currentYear && b.month === currentMonth && (scope === "all" ? true : b.type === scope));
    if (!sourceBudgets.length) {
      setShowGenerateYear(false);
      return;
    }
    setShowGenerateYear(false);
    setPendingGenerate({ scope, mode, count: sourceBudgets.length });
  };

  const confirmGenerateYear = () => {
    if (!pendingGenerate) return;

    const { scope, mode } = pendingGenerate;
    const sourceBudgets = budgets.filter((b) => b.year === currentYear && b.month === currentMonth && (scope === "all" ? true : b.type === scope));
    const monthsInYear = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0"));

    let next = [...budgets];

    monthsInYear.forEach((targetMonth) => {
      sourceBudgets.forEach((source) => {
        const existingIndex = next.findIndex(
          (b) => b.year === currentYear && b.month === targetMonth && b.type === source.type && b.mainCat === source.mainCat && b.subCat === source.subCat
        );

        if (existingIndex >= 0 && mode === "fill_empty" && Number(next[existingIndex].amount || 0) > 0) {
          return;
        }

        const cloned = {
          ...source,
          id: existingIndex >= 0 ? next[existingIndex].id : genId(),
          month: targetMonth,
        };

        if (existingIndex >= 0) next[existingIndex] = cloned;
        else next.push(cloned);
      });
    });

    saveBudgets(next);
    setPendingGenerate(null);
  };

  const totalExpenseBudget = monthBudgets
    .filter((b) => b.type === "expense")
    .reduce((s, b) => s + b.amount, 0);

  const totalExpenseActual = Object.values(actuals.expense || {}).reduce((s, v) => s + v, 0);

  const overBudgetCount = monthBudgets.filter((b) => {
    const key = `${b.mainCat}__${b.subCat}`;
    return (actuals[b.type]?.[key] || 0) > b.amount;
  }).length;

  return (
    <div style={{ fontFamily: "'Noto Sans Thai','Sarabun',sans-serif", minHeight: "100vh", background: "#f8f9fb" }}>
      <div style={{ background: "linear-gradient(135deg,#1a1a2e,#16213e,#0f3460)", padding: "20px 20px 16px" }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              marginBottom: 14,
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 9,
                    background: "#6366f1",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 16,
                  }}
                >
                  💎
                </div>
                <span style={{ fontSize: 20, fontWeight: 800, color: "#fff" }}>FinFlow</span>
                <span
                  style={{
                    fontSize: 11,
                    padding: "2px 8px",
                    background: "rgba(255,255,255,0.12)",
                    borderRadius: 99,
                    color: "rgba(255,255,255,0.7)",
                  }}
                >
                  BUDGET MOBILE
                </span>
              </div>
              <p style={{ margin: "4px 0 0 44px", fontSize: 12, color: "rgba(255,255,255,0.5)" }}>
                {monthBudgets.length} หมวดตั้งงบ · {overBudgetCount > 0 ? `${overBudgetCount} หมวดเกินงบ` : "ทุกหมวดอยู่ในงบ ✓"}
              </p>
            </div>

            <select
              value={monthStr}
              onChange={(e) => setMonthStr(e.target.value)}
              style={{
                padding: "8px 12px",
                borderRadius: 10,
                border: "none",
                fontSize: 12,
                background: "rgba(255,255,255,0.12)",
                color: "#fff",
                cursor: "pointer",
              }}
            >
              {monthOptions.map((m) => (
                <option key={m.value} value={m.value} style={{ color: "#1a1a2e" }}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          {totalExpenseBudget > 0 && (
            <div
              style={{
                background: "rgba(255,255,255,0.08)",
                borderRadius: 12,
                padding: "10px 14px",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 12,
                  color: "rgba(255,255,255,0.7)",
                  marginBottom: 6,
                }}
              >
                <span>งบรายจ่ายที่ใช้ไป</span>
                <span style={{ fontWeight: 700, color: totalExpenseActual > totalExpenseBudget ? "#f87171" : "#86efac" }}>
                  ฿{fmt(totalExpenseActual)} / ฿{fmt(totalExpenseBudget)} ({pct(totalExpenseActual, totalExpenseBudget)}%)
                </span>
              </div>
              <div
                style={{
                  background: "rgba(255,255,255,0.15)",
                  borderRadius: 99,
                  height: 6,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${Math.min(100, pct(totalExpenseActual, totalExpenseBudget))}%`,
                    height: "100%",
                    borderRadius: 99,
                    background:
                      totalExpenseActual > totalExpenseBudget
                        ? "#f87171"
                        : pct(totalExpenseActual, totalExpenseBudget) >= 80
                          ? "#fbbf24"
                          : "#86efac",
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "20px 16px 60px" }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
          <button
            onClick={() => setShowForm(true)}
            style={{
              padding: "9px 18px",
              background: "#6366f1",
              color: "#fff",
              border: "none",
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            ✏️ ตั้งงบประมาณ
          </button>

          <button
            onClick={() => setShowGenerateYear(true)}
            style={{
              padding: "9px 18px",
              background: "#fff",
              color: "#6366f1",
              border: "1.5px solid #c7d2fe",
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            🪄 Gen งบทั้งปี
          </button>

          <div style={{ flex: 1 }} />

          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <Pill active={activeType === "all"} onClick={() => setActiveType("all")} color="#6366f1">
              ทั้งหมด
            </Pill>
            {ALL_TYPES.map((t) => (
              <Pill
                key={t}
                active={activeType === t}
                onClick={() => setActiveType(activeType === t ? "all" : t)}
                color={TYPE_COLORS[t]}
              >
                {TYPE_ICONS[t]} {TYPE_LABELS[t]}
              </Pill>
            ))}
          </div>
        </div>

        <SummaryCards budgets={budgets} actuals={actuals} currentYear={currentYear} currentMonth={currentMonth} />

        {monthBudgets.length === 0 && Object.values(actuals).every((v) => Object.keys(v).length === 0) && (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "#9ca3af" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📊</div>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: "#6b7280" }}>
              ยังไม่มีงบประมาณสำหรับ{monthLabel(monthStr)}
            </p>
            <p style={{ margin: "6px 0 16px", fontSize: 13 }}>
              กดปุ่ม “ตั้งงบประมาณ” หรือกด Gen งบทั้งปีจากเดือนนี้
            </p>
            <button
              onClick={() => setShowForm(true)}
              style={{
                padding: "10px 24px",
                background: "#6366f1",
                color: "#fff",
                border: "none",
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              ✏️ ตั้งงบประมาณ
            </button>
          </div>
        )}

        {(activeType === "all" ? ALL_TYPES : [activeType]).map((type) => (
          <TypeSection
            key={type}
            type={type}
            budgets={monthBudgets.filter((b) => b.type === type)}
            actuals={actuals[type] || {}}
            annualStats={annualActualByType[type] || { annualActual: 0, avgMonthlyActual: 0 }}
            monthStr={monthStr}
            onEdit={() => setShowForm(true)}
          />
        ))}
      </div>

      {showForm && (
        <BudgetForm
          config={config}
          currentYear={currentYear}
          currentMonth={currentMonth}
          budgets={budgets}
          onSave={(newBudgets) => {
            saveBudgets(newBudgets);
            setShowForm(false);
          }}
          onClose={() => setShowForm(false)}
        />
      )}

      {showGenerateYear && (
        <GenerateYearModal
          open={showGenerateYear}
          targetYear={currentYear}
          targetMonth={currentMonth}
          onClose={() => setShowGenerateYear(false)}
          onConfirm={requestGenerateYear}
        />
      )}

      {pendingGenerate && (
        <ConfirmGenerateModal
          open={!!pendingGenerate}
          payload={pendingGenerate}
          year={currentYear}
          month={currentMonth}
          onClose={() => setPendingGenerate(null)}
          onConfirm={confirmGenerateYear}
        />
      )}
    </div>
  );
}