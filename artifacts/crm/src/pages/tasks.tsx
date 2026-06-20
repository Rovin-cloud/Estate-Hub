import { useState } from "react";
import { Link } from "wouter";
import { useGetTasks, getGetTasksQueryKey, useCreateTask, useUpdateTask, useDeleteTask, useGetLeads, getGetLeadsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Plus, CheckSquare, Clock, MoreVertical, Trash2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const taskSchema = z.object({
  title: z.string().min(1, "Title is required"),
  status: z.enum(["Pending", "In Progress", "Done"]),
  dueDate: z.string().min(1, "Due date is required"),
  leadId: z.coerce.number().optional().or(z.literal("")),
  notes: z.string().optional(),
});

export default function Tasks() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const { toast } = useToast();

  const { data: tasks, isLoading } = useGetTasks({
    status: statusFilter !== "all" ? statusFilter : undefined
  }, { query: { queryKey: getGetTasksQueryKey({ status: statusFilter !== "all" ? statusFilter : undefined }) } });

  const { data: leads } = useGetLeads({}, { query: { queryKey: getGetLeadsQueryKey() } });

  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  const form = useForm<z.infer<typeof taskSchema>>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: "", status: "Pending", dueDate: new Date().toISOString().split('T')[0], leadId: "", notes: ""
    },
  });

  const onSubmit = (data: z.infer<typeof taskSchema>) => {
    createTask.mutate({ data: { ...data, leadId: data.leadId ? Number(data.leadId) : undefined } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetTasksQueryKey() });
        setIsCreateOpen(false);
        form.reset();
        toast({ title: "Task created successfully" });
      }
    });
  };

  const handleStatusChange = (id: number, status: string) => {
    updateTask.mutate({ id, data: { status } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetTasksQueryKey() });
        toast({ title: "Task updated" });
      }
    });
  };

  const handleDelete = (id: number) => {
    if (confirm("Delete this task?")) {
      deleteTask.mutate({ id }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetTasksQueryKey() });
        }
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Tasks</h1>
          <p className="text-muted-foreground">Stay on top of your follow-ups and meetings.</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" /> New Task</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Task</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="title" render={({ field }) => (
                  <FormItem><FormLabel>Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="dueDate" render={({ field }) => (
                    <FormItem><FormLabel>Due Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="status" render={({ field }) => (
                    <FormItem><FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          {["Pending", "In Progress", "Done"].map(s => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    <FormMessage /></FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="leadId" render={({ field }) => (
                  <FormItem><FormLabel>Link to Lead (Optional)</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value?.toString()}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select lead" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="">None</SelectItem>
                        {leads?.map(l => (
                          <SelectItem key={l.id} value={l.id.toString()}>{l.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  <FormMessage /></FormItem>
                )} />
                <DialogFooter>
                  <Button type="submit" disabled={createTask.isPending}>Save Task</Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-2">
        {["all", "Pending", "In Progress", "Done"].map((status) => (
          <Button 
            key={status} 
            variant={statusFilter === status ? "default" : "outline"}
            onClick={() => setStatusFilter(status)}
            size="sm"
            className="capitalize"
          >
            {status}
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3">
        {isLoading ? (
          <div className="h-20 bg-muted animate-pulse rounded" />
        ) : tasks?.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground bg-card border rounded-lg">No tasks found</div>
        ) : (
          tasks?.map(task => (
            <Card key={task.id} className={task.status === "Done" ? "opacity-75" : ""}>
              <div className="p-4 flex items-start gap-4">
                <button 
                  onClick={() => handleStatusChange(task.id, task.status === "Done" ? "Pending" : "Done")}
                  className="mt-1 flex-shrink-0"
                >
                  <CheckSquare className={`w-5 h-5 ${task.status === "Done" ? "text-primary" : "text-muted-foreground hover:text-primary transition-colors"}`} />
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <h3 className={`font-medium ${task.status === "Done" ? "line-through text-muted-foreground" : ""}`}>{task.title}</h3>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {task.dueDate}</span>
                        {task.leadId && task.leadName && (
                          <Link href={`/leads/${task.leadId}`} className="text-primary hover:underline flex items-center gap-1">
                            Link: {task.leadName}
                          </Link>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={task.status === "Done" ? "secondary" : task.status === "In Progress" ? "default" : "outline"}>
                        {task.status}
                      </Badge>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2"><MoreVertical className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {task.status !== "Done" && <DropdownMenuItem onClick={() => handleStatusChange(task.id, "Done")}>Mark Done</DropdownMenuItem>}
                          {task.status !== "In Progress" && <DropdownMenuItem onClick={() => handleStatusChange(task.id, "In Progress")}>Mark In Progress</DropdownMenuItem>}
                          {task.status !== "Pending" && <DropdownMenuItem onClick={() => handleStatusChange(task.id, "Pending")}>Mark Pending</DropdownMenuItem>}
                          <DropdownMenuItem onClick={() => handleDelete(task.id)} className="text-destructive"><Trash2 className="w-4 h-4 mr-2" /> Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
