import { NavLink, Outlet, Link } from "react-router-dom";
import { LayoutDashboard, Package, Users, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/products", label: "Products", icon: Package },
  { to: "/admin/users", label: "Users", icon: Users },
];

const AdminLayout = () => {
  return (
    <div className="min-h-screen bg-background flex">
      <aside className="w-60 border-r border-border/60 bg-card/40 backdrop-blur p-4 hidden md:flex flex-col">
        <Link to="/portal" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft size={16} /> Back to Portal
        </Link>
        <div className="font-display font-bold text-lg mb-6 px-2">Admin</div>
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
  );
};

export default AdminLayout;
