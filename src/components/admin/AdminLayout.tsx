import { NavLink, Outlet, Link } from "react-router-dom";
import { LayoutDashboard, Package, Users, ArrowLeft, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import SettingsMenu from "@/components/SettingsMenu";

const navItems = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/products", label: "Products", icon: Package },
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/settings", label: "Settings", icon: Settings },
];

const AdminLayout = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="h-16 border-b border-border/60 bg-background/80 backdrop-blur-xl flex items-center justify-between px-6 sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <Link to="/" className="font-display text-lg font-bold mr-4">
            Profit<span className="text-gradient-emerald">Planner</span>
            <span className="ml-2 text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full uppercase tracking-tighter">Admin</span>
          </Link>
        </div>
        <div className="flex items-center gap-4">
          <SettingsMenu />
          <Link to="/portal" className="text-xs font-bold text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors">
            <ArrowLeft size={14} /> Exit to Portal
          </Link>
        </div>
      </header>

      <div className="flex flex-1">
        <aside className="w-60 border-r border-border/60 bg-card/40 backdrop-blur p-4 hidden md:flex flex-col">
          <nav className="flex flex-col gap-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors",
                    isActive ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  )
                }
              >
                <item.icon size={16} />
                {item.label}
              </NavLink>
            ))}
          </nav>
        </aside>
        <div className="flex-1 min-w-0">
          <div className="md:hidden border-b border-border/60 p-3 flex gap-2 overflow-x-auto">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm whitespace-nowrap",
                    isActive ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground"
                  )
                }
              >
                <item.icon size={14} />
                {item.label}
              </NavLink>
            ))}
          </div>
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;
