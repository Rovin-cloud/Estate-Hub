import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthFetch } from "@/hooks/useRole";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, CreditCard, Search, Trash2, Edit } from "lucide-react";

type Payment = {
  id: number; customerId: number; propertyId: number; totalAmount: number; paidAmount: number;
  remainingAmount: number; installmentNumber: number | null; dueDate: string | null;
  paidDate: string | null; paymentStatus: string; notes: string | null;
};
type Customer = { id: number; name: string; phone: string };
type Property = { id: number; projectName: string; unitNumber: string | null };

const STATUS_COLORS: Record<string, string> = {
  Paid: "bg-emerald-100 text-emerald-700",
  Pending: "bg-yellow-100 text-yellow-700",
  Overdue: "bg-red-100 text-red-700",
  Partial: "bg-blue-100 text-blue-700",
};

const emptyForm = { customerId: "", propertyId: "", totalAmount: "", paidAmount: "0", installmentNumber: "", dueDate: "", paidDate: "", paymentStatus: "Pending", notes: "" };

export default function Payments() {
  const authFetch = useAuthFetch();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Payment | null>(null);
  const [form, setForm] = useState(emptyForm);

  const { data: payments = [], isLoading } = useQuery<Payment[]>({
    queryKey: ["payments"],
    queryFn: () => authFetch("/api/payments"),
  });

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["customers"],
    queryFn: () => authFetch("/api/customers"),
  });

  const { data: properties = [] } = useQuery<Property[]>({
    queryKey: ["properties"],
    queryFn: () => authFetch("/api/properties"),
  });

  const save = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      editing
        ? authFetch(`/api/payments/${editing.id}`, { method: "PATCH", body: JSON.stringify(data) })
        : authFetch("/api/payments", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      toast({ title: editing ? "Payment updated" : "Payment created" });
      setOpen(false); setEditing(null); setForm(emptyForm);
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: (id: number) => authFetch(`/api/payments/${id}`, { method: "DELETE" }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["payments"] }); toast({ title: "Payment deleted" }); },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const openCreate = () => { setEditing(null); setForm(emptyForm); setOpen(true); };
  const openEdit = (p: Payment) => {
    setEditing(p);
    setForm({
      customerId: String(p.customerId), propertyId: String(p.propertyId),
      totalAmount: String(p.totalAmount), paidAmount: String(p.paidAmount),
      installmentNumber: p.installmentNumber ? String(p.installmentNumber) : "",
      dueDate: p.dueDate ?? "", paidDate: p.paidDate ?? "",
      paymentStatus: p.paymentStatus, notes: p.notes ?? "",
    });
    setOpen(true);
  };

  const handleSubmit = () => {
    save.mutate({
      customerId: Number(form.customerId),
      propertyId: Number(form.propertyId),
      totalAmount: form.totalAmount,
      paidAmount: form.paidAmount || "0",
      installmentNumber: form.installmentNumber ? Number(form.installmentNumber) : undefined,
      dueDate: form.dueDate || undefined,
      paidDate: form.paidDate || undefined,
      paymentStatus: form.paymentStatus,
      notes: form.notes || undefined,
    });
  };

  const customerName = (id: number) => customers.find((c) => c.id === id)?.name ?? `Customer #${id}`;
  const propertyName = (id: number) => {
    const p = properties.find((p) => p.id === id);
    return p ? `${p.projectName}${p.unitNumber ? ` U${p.unitNumber}` : ""}` : `Property #${id}`;
  };

  const filtered = payments.filter((p) =>
    customerName(p.customerId).toLowerCase().includes(search.toLowerCase()) ||
    propertyName(p.propertyId).toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <CreditCard className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Payments</h1>
            <p className="text-sm text-muted-foreground">Track installments and payment schedules</p>
          </div>
        </div>
        <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" />Add Payment</Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search by customer or property…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">All Payments ({filtered.length})</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />)}</div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No payments found</p>
          ) : (
            <div className="space-y-2">
              {filtered.map((p) => (
                <div key={p.id} className="flex items-center gap-4 p-3 rounded-lg border hover:bg-muted/30 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm truncate">{customerName(p.customerId)}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[p.paymentStatus] ?? "bg-gray-100"}`}>{p.paymentStatus}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{propertyName(p.propertyId)}{p.installmentNumber ? ` · Inst. #${p.installmentNumber}` : ""}{p.dueDate ? ` · Due: ${p.dueDate}` : ""}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-semibold text-sm">৳{p.paidAmount.toLocaleString()} <span className="text-muted-foreground font-normal">/ ৳{p.totalAmount.toLocaleString()}</span></p>
                    {p.remainingAmount > 0 && <p className="text-xs text-muted-foreground">৳{p.remainingAmount.toLocaleString()} remaining</p>}
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(p)}><Edit className="w-3.5 h-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => remove.mutate(p.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? "Edit Payment" : "Add Payment"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="space-y-1.5">
              <Label>Customer</Label>
              <Select value={form.customerId} onValueChange={(v) => setForm((f) => ({ ...f, customerId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                <SelectContent>{customers.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Property</Label>
              <Select value={form.propertyId} onValueChange={(v) => setForm((f) => ({ ...f, propertyId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select property" /></SelectTrigger>
                <SelectContent>{properties.map((p) => <SelectItem key={p.id} value={String(p.id)}>{p.projectName}{p.unitNumber ? ` U${p.unitNumber}` : ""}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Total Amount (৳)</Label>
              <Input type="number" value={form.totalAmount} onChange={(e) => setForm((f) => ({ ...f, totalAmount: e.target.value }))} placeholder="0" />
            </div>
            <div className="space-y-1.5">
              <Label>Paid Amount (৳)</Label>
              <Input type="number" value={form.paidAmount} onChange={(e) => setForm((f) => ({ ...f, paidAmount: e.target.value }))} placeholder="0" />
            </div>
            <div className="space-y-1.5">
              <Label>Installment #</Label>
              <Input type="number" value={form.installmentNumber} onChange={(e) => setForm((f) => ({ ...f, installmentNumber: e.target.value }))} placeholder="1" />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.paymentStatus} onValueChange={(v) => setForm((f) => ({ ...f, paymentStatus: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Pending", "Paid", "Partial", "Overdue"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Due Date</Label>
              <Input type="date" value={form.dueDate} onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Paid Date</Label>
              <Input type="date" value={form.paidDate} onChange={(e) => setForm((f) => ({ ...f, paidDate: e.target.value }))} />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Notes</Label>
              <Input value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Optional notes" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={save.isPending || !form.customerId || !form.propertyId || !form.totalAmount}>
              {save.isPending ? "Saving…" : editing ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
