import { useEffect, useState } from "react";
import { ArrowDownRight, ArrowUpRight, PiggyBank, Wallet } from "lucide-react";
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatMoney, monthKey, type PPMonthlySummary, type PPTransaction } from "@/lib/profitPlanner";

const PALETTE = ["#3b82f6", "#f97316", "#10b981", "#ec4899", "#8b5cf6", "#06b6d4", "#eab308", "#ef4444"];

const Dashboard = () => {
  const { user } = useAuth();
  const [month, setMonth] = useState(monthKey(new Date()));
  const [summary, setSummary] = useState<PPMonthlySummary | null>(null);
  const [recent, setRecent] = useState<PPTransaction[]>([]);

  useEffect(() => {
    if (!user) return;
    const [y, m] = month.split("-").map(Number);
    const firstDay = new Date(Date.UTC(y, m - 1, 1)).toISOString().slice(0, 10);
    (async () => {
      const { data } = await supabase.rpc("pp_monthly_summary", {
        _user_id: user.id,
        _month: firstDay,
      });
      setSummary(data as PPMonthlySummary);

      const start = new Date(y, m - 1, 1).toISOString().slice(0, 10);
      const end = new Date(y, m, 0).toISOString().slice(0, 10);
      const { data: r } = await supabase
        .from("pp_transactions")
        .select("*")
        .eq("user_id", user.id)
        .gte("occurred_on", start).lte("occurred_on", end)
        .order("occurred_on", { ascending: false })
        .limit(5);
      setRecent((r as PPTransaction[]) ?? []);
    })();
  }, [user, month]);

  const income = Number(summary?.income ?? 0);
  const expense = Number(summary?.expense ?? 0);
  const net = Number(summary?.net ?? 0);
  const rate = Number(summary?.savings_rate ?? 0);

  const cards = [
    { label: "Income", value: formatMoney(income), icon: ArrowUpRight, tone: "text-emerald-600 dark:text-emerald-400" },
    { label: "Expense", value: formatMoney(expense), icon: ArrowDownRight, tone: "text-rose-600 dark:text-rose-400" },
    { label: "Net", value: formatMoney(net), icon: Wallet, tone: net >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400" },
    { label: "Savings Rate", value: `${(rate * 100).toFixed(1)}%`, icon: PiggyBank, tone: "text-primary" },
  ];

  const byCat = (summary?.by_category ?? []).map((c, i) => ({ ...c, total: Number(c.total), color: c.color || PALETTE[i % PALETTE.length] }));
  const daily = (summary?.daily ?? []).map((d) => ({ ...d, income: Number(d.income), expense: Number(d.expense), day: d.date.slice(8) }));

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl lg:text-3xl font-display font-bold">Monthly Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">Your money flow at a glance.</p>
        </div>
        <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-auto" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map((c) => (
          <Card key={c.label} className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">{c.label}</p>
              <c.icon size={16} className={c.tone} />
            </div>
            <p className={`text-xl lg:text-2xl font-display font-bold mt-2 ${c.tone}`}>{c.value}</p>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <h3 className="font-semibold mb-3">Expense by Category</h3>
          {byCat.length === 0 ? (
            <p className="text-sm text-muted-foreground py-12 text-center">No expenses this month.</p>
          ) : (
            <div className="h-64">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={byCat} dataKey="total" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={2}>
                    {byCat.map((c, i) => <Cell key={i} fill={c.color} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatMoney(v)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card className="p-5">
          <h3 className="font-semibold mb-3">Daily Flow</h3>
          {daily.length === 0 ? (
            <p className="text-sm text-muted-foreground py-12 text-center">No activity this month.</p>
          ) : (
            <div className="h-64">
              <ResponsiveContainer>
                <BarChart data={daily}>
                  <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={11} />
                  <YAxis tickLine={false} axisLine={false} fontSize={11} width={40} />
                  <Tooltip formatter={(v: number) => formatMoney(v)} />
                  <Bar dataKey="income" stackId="a" fill="#10b981" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="expense" stackId="b" fill="#ef4444" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <h3 className="font-semibold mb-3">Top 5 Expense Categories</h3>
          {byCat.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">—</p>
          ) : (
            <div className="space-y-2">
              {byCat.slice(0, 5).map((c, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                    {c.icon} {c.name}
                  </span>
                  <span className="font-mono">{formatMoney(c.total)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-5">
          <h3 className="font-semibold mb-3">Recent Transactions</h3>
          {recent.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No recent transactions.</p>
          ) : (
            <div className="space-y-2">
              {recent.map((t) => (
                <div key={t.id} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{t.occurred_on}</span>
                  <span className={`font-mono ${t.type === "income" ? "text-emerald-600 dark:text-emerald-400" : ""}`}>
                    {t.type === "income" ? "+" : "-"}{formatMoney(Number(t.amount))}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
