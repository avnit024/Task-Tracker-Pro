import { useState } from "react";
import { Link } from "wouter";
import { format } from "date-fns";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { 
  Plus, 
  Search, 
  MoreHorizontal, 
  Briefcase, 
  Clock, 
  CheckCircle2, 
  Archive,
  BarChart3,
  Users
} from "lucide-react";
import { 
  useListProjects, getListProjectsQueryKey,
  useCreateProject,
  useGetMe, getGetMeQueryKey,
  Project,
  ProjectStatus
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";

const projectSchema = z.object({
  name: z.string().min(2, "Project name is required").max(100),
  description: z.string().max(500).optional(),
});

export default function Projects() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: user } = useGetMe({
    query: { queryKey: getGetMeQueryKey() }
  });

  const { data: projects = [], isLoading } = useListProjects({
    query: { queryKey: getListProjectsQueryKey() }
  });

  const createProject = useCreateProject();

  const form = useForm<z.infer<typeof projectSchema>>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  const filteredProjects = projects.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (p.description && p.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const activeProjects = filteredProjects.filter(p => p.status === 'active');
  const otherProjects = filteredProjects.filter(p => p.status !== 'active');

  const onSubmit = (values: z.infer<typeof projectSchema>) => {
    createProject.mutate(
      { data: { ...values, status: "active" as const } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
          setIsCreateOpen(false);
          form.reset();
          toast({
            title: "Project created",
            description: "Your new project has been created successfully.",
          });
        },
        onError: (error) => {
          toast({
            title: "Failed to create project",
            description: error.message,
            variant: "destructive",
          });
        }
      }
    );
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <Clock className="w-4 h-4 text-blue-500" />;
      case 'completed': return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'archived': return <Archive className="w-4 h-4 text-gray-500" />;
      default: return <Briefcase className="w-4 h-4" />;
    }
  };

  const ProjectCard = ({ project }: { project: Project }) => {
    const progress = project.taskCount > 0 
      ? Math.round((project.completedTaskCount / project.taskCount) * 100) 
      : 0;

    return (
      <Link href={`/projects/${project.id}`}>
        <Card className="h-full cursor-pointer hover-elevate transition-all border-border/50 hover:border-primary/50 group">
          <CardHeader className="pb-3">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-md bg-muted">
                  {getStatusIcon(project.status)}
                </div>
                <Badge variant={project.status === 'active' ? 'default' : 'secondary'} className="capitalize text-xs font-medium px-2 py-0.5">
                  {project.status.replace('_', ' ')}
                </Badge>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.preventDefault()}>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </div>
            <CardTitle className="mt-3 text-xl line-clamp-1">{project.name}</CardTitle>
            <p className="text-sm text-muted-foreground line-clamp-2 h-10 mt-1">
              {project.description || "No description provided."}
            </p>
          </CardHeader>
          <CardContent className="pb-3">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <BarChart3 className="w-4 h-4" />
                  Progress
                </span>
                <span className="font-medium">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          </CardContent>
          <CardFooter className="pt-3 border-t text-sm text-muted-foreground flex justify-between">
            <div className="flex items-center gap-1.5">
              <Users className="w-4 h-4" />
              {project.memberCount} members
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              {project.completedTaskCount}/{project.taskCount} tasks
            </div>
          </CardFooter>
        </Card>
      </Link>
    );
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground mt-1">Manage and track your team's projects.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search projects..."
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          {user?.role === "admin" && (
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button className="hover-elevate">
                  <Plus className="w-4 h-4 mr-2" />
                  New Project
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Project</DialogTitle>
                  <DialogDescription>
                    Add a new project to start organizing tasks and team members.
                  </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Project Name</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. Website Redesign" {...field} />
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
                            <Textarea 
                              placeholder="What is this project about?" 
                              className="resize-none" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <DialogFooter className="pt-4">
                      <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={createProject.isPending}>
                        {createProject.isPending ? "Creating..." : "Create Project"}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Card key={i} className="h-48 flex flex-col justify-between">
              <CardHeader>
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-full" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-2 w-full mb-4" />
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-1/4" />
                  <Skeleton className="h-4 w-1/4" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="text-center py-20 border rounded-lg border-dashed bg-muted/30">
          <Briefcase className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium">No projects found</h3>
          <p className="text-muted-foreground mt-1 max-w-sm mx-auto">
            Get started by creating your first project to organize your team's work.
          </p>
          {user?.role === "admin" && (
            <Button className="mt-6" onClick={() => setIsCreateOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Project
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          {activeProjects.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold tracking-tight">Active Projects</h2>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {activeProjects.map(project => (
                  <ProjectCard key={project.id} project={project} />
                ))}
              </div>
            </div>
          )}

          {otherProjects.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold tracking-tight text-muted-foreground">Other Projects</h2>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 opacity-80 hover:opacity-100 transition-opacity">
                {otherProjects.map(project => (
                  <ProjectCard key={project.id} project={project} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
