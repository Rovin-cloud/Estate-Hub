import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthFetch } from "@/hooks/useRole";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Users, ShieldCheck } from "lucide-react";

const ROLES = ["admin", "sales_manager", "sales_executive", "client"] as const;
type Role = typeof ROLES[number];

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  sales_manager: "Sales Manager",
  sales_executive: "Sales Executive",
  client: "Client",
};

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-red-100 text-red-700",
  sales_manager: "bg-blue-100 text-blue-700",
  sales_executive: "bg-emerald-100 text-emerald-700",
  client: "bg-purple-100 text-purple-700",
};

type CrmUser = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  imageUrl: string;
  role: string | null;
  createdAt: string;
};

export default function AdminUsers() {
  const authFetch = useAuthFetch();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [pendingRole, setPendingRole] = useState<Record<string, string>>({});

  const { data: users = [], isLoading } = useQuery<CrmUser[]>({
    queryKey: ["admin-users"],
    queryFn: () => authFetch("/api/admin/users"),
  });

  const setRole = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      authFetch(`/api/admin/users/${userId}/role`, {
        method: "PATCH",
        body: JSON.stringify({ role }),
      }),
    onSuccess: (_, { userId, role }) => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast({ title: "Role updated", description: `User role set to ${ROLE_LABELS[role]}` });
      setPendingRole((p) => { const n = { ...p }; delete n[userId]; return n; });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Users className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">User Management</h1>
          <p className="text-sm text-muted-foreground">Assign roles to team members and clients</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="w-4 h-4" /> All Users ({users.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />
              ))}
            </div>
          ) : users.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No users found</p>
          ) : (
            <div className="space-y-2">
              {users.map((user) => (
                <div key={user.id} className="flex items-center gap-4 p-3 rounded-lg border hover:bg-muted/30 transition-colors">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={user.imageUrl} />
                    <AvatarFallback>{user.firstName?.charAt(0) ?? "U"}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {[user.firstName, user.lastName].filter(Boolean).join(" ") || "Unnamed User"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {user.role ? (
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${ROLE_COLORS[user.role] ?? "bg-gray-100 text-gray-700"}`}>
                        {ROLE_LABELS[user.role] ?? user.role}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground px-2 py-1 rounded-full bg-muted">No role</span>
                    )}
                    <Select
                      value={pendingRole[user.id] ?? user.role ?? ""}
                      onValueChange={(v) => setPendingRole((p) => ({ ...p, [user.id]: v }))}
                    >
                      <SelectTrigger className="w-40 h-8 text-xs">
                        <SelectValue placeholder="Set role…" />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLES.map((r) => (
                          <SelectItem key={r} value={r} className="text-xs">{ROLE_LABELS[r]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      className="h-8 text-xs"
                      disabled={!pendingRole[user.id] || pendingRole[user.id] === user.role || setRole.isPending}
                      onClick={() => setRole.mutate({ userId: user.id, role: pendingRole[user.id] })}
                    >
                      Save
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
