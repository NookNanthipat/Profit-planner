import { useState, useEffect } from "react";

const STORAGE_KEY = "finapp_config";

const defaultConfig = {
  profile: { name: "", age: "", currency: "THB", baseCurrency: "THB" },
  accounts: [],
  categories: [],
  goals: [],
  people: [],
};

const CURRENCIES = ["THB", "USD", "EUR", "JPY", "GBP", "SGD", "CNY"];

const CATEGORY_TEMPLATES = {
  income: [
    { name: "เงินเดือน", sub: ["เงินเดือนประจำ", "โบนัส", "ค่าล่วงเวลา"] },
    { name: "Freelance", sub: ["รับจ้างเขียน Code", "ออกแบบกราฟิก", "ที่ปรึกษา"] },
    { name: "การลงทุน", sub: ["เงินปันผล", "กำไรหุ้น", "ดอกเบี้ย"] },
    { name: "รายได้อื่น", sub: ["ขายของ", "เช่า", "รางวัล"] },
  ],
  expense: [
    { name: "ที่พักอาศัย", sub: ["ค่าเช่า/ผ่อนบ้าน", "ค่าน้ำ", "ค่าไฟ", "ค่าอินเทอร์เน็ต"] },
    { name: "อาหาร", sub: ["อาหารกลางวัน", "อาหารเย็น", "กาแฟ/เครื่องดื่ม", "ซื้อของกิน"] },
    { name: "การเดินทาง", sub: ["น้ำมัน", "ค่ารถสาธารณะ", "Grab/Taxi", "ค่าผ่อนรถ"] },
    { name: "สุขภาพ", sub: ["ค่ายา", "ค่าหมอ", "ฟิตเนส", "ประกันสุขภาพ"] },
    { name: "ความบันเทิง", sub: ["ของเล่น", "หนัง/ซีรีส์", "เกม", "ท่องเที่ยว"] },
    { name: "การศึกษา", sub: ["หนังสือ", "คอร์สเรียน", "อุปกรณ์"] },
    { name: "ค่าใช้จ่ายอื่น", sub: ["เสื้อผ้า", "ของขวัญ", "บริจาค"] },
  ],
  saving: [
    { name: "เงินออม", sub: ["ออมฉุกเฉิน", "ออมระยะสั้น", "ออมระยะยาว"] },
  ],
  investment: [
    { name: "การลงทุน", sub: ["หุ้น", "กองทุน", "ทอง", "BTC", "พันธบัตร"] },
  ],
  debt: [
    { name: "หนี้สิน", sub: ["บัตรเครดิต", "สินเชื่อส่วนบุคคล", "ผ่อน 0%"] },
  ],
};

const ACCOUNT_TYPES = ["ธนาคาร", "กระเป๋าเงิน", "เงินสด", "เครดิต", "ลงทุน"];
const TYPE_COLORS = {
  income: "#22c55e",
  expense: "#ef4444",
  saving: "#3b82f6",
  investment: "#f59e0b",
  debt: "#ec4899",
};

function generateId() {
  return Math.random().toString(36).substr(2, 9);
}

function Badge({ color, children }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", padding: "2px 10px",
      borderRadius: 99, fontSize: 11, fontWeight: 600, letterSpacing: "0.04em",
      background: color + "22", color: color, border: `1px solid ${color}44`,
    }}>{children}</span>
  );
}

function SectionHeader({ icon, title, subtitle }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
        <span style={{ fontSize: 20 }}>{icon}</span>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#1a1a2e" }}>{title}</h2>
      </div>
      {subtitle && <p style={{ margin: 0, fontSize: 13, color: "#6b7280", paddingLeft: 30 }}>{subtitle}</p>}
    </div>
  );
}

function Card({ children, style = {} }) {
  return (
    <div style={{
      background: "#fff", borderRadius: 16, border: "1px solid #e5e7eb",
      padding: "20px 24px", marginBottom: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
      ...style,
    }}>{children}</div>
  );
}

function Input({ label, value, onChange, type = "text", placeholder, options, min, max }) {
  const style = {
    width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #d1d5db",
    fontSize: 14, outline: "none", boxSizing: "border-box", background: "#fafafa",
    fontFamily: "inherit",
  };
  return (
    <div style={{ marginBottom: 14 }}>
      {label && <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 4, letterSpacing: "0.03em" }}>{label}</label>}
      {options ? (
        <select value={value} onChange={e => onChange(e.target.value)} style={style}>
          <option value="">เลือก...</option>
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input type={type} value={value} onChange={e => onChange(e.target.value)}
          placeholder={placeholder} min={min} max={max} style={style} />
      )}
    </div>
  );
}

