import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthFetch } from "@/hooks/useRole";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { UserCheck, Search } from "lucide-react";

type Lead = { id: number; name: string; phone: string; status: string; source: string; assignedTo: string | null };
type CrmUser = { id: string; firstName: string | null; lastName: string | null; email: string; role: string | null };

const STATUS_COLORS: Record<string, string> = {
  New: "bg-blue-100 text-blue-700",
  Contacted: "bg-yellow-100 text-yellow-700",
  Interested: "bg-orange-100 text-orange-700",
  "Site Visit": "bg-purple-100 text-purple-700",
  Negotiation: "bg-pink-100 text-pink-700",
  Booking: "bg-emerald-100 text-emerald-700",
  Sold: "bg-green-100 text-green-700",
};

export default function AssignLeads() {
  const authFetch = useAuthFetch();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [pending, setPending] = useState<Record<number, string>>({});

  const { data: leads = [], isLoading: leadsLoading } = useQuery<Lead[]>({
    queryKey: ["admin-leads"],
    queryFn: () => authFetch("/api/admin/leads"),
  });

  const { data: users = [] } = useQuery<CrmUser[]>({
    queryKey: ["admin-users"],
    queryFn: () => authFetch("/api/admin/users"),
  });

  const salesUsers = users.filter((u) => u.role === "sales_executive" || u.role === "sales_manager");

  const assign = useMutation({
    mutationFn: ({ leadId, assignedTo }: { leadId: number; assignedTo: string | null }) =>
      authFetch(`/api/admin/leads/${leadId}/assign`, {
        method: "PATCH",
        body: JSON.stringify({ assignedTo }),
      }),
    onSuccess: (_, { leadId }) => {
      queryClient.invalidateQueries({ queryKey: ["admin-leads"] });
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      toast({ title: "Lead assigned successfully" });
      setPending((p) => { const n = { ...p }; delete n[leadId]; return n; });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const filtered = leads.filter((l) =>
    l.name.toLowerCase().includes(search.toLowerCase()) ||
    l.phone.includes(search)
  );

  const getUserName = (id: string | null) => {
    if (!id) return null;
    const u = salesUsers.find((u) => u.id === id);
    if (!u) return id;
    return [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <UserCheck className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Lead Assignment</h1>
          <p className="text-sm text-muted-foreground">Assign leads to your sales team</p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search leads by name or phone…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Leads ({filtered.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {leadsLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => <div key={i} className="h-14 bg-muted rounded-lg animate-pulse" />)}
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((lead) => (
                <div key={lead.id} className="flex items-center gap-4 p-3 rounded-lg border hover:bg-muted/30 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{lead.name}</p>
                    <p className="text-xs text-muted-foreground">{lead.phone}</p>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full hidden sm:inline ${STATUS_COLORS[lead.status] ?? "bg-gray-100 text-gray-700"}`}>
                    {lead.status}
                  </span>
                  <div className="flex items-center gap-2">
                    {lead.assignedTo && !pending[lead.id] && (
                      <span className="text-xs text-muted-foreground hidden md:block">
                        → {getUserName(lead.assignedTo)}
                      </span>
                    )}
                    <Select
                      value={pending[lead.id] ?? lead.assignedTo ?? "unassigned"}
                      onValueChange={(v) => setPending((p) => ({ ...p, [lead.id]: v }))}
                    >
                      <SelectTrigger className="w-44 h-8 text-xs">
                        <SelectValue placeholder="Assign to…" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned" className="text-xs">Unassigned</SelectItem>
                        {salesUsers.map((u) => (
                          <SelectItem key={u.id} value={u.id} className="text-xs">
                            {[u.firstName, u.lastName].filter(Boolean).join(" ") || u.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      className="h-8 text-xs"
                      disabled={!pending[lead.id] || assign.isPending}
                      onClick={() => assign.mutate({
                        leadId: lead.id,
                        assignedTo: pending[lead.id] === "unassigned" ? null : pending[lead.id],
                      })}
                    >
                      Assign
                    </Button>
                  </div>
                </div>
              ))}
              {filtered.length === 0 && (
                <p className="text-center text-muted-foreground py-8">No leads found</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
