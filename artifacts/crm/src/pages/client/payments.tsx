import { useQuery } from "@tanstack/react-query";
import { useAuthFetch } from "@/hooks/useRole";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCard, CheckCircle2, Clock, AlertCircle } from "lucide-react";

type Payment = {
  id: number; installmentNumber: number | null; totalAmount: number; paidAmount: number;
  remainingAmount: number; dueDate: string | null; paidDate: string | null; paymentStatus: string; notes: string | null;
};

const STATUS_ICON: Record<string, React.ReactNode> = {
  Paid: <CheckCircle2 className="w-4 h-4 text-emerald-600" />,
  Pending: <Clock className="w-4 h-4 text-yellow-600" />,
  Overdue: <AlertCircle className="w-4 h-4 text-red-600" />,
  Partial: <CreditCard className="w-4 h-4 text-blue-600" />,
};

const STATUS_COLOR: Record<string, string> = {
  Paid: "bg-emerald-100 text-emerald-700",
  Pending: "bg-yellow-100 text-yellow-700",
  Overdue: "bg-red-100 text-red-700",
  Partial: "bg-blue-100 text-blue-700",
};

export default function ClientPayments() {
  const authFetch = useAuthFetch();

  const { data: payments = [], isLoading, isError } = useQuery<Payment[]>({
    queryKey: ["client-payments"],
    queryFn: () => authFetch("/api/client/payments"),
  });

  const totalAmount = payments[0]?.totalAmount ?? 0;
  const totalPaid = payments.reduce((s, p) => s + p.paidAmount, 0);
  const totalRemaining = payments.reduce((s, p) => s + p.remainingAmount, 0);
  const paidCount = payments.filter((p) => p.paymentStatus === "Paid").length;

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <AlertCircle className="w-10 h-10 text-muted-foreground" />
        <p className="text-muted-foreground">No payment records found. Contact your sales representative.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Payment Schedule</h1>
        <p className="text-sm text-muted-foreground">Your installment history and upcoming payments</p>
      </div>

      {payments.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <Card><CardContent className="pt-6 text-center">
            <p className="text-xl font-bold text-primary">৳{totalPaid.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-1">Total Paid</p>
          </CardContent></Card>
          <Card><CardContent className="pt-6 text-center">
            <p className="text-xl font-bold text-orange-600">৳{totalRemaining.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-1">Remaining</p>
          </CardContent></Card>
          <Card><CardContent className="pt-6 text-center">
            <p className="text-xl font-bold">{paidCount}/{payments.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Installments Paid</p>
          </CardContent></Card>
        </div>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">Installment Schedule</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />)}</div>
          ) : payments.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No installments found</p>
          ) : (
            <div className="space-y-3">
              {payments.map((p) => (
                <div key={p.id} className={`flex items-center gap-4 p-4 rounded-lg border ${p.paymentStatus === "Overdue" ? "border-red-200 bg-red-50/30" : "bg-background"}`}>
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-bold">
                    {p.installmentNumber ?? "—"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">Installment #{p.installmentNumber ?? "—"}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${STATUS_COLOR[p.paymentStatus] ?? "bg-gray-100"}`}>
                        {STATUS_ICON[p.paymentStatus]}
                        {p.paymentStatus}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Due: {p.dueDate ?? "—"}{p.paidDate ? ` · Paid: ${p.paidDate}` : ""}
                    </p>
                    {p.notes && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{p.notes}</p>}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-semibold text-sm">৳{p.paidAmount.toLocaleString()}</p>
                    {p.remainingAmount > 0 && (
                      <p className="text-xs text-muted-foreground">৳{p.remainingAmount.toLocaleString()} left</p>
                    )}
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
