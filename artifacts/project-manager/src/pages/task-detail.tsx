import { useState, useEffect } from "react";
import { Link, useRoute, useLocation } from "wouter";
import { format } from "date-fns";
import { 
  ChevronLeft, 
  Calendar,
  Clock,
  CheckCircle2,
  Circle,
  User as UserIcon,
  Flag,
  Save,
  Trash2
} from "lucide-react";
import { 
  useGetTask, getGetTaskQueryKey,
  useUpdateTask,
  useDeleteTask,
  useGetProject, getGetProjectQueryKey,
  useListProjectMembers, getListProjectMembersQueryKey,
  useGetMe, getGetMeQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function TaskDetail() {
  const [, params] = useRoute("/projects/:projectId/tasks/:taskId");
  const [, setLocation] = useLocation();
  const projectId = parseInt(params?.projectId || "0", 10);
  const taskId = parseInt(params?.taskId || "0", 10);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: me } = useGetMe({
    query: { queryKey: getGetMeQueryKey() }
  });

  const { data: task, isLoading: isLoadingTask } = useGetTask(projectId, taskId, {
    query: { enabled: !!projectId && !!taskId, queryKey: getGetTaskQueryKey(projectId, taskId) }
  });

  const { data: project } = useGetProject(projectId, {
    query: { enabled: !!projectId, queryKey: getGetProjectQueryKey(projectId) }
  });

  const { data: members = [] } = useListProjectMembers(projectId, {
    query: { enabled: !!projectId, queryKey: getListProjectMembersQueryKey(projectId) }
  });

  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (task && !isDirty) {
      setTitle(task.title);
      setDescription(task.description || "");
    }
  }, [task, isDirty]);

  const handleUpdateField = (field: string, value: unknown) => {
    updateTask.mutate(
      { projectId, taskId, data: { [field]: value } },
      {
        onSuccess: (updatedTask) => {
          queryClient.setQueryData(getGetTaskQueryKey(projectId, taskId), updatedTask);
          toast({ title: `Task ${field} updated` });
        },
        onError: (error) => {
          toast({
            title: "Failed to update",
            description: error.message,
            variant: "destructive",
          });
        }
      }
    );
  };

  const handleSaveText = () => {
    if (!title.trim()) return;
    
    updateTask.mutate(
      { projectId, taskId, data: { title, description } },
      {
        onSuccess: (updatedTask) => {
          queryClient.setQueryData(getGetTaskQueryKey(projectId, taskId), updatedTask);
          setIsDirty(false);
          toast({ title: "Task updated" });
        }
      }
    );
  };

  const handleDelete = () => {
    deleteTask.mutate(
      { projectId, taskId },
      {
        onSuccess: () => {
          toast({ title: "Task deleted" });
          setLocation(`/projects/${projectId}`);
        }
      }
    );
  };

  if (isLoadingTask) {
    return <div className="p-8 max-w-4xl mx-auto"><Skeleton className="h-10 w-2/3 mb-8" /></div>;
  }

  if (!task) {
    return <div className="p-8 text-center">Task not found</div>;
  }

  return (
    <div className="p-8 max-w-5xl mx-auto animate-in fade-in duration-500">
      <div className="mb-6 flex items-center justify-between">
        <Link href={`/projects/${projectId}`} className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="w-4 h-4 mr-1" /> Back to {project?.name || "Project"}
        </Link>
        
        {me?.role === "admin" && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                <Trash2 className="w-4 h-4 mr-2" /> Delete Task
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the task.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="space-y-4">
            <Input 
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setIsDirty(true);
              }}
              className="text-2xl font-bold border-transparent px-0 hover:border-input focus-visible:ring-0 focus-visible:border-input shadow-none rounded-sm h-auto py-2"
              placeholder="Task title"
            />
            
            <Textarea 
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                setIsDirty(true);
              }}
              className="min-h-[200px] border-transparent px-0 hover:border-input focus-visible:ring-0 focus-visible:border-input shadow-none rounded-sm resize-none"
              placeholder="Add a more detailed description..."
            />
            
            {isDirty && (
              <div className="flex justify-end pt-2">
                <Button onClick={handleSaveText} disabled={updateTask.isPending || !title.trim()}>
                  <Save className="w-4 h-4 mr-2" /> Save Changes
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <Card>
            <CardContent className="p-5 space-y-5">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</label>
                <Select 
                  value={task.status} 
                  onValueChange={(val) => handleUpdateField("status", val)}
                >
                  <SelectTrigger className="w-full bg-transparent">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todo">
                      <div className="flex items-center"><Circle className="w-4 h-4 mr-2 text-muted-foreground" /> To Do</div>
                    </SelectItem>
                    <SelectItem value="in_progress">
                      <div className="flex items-center"><Clock className="w-4 h-4 mr-2 text-blue-500" /> In Progress</div>
                    </SelectItem>
                    <SelectItem value="done">
                      <div className="flex items-center"><CheckCircle2 className="w-4 h-4 mr-2 text-green-500" /> Done</div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Priority</label>
                <Select 
                  value={task.priority} 
                  onValueChange={(val) => handleUpdateField("priority", val)}
                >
                  <SelectTrigger className="w-full bg-transparent">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">
                      <div className="flex items-center"><Flag className="w-4 h-4 mr-2 text-blue-500" /> Low</div>
                    </SelectItem>
                    <SelectItem value="medium">
                      <div className="flex items-center"><Flag className="w-4 h-4 mr-2 text-orange-500" /> Medium</div>
                    </SelectItem>
                    <SelectItem value="high">
                      <div className="flex items-center"><Flag className="w-4 h-4 mr-2 text-red-500" /> High</div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Assignee</label>
                <Select 
                  value={task.assigneeId?.toString() || "unassigned"} 
                  onValueChange={(val) => handleUpdateField("assigneeId", val === "unassigned" ? null : parseInt(val, 10))}
                >
                  <SelectTrigger className="w-full bg-transparent">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">
                      <div className="flex items-center text-muted-foreground">
                        <UserIcon className="w-4 h-4 mr-2" /> Unassigned
                      </div>
                    </SelectItem>
                    {members.map((m) => (
                      <SelectItem key={m.userId} value={m.userId.toString()}>
                        <div className="flex items-center">
                          <Avatar className="w-5 h-5 mr-2">
                            <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                              {m.user.name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          {m.user.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <Calendar className="w-3 h-3 inline mr-1" />Due Date
                </label>
                <Input 
                  type="date" 
                  value={task.dueDate ? task.dueDate.split('T')[0] : ""} 
                  onChange={(e) => handleUpdateField("dueDate", e.target.value || null)}
                  className="bg-transparent"
                />
              </div>

              <div className="pt-4 mt-2 border-t text-xs text-muted-foreground flex flex-col gap-2">
                <div>Created on {format(new Date(task.createdAt), "MMM d, yyyy")}</div>
                <div>Last updated {format(new Date(task.updatedAt), "MMM d, h:mm a")}</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