function TagButton({ active, onClick, color, children }) {
  return (
    <button onClick={onClick} style={{
      padding: "4px 12px", borderRadius: 99, fontSize: 12, fontWeight: 500,
      border: `1px solid ${active ? color : "#d1d5db"}`,
      background: active ? color + "15" : "transparent",
      color: active ? color : "#6b7280",
      cursor: "pointer", transition: "all 0.15s",
    }}>{children}</button>
  );
}

// ─── TAB 1: Profile ───────────────────────────────────────────────────────────
function ProfileTab({ config, setConfig }) {
  const p = config.profile;
  const set = (field, val) => setConfig(c => ({ ...c, profile: { ...c.profile, [field]: val } }));

  return (
    <div>
      <SectionHeader icon="👤" title="ข้อมูลส่วนตัว" subtitle="ชื่อ อายุ และสกุลเงินหลักของคุณ" />
      <Card>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
          <Input label="ชื่อ" value={p.name} onChange={v => set("name", v)} placeholder="เช่น สมชาย" />
          <Input label="อายุ" type="number" value={p.age} onChange={v => set("age", v)} placeholder="25" min="1" max="120" />
        </div>
        <Input label="สกุลเงินหลัก" value={p.baseCurrency} onChange={v => set("baseCurrency", v)} options={CURRENCIES} />
        <div style={{ marginTop: 8, padding: "12px 16px", background: "#f0fdf4", borderRadius: 10, border: "1px solid #bbf7d0" }}>
          <p style={{ margin: 0, fontSize: 13, color: "#15803d" }}>
            ✅ ข้อมูลทั้งหมดเก็บในเครื่องของคุณเท่านั้น ไม่มีการส่งข้อมูลออกไปข้างนอก
          </p>
        </div>
      </Card>
    </div>
  );
}

