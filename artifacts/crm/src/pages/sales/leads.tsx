import { useQuery } from "@tanstack/react-query";
import { useAuthFetch } from "@/hooks/useRole";
import { useUser } from "@clerk/react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Link } from "wouter";
import { useState } from "react";
import { Search } from "lucide-react";

type Lead = { id: number; name: string; phone: string; status: string; source: string; followUpDate: string | null; notes: string | null };

const STATUS_COLORS: Record<string, string> = {
  New: "bg-blue-100 text-blue-700",
  Contacted: "bg-yellow-100 text-yellow-700",
  Interested: "bg-orange-100 text-orange-700",
  "Site Visit": "bg-purple-100 text-purple-700",
  Negotiation: "bg-pink-100 text-pink-700",
  Booking: "bg-emerald-100 text-emerald-700",
  Sold: "bg-green-100 text-green-700",
};

export default function SalesLeads() {
  const authFetch = useAuthFetch();
  const { user } = useUser();
  const [search, setSearch] = useState("");

  const { data: leads = [], isLoading } = useQuery<Lead[]>({
    queryKey: ["leads", { assignedTo: user?.id }],
    queryFn: () => authFetch(`/api/leads?assignedTo=${user?.id}`),
    enabled: !!user?.id,
  });

  const filtered = leads.filter(
    (l) =>
      l.name.toLowerCase().includes(search.toLowerCase()) ||
      l.phone.includes(search) ||
      l.status.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Leads</h1>
        <p className="text-sm text-muted-foreground">{leads.length} lead{leads.length !== 1 ? "s" : ""} assigned to you</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, phone or status…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="space-y-2">
        {isLoading ? (
          [...Array(5)].map((_, i) => <div key={i} className="h-20 bg-muted rounded-lg animate-pulse" />)
        ) : filtered.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">No leads found</CardContent></Card>
        ) : (
          filtered.map((lead) => (
            <Link key={lead.id} href={`/leads/${lead.id}`}>
              <div className="flex items-start justify-between p-4 rounded-lg border bg-card hover:bg-muted/30 cursor-pointer transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-sm">{lead.name}</p>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[lead.status] ?? "bg-gray-100"}`}>{lead.status}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{lead.phone} · {lead.source}</p>
                  {lead.followUpDate && (
                    <p className="text-xs text-orange-600 mt-1">Follow-up: {lead.followUpDate}</p>
                  )}
                  {lead.notes && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{lead.notes}</p>
                  )}
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
