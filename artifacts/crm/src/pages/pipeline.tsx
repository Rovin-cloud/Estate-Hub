import { useGetLeads, getGetLeadsQueryKey, useUpdateLead } from "@workspace/api-client-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { Phone, Clock } from "lucide-react";
import { formatDate } from "@/lib/format";
import { queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const STAGES = ["New", "Contacted", "Interested", "Site Visit", "Negotiation", "Booking", "Sold"];

export default function Pipeline() {
  const { data: leads, isLoading } = useGetLeads({}, { query: { queryKey: getGetLeadsQueryKey() } });
  const updateLead = useUpdateLead();
  const { toast } = useToast();

  const handleDragStart = (e: React.DragEvent, leadId: number) => {
    e.dataTransfer.setData("leadId", leadId.toString());
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    const leadId = Number(e.dataTransfer.getData("leadId"));
    if (!leadId) return;

    updateLead.mutate({ id: leadId, data: { status: newStatus } }, {
      onSuccess: () => {
        queryClient.setQueryData(getGetLeadsQueryKey(), (old: any) => {
          if (!old) return old;
          return old.map((l: any) => l.id === leadId ? { ...l, status: newStatus } : l);
        });
        toast({ title: `Moved to ${newStatus}` });
      }
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Pipeline</h1>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="min-w-[280px] w-[280px] shrink-0 bg-muted/30 rounded-lg p-3 space-y-3">
              <Skeleton className="h-6 w-24 mb-4" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const leadsByStage = STAGES.reduce((acc, stage) => {
    acc[stage] = leads?.filter(l => l.status === stage) || [];
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <div className="space-y-6 h-full flex flex-col overflow-hidden">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Pipeline</h1>
        <p className="text-muted-foreground">Drag and drop leads to update their stage.</p>
      </div>

      <div className="flex-1 flex gap-4 overflow-x-auto pb-4 items-start relative">
        {STAGES.map(stage => (
          <div 
            key={stage} 
            className="min-w-[300px] w-[300px] shrink-0 bg-muted/30 border rounded-xl flex flex-col max-h-full"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, stage)}
          >
            <div className="p-3 border-b bg-card/50 rounded-t-xl flex justify-between items-center sticky top-0">
              <h3 className="font-semibold">{stage}</h3>
              <Badge variant="secondary">{leadsByStage[stage].length}</Badge>
            </div>
            
            <div className="p-3 overflow-y-auto flex-1 space-y-3 min-h-[150px]">
              {leadsByStage[stage].map(lead => (
                <div 
                  key={lead.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, lead.id)}
                  className="cursor-grab active:cursor-grabbing"
                >
                  <Card className="hover:border-primary/50 transition-colors shadow-sm relative group">
                    <Link href={`/leads/${lead.id}`} className="absolute inset-0 z-10" />
                    <CardContent className="p-3">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium text-sm line-clamp-1">{lead.name}</h4>
                        <Badge variant="outline" className="text-[10px] px-1">{lead.source}</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground space-y-1">
                        <div className="flex items-center gap-1"><Phone className="w-3 h-3" /> {lead.phone}</div>
                        <div className="flex items-center gap-1"><Clock className="w-3 h-3" /> Added {formatDate(lead.createdAt)}</div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