// ─── TAB 2: Accounts ─────────────────────────────────────────────────────────
function AccountsTab({ config, setConfig }) {
  const [form, setForm] = useState({ name: "", type: "", balance: "", currency: config.profile.baseCurrency || "THB", color: "#6366f1" });
  const [editing, setEditing] = useState(null);

  const COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#3b82f6", "#ec4899", "#14b8a6", "#ef4444", "#8b5cf6"];

  const save = () => {
    if (!form.name || !form.type) return;
    if (editing !== null) {
      setConfig(c => ({ ...c, accounts: c.accounts.map((a, i) => i === editing ? { ...form, id: a.id } : a) }));
      setEditing(null);
    } else {
      setConfig(c => ({ ...c, accounts: [...c.accounts, { ...form, id: generateId() }] }));
    }
    setForm({ name: "", type: "", balance: "", currency: config.profile.baseCurrency || "THB", color: "#6366f1" });
  };

  const del = (id) => setConfig(c => ({ ...c, accounts: c.accounts.filter(a => a.id !== id) }));
  const edit = (acc, idx) => { setForm(acc); setEditing(idx); };

  return (
    <div>
      <SectionHeader icon="🏦" title="บัญชีเงิน" subtitle="กำหนดบัญชีธนาคาร กระเป๋าเงิน หรือแหล่งเงินต่างๆ" />
      <Card>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
          <Input label="ชื่อบัญชี" value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} placeholder="เช่น SCB หลัก" />
          <Input label="ประเภท" value={form.type} onChange={v => setForm(f => ({ ...f, type: v }))} options={ACCOUNT_TYPES} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
          <Input label="ยอดเริ่มต้น" type="number" value={form.balance} onChange={v => setForm(f => ({ ...f, balance: v }))} placeholder="0" />
          <Input label="สกุลเงิน" value={form.currency} onChange={v => setForm(f => ({ ...f, currency: v }))} options={CURRENCIES} />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 6, letterSpacing: "0.03em" }}>สีบัญชี</label>
          <div style={{ display: "flex", gap: 8 }}>
            {COLORS.map(c => (
              <button key={c} onClick={() => setForm(f => ({ ...f, color: c }))} style={{
                width: 28, height: 28, borderRadius: "50%", background: c, border: form.color === c ? "3px solid #1a1a2e" : "2px solid transparent",
                cursor: "pointer", transition: "all 0.15s",
              }} />
            ))}
          </div>
        </div>
        <button onClick={save} style={{
          width: "100%", padding: "10px 0", background: editing !== null ? "#f59e0b" : "#6366f1",
          color: "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 600,
          cursor: "pointer", transition: "opacity 0.15s",
        }}>{editing !== null ? "💾 บันทึกการแก้ไข" : "+ เพิ่มบัญชี"}</button>
      </Card>

      {config.accounts.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {config.accounts.map((acc, i) => (
            <div key={acc.id} style={{
              display: "flex", alignItems: "center", gap: 12,
              background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb",
              padding: "12px 16px",
            }}>
              <div style={{ width: 12, height: 12, borderRadius: "50%", background: acc.color, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: "#1a1a2e" }}>{acc.name}</div>
                <div style={{ fontSize: 12, color: "#6b7280" }}>{acc.type} · {parseFloat(acc.balance || 0).toLocaleString()} {acc.currency}</div>
              </div>
              <button onClick={() => edit(acc, i)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, padding: 4 }}>✏️</button>
              <button onClick={() => del(acc.id)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, padding: 4 }}>🗑️</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── TAB 3: Categories ───────────────────────────────────────────────────────
function CategoriesTab({ config, setConfig }) {
  const [selType, setSelType] = useState("expense");
  const [selMain, setSelMain] = useState(null);
  const [newMain, setNewMain] = useState("");
  const [newSub, setNewSub] = useState("");

  const TYPE_LABELS = { income: "รายได้", expense: "รายจ่าย", saving: "ออม", investment: "ลงทุน", debt: "หนี้" };

  const cats = config.categories.filter(c => c.type === selType);
  const mainCats = [...new Set(cats.map(c => c.main))];

  const addFromTemplate = () => {
    const templates = CATEGORY_TEMPLATES[selType] || [];
    const newCats = [];
    templates.forEach(t => {
      t.sub.forEach(s => {
        const exists = config.categories.some(c => c.type === selType && c.main === t.name && c.sub === s);
        if (!exists) newCats.push({ id: generateId(), type: selType, main: t.name, sub: s });
      });
    });
    if (newCats.length > 0) setConfig(c => ({ ...c, categories: [...c.categories, ...newCats] }));
  };

  const addMain = () => {
    if (!newMain.trim()) return;
    setConfig(c => ({ ...c, categories: [...c.categories, { id: generateId(), type: selType, main: newMain.trim(), sub: "" }] }));
    setNewMain("");
  };

  const addSub = () => {
    if (!selMain || !newSub.trim()) return;
    setConfig(c => ({ ...c, categories: [...c.categories, { id: generateId(), type: selType, main: selMain, sub: newSub.trim() }] }));
    setNewSub("");
  };

  const delCat = (id) => setConfig(c => ({ ...c, categories: c.categories.filter(x => x.id !== id) }));

  return (
    <div>
      <SectionHeader icon="🏷️" title="หมวดหมู่" subtitle="กำหนดประเภท หมวดหลัก และหมวดย่อยที่เชื่อมกัน" />

      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {Object.entries(TYPE_LABELS).map(([k, v]) => (
          <TagButton key={k} active={selType === k} onClick={() => { setSelType(k); setSelMain(null); }} color={TYPE_COLORS[k]}>{v}</TagButton>
        ))}
      </div>

      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <span style={{ fontWeight: 600, fontSize: 14, color: "#374151" }}>เพิ่มหมวดหมู่</span>
          <button onClick={addFromTemplate} style={{
            padding: "6px 14px", background: "#f0f9ff", border: "1px solid #bae6fd",
            borderRadius: 8, fontSize: 12, color: "#0369a1", cursor: "pointer", fontWeight: 500,
          }}>📦 ใช้ Template</button>
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <input value={newMain} onChange={e => setNewMain(e.target.value)} placeholder="ชื่อหมวดหลัก เช่น อาหาร"
            style={{ flex: 1, padding: "8px 12px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 13, background: "#fafafa", fontFamily: "inherit" }} />
          <button onClick={addMain} style={{
            padding: "8px 16px", background: TYPE_COLORS[selType], color: "#fff",
            border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600,
          }}>+ หมวดหลัก</button>
        </div>

        {mainCats.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>เลือกหมวดหลักเพื่อเพิ่มหมวดย่อย</label>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
              {mainCats.map(m => (
                <TagButton key={m} active={selMain === m} onClick={() => setSelMain(selMain === m ? null : m)} color={TYPE_COLORS[selType]}>{m}</TagButton>
              ))}
            </div>
            {selMain && (
              <div style={{ display: "flex", gap: 8 }}>
                <input value={newSub} onChange={e => setNewSub(e.target.value)} placeholder={`หมวดย่อยใน "${selMain}"`}
                  style={{ flex: 1, padding: "8px 12px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 13, background: "#fafafa", fontFamily: "inherit" }} />
                <button onClick={addSub} style={{
                  padding: "8px 16px", background: TYPE_COLORS[selType] + "cc", color: "#fff",
                  border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600,
                }}>+ หมวดย่อย</button>
              </div>
            )}
          </div>
        )}
      </Card>

      {mainCats.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {mainCats.map(main => {
            const subs = cats.filter(c => c.main === main);
            return (
              <Card key={main} style={{ padding: "14px 18px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: TYPE_COLORS[selType] }} />
                  <span style={{ fontWeight: 600, fontSize: 14, color: "#1a1a2e" }}>{main}</span>
                  <button onClick={() => setConfig(c => ({ ...c, categories: c.categories.filter(x => !(x.type === selType && x.main === main)) }))}
                    style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", fontSize: 14, color: "#ef4444" }}>✕</button>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, paddingLeft: 16 }}>
                  {subs.filter(s => s.sub).map(s => (
                    <span key={s.id} style={{
                      display: "inline-flex", alignItems: "center", gap: 4,
                      padding: "3px 10px", borderRadius: 99, fontSize: 12,
                      background: TYPE_COLORS[selType] + "15", color: TYPE_COLORS[selType],
                      border: `1px solid ${TYPE_COLORS[selType]}33`,
                    }}>
                      {s.sub}
                      <button onClick={() => delCat(s.id)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "inherit", padding: 0, lineHeight: 1 }}>×</button>
                    </span>
                  ))}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── TAB 4: Goals ────────────────────────────────────────────────────────────
function GoalsTab({ config, setConfig }) {
  const [form, setForm] = useState({ name: "", type: "balance", target: "", deadline: "", account: "", notes: "" });
  const GOAL_TYPES = { balance: "ยอดเงินในบัญชี", saving: "เป้าออมเงิน", purchase: "ซื้อของ/ท่องเที่ยว", investment: "เป้าลงทุน" };
  const GOAL_ICONS = { balance: "💰", saving: "🏦", purchase: "🛍️", investment: "📈" };

  const add = () => {
    if (!form.name || !form.target) return;
    setConfig(c => ({ ...c, goals: [...c.goals, { ...form, id: generateId(), current: 0 }] }));
    setForm({ name: "", type: "balance", target: "", deadline: "", account: "", notes: "" });
  };

  const del = (id) => setConfig(c => ({ ...c, goals: c.goals.filter(g => g.id !== id) }));

  return (
    <div>
      <SectionHeader icon="🎯" title="เป้าหมาย" subtitle="กำหนดเป้าหมายทางการเงินของคุณ" />
      <Card>
        <Input label="ชื่อเป้าหมาย" value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} placeholder="เช่น เก็บเงินซื้อ MacBook" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 4 }}>ประเภทเป้าหมาย</label>
            <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
              style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 14, background: "#fafafa", fontFamily: "inherit" }}>
              {Object.entries(GOAL_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <Input label="เป้าหมาย (จำนวนเงิน)" type="number" value={form.target} onChange={v => setForm(f => ({ ...f, target: v }))} placeholder="100000" />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
          <Input label="วันที่ต้องการบรรลุ" type="date" value={form.deadline} onChange={v => setForm(f => ({ ...f, deadline: v }))} />
          <Input label="บัญชีที่ผูกไว้" value={form.account} onChange={v => setForm(f => ({ ...f, account: v }))} options={["ทุกบัญชี", ...config.accounts.map(a => a.name)]} />
        </div>
        <Input label="หมายเหตุ" value={form.notes} onChange={v => setForm(f => ({ ...f, notes: v }))} placeholder="รายละเอียดเพิ่มเติม..." />
        <button onClick={add} style={{
          width: "100%", padding: "10px 0", background: "#6366f1", color: "#fff",
          border: "none", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer",
        }}>+ เพิ่มเป้าหมาย</button>
      </Card>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {config.goals.map(g => {
          const pct = Math.min(100, Math.round(((g.current || 0) / parseFloat(g.target || 1)) * 100));
          const icon = GOAL_ICONS[g.type] || "🎯";
          return (
            <Card key={g.id} style={{ padding: "14px 18px" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                <div style={{ fontSize: 24 }}>{icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontWeight: 600, fontSize: 14, color: "#1a1a2e" }}>{g.name}</span>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <Badge color="#6366f1">{GOAL_TYPES[g.type]}</Badge>
                      <button onClick={() => del(g.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", fontSize: 14 }}>✕</button>
                    </div>
                  </div>
                  {g.notes && <p style={{ margin: "2px 0 8px", fontSize: 12, color: "#6b7280" }}>{g.notes}</p>}
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6b7280", marginBottom: 4 }}>
                    <span>{(g.current || 0).toLocaleString()} / {parseFloat(g.target).toLocaleString()} {config.profile.baseCurrency}</span>
                    <span>{g.deadline ? `ถึง ${g.deadline}` : ""}</span>
                  </div>
                  <div style={{ background: "#f3f4f6", borderRadius: 99, height: 8, overflow: "hidden" }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: "#6366f1", borderRadius: 99, transition: "width 0.3s" }} />
                  </div>
                  <div style={{ fontSize: 11, color: "#6366f1", fontWeight: 600, marginTop: 3 }}>{pct}%</div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ─── TAB 5: People ───────────────────────────────────────────────────────────
function PeopleTab({ config, setConfig }) {
  const [form, setForm] = useState({ name: "", nickname: "", color: "#6366f1" });
  const COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#3b82f6", "#ec4899", "#14b8a6", "#ef4444", "#8b5cf6", "#f97316"];

  const add = () => {
    if (!form.name) return;
    setConfig(c => ({ ...c, people: [...c.people, { ...form, id: generateId() }] }));
    setForm({ name: "", nickname: "", color: "#6366f1" });
  };

  const del = (id) => setConfig(c => ({ ...c, people: c.people.filter(p => p.id !== id) }));

  const avatar = (p) => (p.nickname || p.name).slice(0, 2).toUpperCase();

  return (
    <div>
      <SectionHeader icon="👥" title="รายชื่อบุคคล" subtitle="เพิ่มบุคคลสำหรับ Split Payment และแบ่งค่าใช้จ่ายร่วม" />
      <Card>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
          <Input label="ชื่อ" value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} placeholder="เช่น สมหญิง" />
          <Input label="ชื่อเล่น/ย่อ" value={form.nickname} onChange={v => setForm(f => ({ ...f, nickname: v }))} placeholder="เช่น นุ่น" />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 6 }}>สีประจำตัว</label>
          <div style={{ display: "flex", gap: 8 }}>
            {COLORS.map(c => (
              <button key={c} onClick={() => setForm(f => ({ ...f, color: c }))} style={{
                width: 28, height: 28, borderRadius: "50%", background: c,
                border: form.color === c ? "3px solid #1a1a2e" : "2px solid transparent",
                cursor: "pointer",
              }} />
            ))}
          </div>
        </div>
        <button onClick={add} style={{
          width: "100%", padding: "10px 0", background: "#6366f1", color: "#fff",
          border: "none", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer",
        }}>+ เพิ่มบุคคล</button>
      </Card>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        {config.people.map(p => (
          <div key={p.id} style={{
            display: "flex", alignItems: "center", gap: 10,
            background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb",
            padding: "10px 14px", flex: "0 0 auto",
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: "50%", background: p.color,
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#fff", fontWeight: 700, fontSize: 13,
            }}>{avatar(p)}</div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14, color: "#1a1a2e" }}>{p.name}</div>
              {p.nickname && <div style={{ fontSize: 12, color: "#6b7280" }}>{p.nickname}</div>}
            </div>
            <button onClick={() => del(p.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", fontSize: 14, marginLeft: 4 }}>✕</button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function FinanceSetup() {
  const [config, setConfig] = useState(defaultConfig);
  const [tab, setTab] = useState(0);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setConfig(JSON.parse(stored));
    } catch (e) {}
  }, []);

  const save = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {}
  };

  const tabs = [
    { label: "โปรไฟล์", icon: "👤" },
    { label: "บัญชี", icon: "🏦" },
    { label: "หมวดหมู่", icon: "🏷️" },
    { label: "เป้าหมาย", icon: "🎯" },
    { label: "บุคคล", icon: "👥" },
  ];

  const stats = [
    { label: "บัญชี", value: config.accounts.length, color: "#6366f1" },
    { label: "หมวดหมู่", value: config.categories.length, color: "#22c55e" },
    { label: "เป้าหมาย", value: config.goals.length, color: "#f59e0b" },
    { label: "บุคคล", value: config.people.length, color: "#3b82f6" },
  ];

  return (
    <div style={{ fontFamily: "'Noto Sans Thai', 'Sarabun', sans-serif", minHeight: "100vh", background: "#f8f9fb" }}>
      {/* Header */}
      <div style={{
        background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
        padding: "24px 24px 20px", color: "#fff",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", maxWidth: 680, margin: "0 auto" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10, background: "#6366f1",
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
              }}>💎</div>
              <span style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.5px" }}>FinFlow</span>
              <span style={{ fontSize: 11, padding: "2px 8px", background: "rgba(255,255,255,0.15)", borderRadius: 99, letterSpacing: "0.05em" }}>SETUP</span>
            </div>
            <p style={{ margin: 0, fontSize: 13, opacity: 0.65 }}>
              {config.profile.name ? `สวัสดี ${config.profile.name} 👋` : "กำหนดค่าเริ่มต้นการเงินของคุณ"}
            </p>
          </div>
          <button onClick={save} style={{
            padding: "8px 18px", background: saved ? "#22c55e" : "#6366f1",
            color: "#fff", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 600,
            cursor: "pointer", transition: "background 0.3s",
          }}>{saved ? "✅ บันทึกแล้ว" : "💾 บันทึก"}</button>
        </div>

        {/* Stats row */}
        <div style={{ display: "flex", gap: 10, marginTop: 16, maxWidth: 680, margin: "16px auto 0" }}>
          {stats.map(s => (
            <div key={s.label} style={{
              flex: 1, background: "rgba(255,255,255,0.08)", borderRadius: 10,
              padding: "8px 12px", textAlign: "center", border: "1px solid rgba(255,255,255,0.1)",
            }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 11, opacity: 0.65, marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tab nav */}
      <div style={{ background: "#fff", borderBottom: "1px solid #e5e7eb", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ display: "flex", maxWidth: 680, margin: "0 auto", overflowX: "auto" }}>
          {tabs.map((t, i) => (
            <button key={i} onClick={() => setTab(i)} style={{
              flex: "0 0 auto", padding: "14px 16px",
              background: "none", border: "none", cursor: "pointer",
              fontSize: 13, fontWeight: tab === i ? 700 : 400,
              color: tab === i ? "#6366f1" : "#6b7280",
              borderBottom: tab === i ? "2px solid #6366f1" : "2px solid transparent",
              transition: "all 0.15s", display: "flex", alignItems: "center", gap: 6,
            }}>
              <span>{t.icon}</span>{t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "24px 16px 60px" }}>
        {tab === 0 && <ProfileTab config={config} setConfig={setConfig} />}
        {tab === 1 && <AccountsTab config={config} setConfig={setConfig} />}
        {tab === 2 && <CategoriesTab config={config} setConfig={setConfig} />}
        {tab === 3 && <GoalsTab config={config} setConfig={setConfig} />}
        {tab === 4 && <PeopleTab config={config} setConfig={setConfig} />}

        {/* Save reminder */}
        <div style={{
          marginTop: 24, padding: "12px 16px", background: "#fef9ec", borderRadius: 10,
          border: "1px solid #fde68a", display: "flex", alignItems: "center", gap: 10,
        }}>
          <span style={{ fontSize: 16 }}>💡</span>
          <p style={{ margin: 0, fontSize: 13, color: "#92400e" }}>
            อย่าลืมกดปุ่ม <strong>บันทึก</strong> หลังแก้ไขข้อมูล ข้อมูลจะถูกเก็บในเบราว์เซอร์ของคุณ
          </p>
        </div>
      </div>
    </div>
  );
}
