import { useState } from "react";
import { Link, useRoute } from "wouter";
import { format } from "date-fns";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { 
  ChevronLeft, 
  MoreHorizontal, 
  Plus, 
  Calendar,
  Clock,
  CheckCircle2,
  Circle,
  User as UserIcon,
  Briefcase,
  AlertCircle,
  Archive,
  Settings
} from "lucide-react";
import { 
  useGetProject, getGetProjectQueryKey,
  useUpdateProject,
  useListTasks, getListTasksQueryKey,
  useCreateTask,
  useListProjectMembers, getListProjectMembersQueryKey,
  useAddProjectMember,
  useRemoveProjectMember,
  useListUsers, getListUsersQueryKey,
  useGetMe, getGetMeQueryKey,
  Task,
  User
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";

const taskSchema = z.object({
  title: z.string().min(2, "Task title is required").max(100),
  description: z.string().max(500).optional(),
  status: z.enum(["todo", "in_progress", "done"]).default("todo"),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  assigneeId: z.string().optional().transform(v => v ? parseInt(v, 10) : undefined),
  dueDate: z.string().optional(),
});

export default function ProjectDetail() {
  const [, params] = useRoute("/projects/:projectId");
  const projectId = parseInt(params?.projectId || "0", 10);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isTaskOpen, setIsTaskOpen] = useState(false);
  const [isMemberOpen, setIsMemberOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>("");

  const { data: me } = useGetMe({
    query: { queryKey: getGetMeQueryKey() }
  });

  const { data: project, isLoading: isLoadingProject } = useGetProject(projectId, {
    query: { enabled: !!projectId, queryKey: getGetProjectQueryKey(projectId) }
  });

  const { data: tasks = [], isLoading: isLoadingTasks } = useListTasks(projectId, undefined, {
    query: { enabled: !!projectId, queryKey: getListTasksQueryKey(projectId) }
  });

  const { data: members = [], isLoading: isLoadingMembers } = useListProjectMembers(projectId, {
    query: { enabled: !!projectId, queryKey: getListProjectMembersQueryKey(projectId) }
  });

  const { data: users = [] } = useListUsers({
    query: { enabled: me?.role === "admin", queryKey: getListUsersQueryKey() }
  });

  const createTask = useCreateTask();
  const addMember = useAddProjectMember();
  const removeMember = useRemoveProjectMember();
  const updateProject = useUpdateProject();

  const isAdmin = me?.role === "admin";
  const isOwner = project?.ownerId === me?.id;
  const canManage = isAdmin || isOwner;

  const form = useForm<z.infer<typeof taskSchema>>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: "",
      description: "",
      status: "todo",
      priority: "medium",
    },
  });

  const onTaskSubmit = (values: z.infer<typeof taskSchema>) => {
    createTask.mutate(
      { projectId, data: values as any },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListTasksQueryKey(projectId) });
          queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(projectId) });
          setIsTaskOpen(false);
          form.reset();
          toast({ title: "Task created successfully" });
        },
        onError: (error) => {
          toast({
            title: "Failed to create task",
            description: error.message,
            variant: "destructive",
          });
        }
      }
    );
  };

  const handleAddMember = () => {
    if (!selectedUserId) return;
    addMember.mutate(
      { projectId, data: { userId: parseInt(selectedUserId, 10), role: "member" } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListProjectMembersQueryKey(projectId) });
          queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(projectId) });
          setIsMemberOpen(false);
          setSelectedUserId("");
          toast({ title: "Member added successfully" });
        },
        onError: (error) => {
          toast({
            title: "Failed to add member",
            description: error.message,
            variant: "destructive",
          });
        }
      }
    );
  };

  const handleRemoveMember = (userId: number) => {
    removeMember.mutate(
      { projectId, userId },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListProjectMembersQueryKey(projectId) });
          queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(projectId) });
          toast({ title: "Member removed successfully" });
        },
        onError: (error) => {
          toast({
            title: "Failed to remove member",
            description: error.message,
            variant: "destructive",
          });
        }
      }
    );
  };

  const handleStatusChange = (status: "active" | "completed" | "archived") => {
    updateProject.mutate(
      { projectId, data: { status } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(projectId) });
          toast({ title: `Project marked as ${status}` });
        }
      }
    );
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "text-red-500 bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-900/50";
      case "medium": return "text-orange-500 bg-orange-50 dark:bg-orange-500/10 border-orange-200 dark:border-orange-900/50";
      case "low": return "text-blue-500 bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-900/50";
      default: return "";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'todo': return <Circle className="w-5 h-5 text-muted-foreground" />;
      case 'in_progress': return <Clock className="w-5 h-5 text-blue-500" />;
      case 'done': return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      default: return <Circle className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const unassignedUsers = users.filter(u => !members.some(m => m.userId === u.id));

  if (isLoadingProject) {
    return <div className="p-8 max-w-7xl mx-auto"><Skeleton className="h-10 w-1/3 mb-4" /><Skeleton className="h-6 w-2/3" /></div>;
  }

  if (!project) {
    return <div className="p-8 text-center">Project not found</div>;
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div>
        <Link href="/projects" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
          <ChevronLeft className="w-4 h-4 mr-1" /> Back to Projects
        </Link>
        
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
              <Badge variant={project.status === 'active' ? 'default' : 'secondary'} className="capitalize">
                {project.status}
              </Badge>
            </div>
            <p className="text-muted-foreground max-w-2xl">{project.description || "No description provided."}</p>
          </div>
          
          {canManage && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="shrink-0">
                  <Settings className="w-4 h-4 mr-2" />
                  Manage
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleStatusChange("active")} disabled={project.status === "active"}>
                  <Clock className="w-4 h-4 mr-2" /> Mark Active
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleStatusChange("completed")} disabled={project.status === "completed"}>
                  <CheckCircle2 className="w-4 h-4 mr-2" /> Mark Completed
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleStatusChange("archived")} disabled={project.status === "archived"} className="text-muted-foreground">
                  <Archive className="w-4 h-4 mr-2" /> Archive Project
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      <Tabs defaultValue="tasks" className="w-full">
        <TabsList className="mb-6 w-full justify-start h-auto p-0 bg-transparent border-b rounded-none">
          <TabsTrigger value="tasks" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3">
            Tasks
            <Badge variant="secondary" className="ml-2 bg-muted-foreground/10">{tasks.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="members" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3">
            Members
            <Badge variant="secondary" className="ml-2 bg-muted-foreground/10">{members.length}</Badge>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="tasks" className="space-y-6 mt-0">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold tracking-tight">Project Tasks</h2>
            
            <Dialog open={isTaskOpen} onOpenChange={setIsTaskOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  New Task
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Create New Task</DialogTitle>
                  <DialogDescription>
                    Add a new task to {project.name}.
                  </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onTaskSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Task Title</FormLabel>
                          <FormControl>
                            <Input placeholder="What needs to be done?" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description (Optional)</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Add more details..." className="resize-none" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="status"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Status</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="todo">To Do</SelectItem>
                                <SelectItem value="in_progress">In Progress</SelectItem>
                                <SelectItem value="done">Done</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="priority"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Priority</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select priority" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="low">Low</SelectItem>
                                <SelectItem value="medium">Medium</SelectItem>
                                <SelectItem value="high">High</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="assigneeId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Assignee</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value?.toString()}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Unassigned" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="unassigned">Unassigned</SelectItem>
                                {members.map(m => (
                                  <SelectItem key={m.userId} value={m.userId.toString()}>
                                    {m.user.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="dueDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Due Date (Optional)</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <DialogFooter className="pt-4">
                      <Button type="button" variant="outline" onClick={() => setIsTaskOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={createTask.isPending}>
                        {createTask.isPending ? "Creating..." : "Create Task"}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {['todo', 'in_progress', 'done'].map((statusColumn) => {
              const columnTasks = tasks.filter(t => t.status === statusColumn);
              
              return (
                <div key={statusColumn} className="space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b">
                    <h3 className="font-semibold capitalize flex items-center gap-2">
                      {statusColumn === 'todo' && <Circle className="w-4 h-4 text-muted-foreground" />}
                      {statusColumn === 'in_progress' && <Clock className="w-4 h-4 text-blue-500" />}
                      {statusColumn === 'done' && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                      {statusColumn.replace('_', ' ')}
                    </h3>
                    <Badge variant="secondary">{columnTasks.length}</Badge>
                  </div>
                  
                  <div className="space-y-3">
                    {columnTasks.length === 0 ? (
                      <div className="p-8 text-center border border-dashed rounded-lg text-sm text-muted-foreground">
                        No tasks
                      </div>
                    ) : (
                      columnTasks.map(task => (
                        <Link key={task.id} href={`/projects/${projectId}/tasks/${task.id}`}>
                          <Card className="cursor-pointer hover-elevate transition-all border-border hover:border-primary/50">
                            <CardContent className="p-4">
                              <div className="flex justify-between items-start mb-2">
                                <Badge variant="outline" className={`text-[10px] uppercase font-semibold h-5 px-1.5 ${getPriorityColor(task.priority)}`}>
                                  {task.priority}
                                </Badge>
                                {task.dueDate && (
                                  <div className="flex items-center text-xs text-muted-foreground">
                                    <Calendar className="w-3 h-3 mr-1" />
                                    {format(new Date(task.dueDate), "MMM d")}
                                  </div>
                                )}
                              </div>
                              <p className="font-medium text-sm leading-tight mb-3 line-clamp-2">{task.title}</p>
                              
                              <div className="flex items-center justify-between mt-auto">
                                <div className="flex -space-x-2">
                                  {task.assignee ? (
                                    <Avatar className="w-6 h-6 border-2 border-background">
                                      <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                                        {task.assignee.name.charAt(0).toUpperCase()}
                                      </AvatarFallback>
                                    </Avatar>
                                  ) : (
                                    <div className="w-6 h-6 rounded-full border-2 border-background bg-muted flex items-center justify-center">
                                      <UserIcon className="w-3 h-3 text-muted-foreground" />
                                    </div>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </Link>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>
        
        <TabsContent value="members" className="space-y-6 mt-0">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold tracking-tight">Team Members</h2>
            
            {canManage && (
              <Dialog open={isMemberOpen} onOpenChange={setIsMemberOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Member
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Team Member</DialogTitle>
                    <DialogDescription>
                      Select a user to add them to this project.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="py-4 space-y-4">
                    <div className="space-y-2">
                      <FormLabel>User</FormLabel>
                      <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select user" />
                        </SelectTrigger>
                        <SelectContent>
                          {unassignedUsers.map(user => (
                            <SelectItem key={user.id} value={user.id.toString()}>
                              {user.name} ({user.email})
                            </SelectItem>
                          ))}
                          {unassignedUsers.length === 0 && (
                            <SelectItem value="none" disabled>No available users</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsMemberOpen(false)}>Cancel</Button>
                    <Button onClick={handleAddMember} disabled={!selectedUserId || selectedUserId === "none" || addMember.isPending}>
                      {addMember.isPending ? "Adding..." : "Add Member"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {members.map(member => (
              <Card key={member.userId}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar>
                      <AvatarFallback className="bg-primary/10 text-primary font-medium">
                        {member.user.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{member.user.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{member.user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pl-2">
                    <Badge variant={member.role === 'admin' ? "default" : "secondary"} className="capitalize text-[10px]">
                      {member.role}
                    </Badge>
                    {canManage && member.userId !== project.ownerId && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem 
                            className="text-destructive"
                            onClick={() => handleRemoveMember(member.userId)}
                            disabled={removeMember.isPending}
                          >
                            Remove from project
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
