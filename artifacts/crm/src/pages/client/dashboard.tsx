import { useQuery } from "@tanstack/react-query";
import { useAuthFetch } from "@/hooks/useRole";
import { useUser } from "@clerk/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, CreditCard, AlertCircle, CheckCircle2 } from "lucide-react";

type Payment = {
  id: number; installmentNumber: number | null; totalAmount: number; paidAmount: number;
  remainingAmount: number; dueDate: string | null; paidDate: string | null; paymentStatus: string; notes: string | null;
};
type Property = { id: number; projectName: string; location: string; unitNumber: string | null; price: number; availability: string };
type CustomerProfile = { id: number; name: string; email: string; phone: string };

export default function ClientDashboard() {
  const authFetch = useAuthFetch();
  const { user } = useUser();

  const { data: profile, isError: noProfile } = useQuery<CustomerProfile>({
    queryKey: ["client-me"],
    queryFn: () => authFetch("/api/client/me"),
  });

  const { data: payments = [] } = useQuery<Payment[]>({
    queryKey: ["client-payments"],
    queryFn: () => authFetch("/api/client/payments"),
    enabled: !!profile,
  });

  const { data: properties = [] } = useQuery<Property[]>({
    queryKey: ["client-properties"],
    queryFn: () => authFetch("/api/client/properties"),
    enabled: !!profile,
  });

  if (noProfile) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <AlertCircle className="w-12 h-12 text-muted-foreground" />
        <div className="text-center">
          <h2 className="text-lg font-semibold">Profile Not Linked</h2>
          <p className="text-sm text-muted-foreground mt-1">Your account hasn't been linked to a customer profile yet.</p>
          <p className="text-sm text-muted-foreground">Please contact your sales representative.</p>
        </div>
      </div>
    );
  }

  const totalPaid = payments.reduce((s, p) => s + p.paidAmount, 0);
  const totalDue = payments.reduce((s, p) => s + p.remainingAmount, 0);
  const overdue = payments.filter((p) => p.paymentStatus === "Overdue" || (p.dueDate && p.dueDate < new Date().toISOString().split("T")[0] && p.paymentStatus !== "Paid"));
  const nextDue = payments.filter((p) => p.paymentStatus !== "Paid").sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? ""))[0];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Welcome, {user?.firstName ?? profile?.name}</h1>
        <p className="text-sm text-muted-foreground">Your property and payment overview</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center"><Building2 className="w-5 h-5 text-blue-600" /></div>
            <div><p className="text-2xl font-bold">{properties.length}</p><p className="text-xs text-muted-foreground">Properties</p></div>
          </div>
        </CardContent></Card>
        <Card><CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center"><CheckCircle2 className="w-5 h-5 text-emerald-600" /></div>
            <div><p className="text-2xl font-bold">৳{totalPaid.toLocaleString()}</p><p className="text-xs text-muted-foreground">Total Paid</p></div>
          </div>
        </CardContent></Card>
        <Card><CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center"><CreditCard className="w-5 h-5 text-orange-600" /></div>
            <div><p className="text-2xl font-bold">৳{totalDue.toLocaleString()}</p><p className="text-xs text-muted-foreground">Remaining</p></div>
          </div>
        </CardContent></Card>
        <Card><CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center"><AlertCircle className="w-5 h-5 text-red-600" /></div>
            <div><p className="text-2xl font-bold">{overdue.length}</p><p className="text-xs text-muted-foreground">Overdue</p></div>
          </div>
        </CardContent></Card>
      </div>

      {nextDue && (
        <Card className="border-orange-200 bg-orange-50/50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5" />
              <div>
                <p className="font-semibold text-orange-800">Next Payment Due</p>
                <p className="text-sm text-orange-700 mt-1">
                  Installment #{nextDue.installmentNumber} — ৳{nextDue.remainingAmount.toLocaleString()} due on {nextDue.dueDate ?? "—"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {properties.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Your Properties</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {properties.map((p) => (
                <div key={p.id} className="flex items-center justify-between p-3 rounded-lg border bg-background">
                  <div>
                    <p className="font-medium text-sm">{p.projectName}</p>
                    <p className="text-xs text-muted-foreground">{p.location}{p.unitNumber ? ` · Unit ${p.unitNumber}` : ""}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-primary">৳{p.price.toLocaleString()}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${p.availability === "Available" ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600"}`}>
                      {p.availability}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
