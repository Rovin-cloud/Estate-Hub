import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthFetch, useCompanyId } from "@/hooks/useRole";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Company {
  id: number;
  name: string;
  slug: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  plan: string;
  isActive: boolean;
}

export default function CompanySettings() {
  const authFetch = useAuthFetch();
  const qc = useQueryClient();
  const { toast } = useToast();
  const companyId = useCompanyId();
  const [form, setForm] = useState<Partial<Company> | null>(null);

  const { data: company, isLoading } = useQuery<Company>({
    queryKey: ["company", companyId],
    queryFn: async () => {
      const list = await authFetch("/api/companies");
      return Array.isArray(list) ? list[0] : list;
    },
    enabled: !!companyId,
    onSuccess: (c: Company) => { if (!form) setForm(c); },
  } as any);

  const updateMut = useMutation({
    mutationFn: (data: Partial<Company>) =>
      authFetch(`/api/companies/${company?.id}`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["company"] }); toast({ title: "Settings saved" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  if (isLoading) return <div className="py-12 text-center text-muted-foreground">Loading...</div>;
  if (!company) return <div className="py-12 text-center text-muted-foreground">No company found.</div>;

  const current = form ?? company;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Company Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage your company profile and details</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Building2 className="w-5 h-5" /> Company Profile</CardTitle>
          <CardDescription>
            Plan: <span className="font-medium capitalize">{company.plan}</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Company Name</Label>
            <Input value={current.name ?? ""} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input type="email" value={current.email ?? ""} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label>Phone</Label>
            <Input value={current.phone ?? ""} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label>Address</Label>
            <Input value={current.address ?? ""} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
          </div>
          <div className="pt-2">
            <Button
              className="gap-2"
              disabled={updateMut.isPending}
              onClick={() => form && updateMut.mutate({ name: form.name, email: form.email, phone: form.phone, address: form.address })}
            >
              <Save className="w-4 h-4" />
              {updateMut.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
