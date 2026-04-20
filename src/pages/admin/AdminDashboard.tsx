import { useEffect, useState } from "react";
import { Loader2, Users, CreditCard, Sparkles, TrendingUp } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

interface Metrics {
  total_users: number;
  new_users_7d: number;
  active_subs: number;
  trials: number;
  total_products: number;
  signups_30d: { date: string; count: number }[];
  top_products: { slug: string; name: string; count: number }[];
}

interface ActivityRow {
  id: string;
  user_id: string | null;
  user_email: string | null;
  actor_id: string | null;
  actor_email: string | null;
  type: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

const StatCard = ({
  label, value, icon: Icon, hint,
}: { label: string; value: number | string; icon: React.ElementType; hint?: string }) => (
  <Card className="p-5">
    <div className="flex items-start justify-between mb-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
        <Icon size={18} />
      </div>
    </div>
    <div className="text-3xl font-bold">{value}</div>
    {hint && <div className="text-xs text-muted-foreground mt-1">{hint}</div>}
  </Card>
);

const formatActivity = (a: ActivityRow): string => {
  const meta = a.metadata || {};
  switch (a.type) {
    case "signup": return `New signup · ${a.user_email ?? meta.email ?? "unknown"}`;
    case "purchase": return `Purchase · ${a.user_email ?? "user"} bought ${meta.slug ?? "product"}`;
    case "trial_started": return `Trial started · ${a.user_email}`;
    case "entitlement_granted": return `Granted entitlement to ${a.user_email}`;
    case "entitlement_revoked": return `Revoked entitlement from ${a.user_email}`;
    case "product_status_changed": return `Product '${meta.slug}' status changed`;
    case "login": return `Login · ${a.user_email}`;
    default: return a.type;
  }
};

const AdminDashboard = () => {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [activity, setActivity] = useState<ActivityRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [m, a] = await Promise.all([
        supabase.rpc("admin_dashboard_metrics"),
        supabase.rpc("admin_recent_activity", { _limit: 20 }),
      ]);
      if (m.data) setMetrics(m.data as Metrics);
      if (a.data) setActivity(a.data as ActivityRow[]);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="p-10 flex items-center justify-center">
        <Loader2 className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto">
      <h1 className="text-3xl font-display font-bold mb-1">Dashboard</h1>
      <p className="text-muted-foreground mb-8">Overview of platform activity and growth.</p>

      {metrics && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <StatCard label="Total Users" value={metrics.total_users} icon={Users} hint={`+${metrics.new_users_7d} this week`} />
            <StatCard label="Active Subscriptions" value={metrics.active_subs} icon={CreditCard} />
            <StatCard label="Trials" value={metrics.trials} icon={Sparkles} />
            <StatCard label="Active Products" value={metrics.total_products} icon={TrendingUp} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
            <Card className="p-5 lg:col-span-2">
              <h2 className="font-semibold mb-4">Signups · last 30 days</h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={metrics.signups_30d}>
                    <defs>
                      <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))"
                      tickFormatter={(v) => new Date(v).toLocaleDateString(undefined, { month: "short", day: "numeric" })} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                    <Area type="monotone" dataKey="count" stroke="hsl(var(--primary))" fill="url(#g)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card className="p-5">
              <h2 className="font-semibold mb-4">Top Products</h2>
              <div className="space-y-3">
                {metrics.top_products.length === 0 && (
                  <p className="text-sm text-muted-foreground">No data yet.</p>
                )}
                {metrics.top_products.map((p) => (
                  <div key={p.slug} className="flex items-center justify-between text-sm">
                    <div className="min-w-0 truncate">
                      <div className="font-medium truncate">{p.name}</div>
                      <div className="text-xs text-muted-foreground">/{p.slug}</div>
                    </div>
                    <Badge variant="secondary">{p.count}</Badge>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </>
      )}

      <Card className="p-5">
        <h2 className="font-semibold mb-4">Recent Activity</h2>
        {activity.length === 0 ? (
          <p className="text-sm text-muted-foreground">No activity yet.</p>
        ) : (
          <ul className="divide-y divide-border/40">
            {activity.map((a) => (
              <li key={a.id} className="py-3 flex items-center justify-between gap-4 text-sm">
                <span className="truncate">{formatActivity(a)}</span>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {new Date(a.created_at).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
};

export default AdminDashboard;
