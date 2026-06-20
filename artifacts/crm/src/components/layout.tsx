import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useUser, useClerk } from "@clerk/react";
import { useRole } from "@/hooks/useRole";
import {
  LayoutDashboard, Users, Building2, CheckSquare, KanbanSquare,
  LogOut, Target, ShieldCheck, UserCheck, CreditCard, Home, User
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  sales_manager: "Sales Manager",
  sales_executive: "Sales Executive",
  client: "Client",
};

const ROLE_BADGE_COLORS: Record<string, string> = {
  admin: "bg-red-100 text-red-700",
  sales_manager: "bg-blue-100 text-blue-700",
  sales_executive: "bg-emerald-100 text-emerald-700",
  client: "bg-purple-100 text-purple-700",
};

export function Layout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { user } = useUser();
  const { signOut } = useClerk();
  const role = useRole();

  const isActive = (href: string) => location === href || location.startsWith(href + "/");

  const navLink = (href: string, label: string, Icon: React.ElementType) => (
    <Link
      key={href}
      href={href}
      className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
        isActive(href)
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-sidebar-foreground hover:bg-sidebar-accent/50"
      }`}
    >
      <Icon className="w-4 h-4" />
      {label}
    </Link>
  );

  const sectionLabel = (label: string) => (
    <p className="px-3 pt-4 pb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
  );

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      <aside className="w-64 flex flex-col border-r bg-sidebar border-sidebar-border">
        <div className="h-16 flex items-center px-6 border-b border-sidebar-border">
          <div className="flex items-center gap-2 text-primary font-bold text-xl tracking-tight">
            <div className="w-8 h-8 rounded bg-primary flex items-center justify-center text-primary-foreground text-sm">
              D
            </div>
            DhakaCRM
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-0.5">

          {/* CLIENT PORTAL */}
          {role === "client" && (
            <>
              {sectionLabel("My Portal")}
              {navLink("/client/dashboard", "My Dashboard", Home)}
              {navLink("/client/payments", "My Payments", CreditCard)}
              {navLink("/client/properties", "My Properties", Building2)}
            </>
          )}

          {/* SALES EXECUTIVE */}
          {role === "sales_executive" && (
            <>
              {sectionLabel("My Work")}
              {navLink("/sales/dashboard", "My Dashboard", Home)}
              {navLink("/sales/leads", "My Leads", Target)}
            </>
          )}

          {/* SALES MANAGER & ADMIN - full CRM */}
          {(role === "admin" || role === "sales_manager" || role === null) && (
            <>
              {sectionLabel("CRM")}
              {navLink("/dashboard", "Dashboard", LayoutDashboard)}
              {navLink("/leads", "Leads", Target)}
              {navLink("/pipeline", "Pipeline", KanbanSquare)}
              {navLink("/customers", "Customers", Users)}
              {navLink("/properties", "Properties", Building2)}
              {navLink("/tasks", "Tasks", CheckSquare)}
              {navLink("/payments", "Payments", CreditCard)}
            </>
          )}

          {/* ADMIN ONLY */}
          {role === "admin" && (
            <>
              {sectionLabel("Admin")}
              {navLink("/admin/users", "User Management", ShieldCheck)}
              {navLink("/admin/assign-leads", "Assign Leads", UserCheck)}
            </>
          )}

          {/* SALES MANAGER - assign leads */}
          {role === "sales_manager" && (
            <>
              {sectionLabel("Management")}
              {navLink("/admin/assign-leads", "Assign Leads", UserCheck)}
            </>
          )}
        </nav>

        <div className="p-4 border-t border-sidebar-border">
          {role && (
            <div className="mb-3">
              <span className={`text-xs font-medium px-2 py-1 rounded-full ${ROLE_BADGE_COLORS[role] ?? "bg-muted text-muted-foreground"}`}>
                {ROLE_LABELS[role] ?? role}
              </span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 overflow-hidden">
              <Avatar className="w-8 h-8">
                <AvatarImage src={user?.imageUrl} />
                <AvatarFallback>{user?.firstName?.charAt(0) || "U"}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col overflow-hidden">
                <span className="text-sm font-medium truncate">{user?.fullName || "User"}</span>
                <span className="text-xs text-muted-foreground truncate">{user?.primaryEmailAddress?.emailAddress}</span>
              </div>
            </div>
            <button
              onClick={() => signOut({ redirectUrl: "/" })}
              className="p-1.5 text-muted-foreground hover:text-foreground rounded-md transition-colors"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <div className="flex-1 overflow-y-auto bg-background p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
