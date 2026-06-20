import { useParams, Link } from "wouter";
import { useGetLead, getGetLeadQueryKey, useUpdateLead, useGetTasks, getGetTasksQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Save, Phone, Clock, MapPin, Building2, CheckSquare } from "lucide-react";
import { useState, useEffect } from "react";
import { queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

export default function LeadDetail() {
  const { id } = useParams<{ id: string }>();
  const leadId = Number(id);
  const { toast } = useToast();

  const { data: lead, isLoading } = useGetLead(leadId, { query: { enabled: !!leadId, queryKey: getGetLeadQueryKey(leadId) } });
  const { data: tasks, isLoading: isLoadingTasks } = useGetTasks({ leadId }, { query: { queryKey: getGetTasksQueryKey({ leadId }) } });
  
  const updateLead = useUpdateLead();

  const [formData, setFormData] = useState<any>({});

  useEffect(() => {
    if (lead) {
      setFormData({
        name: lead.name,
        phone: lead.phone,
        source: lead.source,
        status: lead.status,
        notes: lead.notes || "",
        assignedTo: lead.assignedTo || "",
      });
    }
  }, [lead]);

  if (isLoading || !lead) {
    return <div className="space-y-4"><Skeleton className="h-10 w-48" /><Skeleton className="h-[400px] w-full" /></div>;
  }

  const handleSave = () => {
    updateLead.mutate({ id: leadId, data: formData }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetLeadQueryKey(leadId) });
        queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
        toast({ title: "Lead updated successfully" });
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/leads"><ArrowLeft className="w-4 h-4" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{lead.name}</h1>
          <p className="text-muted-foreground flex items-center gap-2">
            <Phone className="w-3 h-3" /> {lead.phone}
          </p>
        </div>
        <div className="ml-auto">
          <Button onClick={handleSave} disabled={updateLead.isPending}>
            <Save className="w-4 h-4 mr-2" /> Save Changes
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Lead Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={formData.phone || ''} onChange={e => setFormData({...formData, phone: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={v => setFormData({...formData, status: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["New", "Contacted", "Interested", "Site Visit", "Negotiation", "Booking", "Sold"].map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Source</Label>
                <Select value={formData.source} onValueChange={v => setFormData({...formData, source: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["Facebook", "Website", "WhatsApp", "Walk-in", "Referral"].map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea rows={5} value={formData.notes || ''} onChange={e => setFormData({...formData, notes: e.target.value})} />
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Linked Tasks</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingTasks ? (
                <Skeleton className="h-24 w-full" />
              ) : tasks && tasks.length > 0 ? (
                <div className="space-y-3">
                  {tasks.map(task => (
                    <div key={task.id} className="p-3 bg-muted rounded-md flex items-start gap-3">
                      <CheckSquare className={`w-4 h-4 mt-0.5 ${task.status === 'Done' ? 'text-primary' : 'text-muted-foreground'}`} />
                      <div>
                        <p className={`text-sm font-medium ${task.status === 'Done' ? 'line-through text-muted-foreground' : ''}`}>{task.title}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                          <Clock className="w-3 h-3" /> {task.dueDate}
                        </p>
                      </div>
                    </div>
                  ))}
                  <Button variant="outline" className="w-full mt-2" asChild>
                    <Link href="/tasks">View All Tasks</Link>
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No tasks linked</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
