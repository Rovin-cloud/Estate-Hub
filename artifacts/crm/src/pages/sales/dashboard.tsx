import { useQuery } from "@tanstack/react-query";
import { useAuthFetch } from "@/hooks/useRole";
import { useUser } from "@clerk/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { Target, CalendarClock, MapPin, TrendingUp } from "lucide-react";

type Lead = { id: number; name: string; phone: string; status: string; source: string; assignedTo: string | null; followUpDate: string | null };

const STATUS_COLORS: Record<string, string> = {
  New: "bg-blue-100 text-blue-700",
  Contacted: "bg-yellow-100 text-yellow-700",
  Interested: "bg-orange-100 text-orange-700",
  "Site Visit": "bg-purple-100 text-purple-700",
  Negotiation: "bg-pink-100 text-pink-700",
  Booking: "bg-emerald-100 text-emerald-700",
  Sold: "bg-green-100 text-green-700",
};

export default function SalesDashboard() {
  const authFetch = useAuthFetch();
  const { user } = useUser();

  const { data: leads = [], isLoading } = useQuery<Lead[]>({
    queryKey: ["leads", { assignedTo: user?.id }],
    queryFn: () => authFetch(`/api/leads?assignedTo=${user?.id}`),
    enabled: !!user?.id,
  });

  const today = new Date().toISOString().split("T")[0];
  const followUps = leads.filter((l) => l.followUpDate && l.followUpDate <= today);
  const siteVisits = leads.filter((l) => l.status === "Site Visit");
  const converted = leads.filter((l) => l.status === "Booking" || l.status === "Sold");

  const stats = [
    { label: "My Leads", value: leads.length, icon: Target, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Follow-ups Due", value: followUps.length, icon: CalendarClock, color: "text-orange-600", bg: "bg-orange-50" },
    { label: "Site Visits", value: siteVisits.length, icon: MapPin, color: "text-purple-600", bg: "bg-purple-50" },
    { label: "Converted", value: converted.length, icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Dashboard</h1>
        <p className="text-sm text-muted-foreground">Welcome back, {user?.firstName}. Here's your pipeline overview.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg ${s.bg} flex items-center justify-center`}>
                  <s.icon className={`w-5 h-5 ${s.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{isLoading ? "—" : s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {followUps.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><CalendarClock className="w-4 h-4 text-orange-500" /> Follow-ups Due</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {followUps.slice(0, 5).map((l) => (
                <Link key={l.id} href={`/leads/${l.id}`}>
                  <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/30 cursor-pointer transition-colors">
                    <div>
                      <p className="font-medium text-sm">{l.name}</p>
                      <p className="text-xs text-muted-foreground">{l.phone} · Follow-up: {l.followUpDate}</p>
                    </div>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[l.status] ?? "bg-gray-100"}`}>{l.status}</span>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">My Assigned Leads</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-14 bg-muted rounded-lg animate-pulse" />)}</div>
          ) : leads.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No leads assigned to you yet.</p>
          ) : (
            <div className="space-y-2">
              {leads.slice(0, 10).map((l) => (
                <Link key={l.id} href={`/leads/${l.id}`}>
                  <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/30 cursor-pointer transition-colors">
                    <div>
                      <p className="font-medium text-sm">{l.name}</p>
                      <p className="text-xs text-muted-foreground">{l.phone} · {l.source}</p>
                    </div>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[l.status] ?? "bg-gray-100"}`}>{l.status}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
