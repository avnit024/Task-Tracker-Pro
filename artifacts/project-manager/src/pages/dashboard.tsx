import { useState } from "react";
import { Link, useLocation } from "wouter";
import { format } from "date-fns";
import { 
  CheckCircle2, 
  Circle, 
  Clock, 
  AlertCircle, 
  Plus, 
  ChevronRight,
  MoreVertical,
  Activity,
  Briefcase,
  ListTodo
} from "lucide-react";
import { 
  useGetDashboardSummary, getGetDashboardSummaryQueryKey,
  useGetMyTasks, getGetMyTasksQueryKey,
  useGetOverdueTasks, getGetOverdueTasksQueryKey,
  useGetRecentActivity, getGetRecentActivityQueryKey,
  useGetMe, getGetMeQueryKey,
  Task, ActivityItem
} from "@workspace/api-client-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export default function Dashboard() {
  const { data: user } = useGetMe({
    query: { queryKey: getGetMeQueryKey() }
  });

  const { data: summary, isLoading: isLoadingSummary } = useGetDashboardSummary({
    query: { queryKey: getGetDashboardSummaryQueryKey() }
  });

  const { data: myTasks, isLoading: isLoadingTasks } = useGetMyTasks({
    query: { queryKey: getGetMyTasksQueryKey() }
  });

  const { data: overdueTasks, isLoading: isLoadingOverdue } = useGetOverdueTasks({
    query: { queryKey: getGetOverdueTasksQueryKey() }
  });

  const { data: activity, isLoading: isLoadingActivity } = useGetRecentActivity({
    query: { queryKey: getGetRecentActivityQueryKey() }
  });

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "task_created":
        return <Plus className="h-4 w-4 text-blue-500" />;
      case "task_updated":
        return <MoreVertical className="h-4 w-4 text-orange-500" />;
      case "task_completed":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "project_created":
        return <Briefcase className="h-4 w-4 text-purple-500" />;
      case "member_added":
        return <Activity className="h-4 w-4 text-indigo-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "text-red-500 bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-900/50";
      case "medium":
        return "text-orange-500 bg-orange-50 dark:bg-orange-500/10 border-orange-200 dark:border-orange-900/50";
      case "low":
        return "text-blue-500 bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-900/50";
      default:
        return "text-gray-500 bg-gray-50 dark:bg-gray-500/10 border-gray-200 dark:border-gray-900/50";
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2 md:flex-row md:items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Welcome back, {user?.name.split(' ')[0]}</h1>
          <p className="text-muted-foreground">Here's what's happening across your projects today.</p>
        </div>
        {user?.role === "admin" && (
          <Button asChild className="hover-elevate">
            <Link href="/projects">
              <Plus className="mr-2 h-4 w-4" /> New Project
            </Link>
          </Button>
        )}
      </div>

      {/* Stats row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="hover-elevate transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoadingSummary ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold">{summary?.totalProjects || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {summary?.activeProjects || 0} active projects
                </p>
              </>
            )}
          </CardContent>
        </Card>
        
        <Card className="hover-elevate transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">My Tasks</CardTitle>
            <ListTodo className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoadingSummary ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold">{summary?.myAssignedTasks || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Assigned to you
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="hover-elevate transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoadingSummary ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold">{summary?.completedTasks || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Across all projects
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="hover-elevate transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-destructive">Overdue</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            {isLoadingSummary ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold text-destructive">{summary?.overdueTasks || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Needs immediate attention
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <Card className="lg:col-span-4 flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>My Tasks</CardTitle>
              <CardDescription>Tasks assigned to you</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/projects">View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col min-h-0">
            <ScrollArea className="flex-1 -mx-6 px-6">
              {isLoadingTasks ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-4">
                      <Skeleton className="h-4 w-4 rounded-full" />
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/4" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : myTasks?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle2 className="mx-auto h-8 w-8 text-muted-foreground/50 mb-3" />
                  <p>You have no assigned tasks.</p>
                </div>
              ) : (
                <div className="space-y-4 pr-4">
                  {myTasks?.slice(0, 5).map((task) => (
                    <Link key={task.id} href={`/projects/${task.projectId}/tasks/${task.id}`}>
                      <div className="group flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent hover:text-accent-foreground transition-all cursor-pointer">
                        <div className="mt-0.5">
                          {task.status === 'done' ? (
                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                          ) : task.status === 'in_progress' ? (
                            <Clock className="h-5 w-5 text-blue-500" />
                          ) : (
                            <Circle className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium leading-none mb-1 group-hover:underline">
                            {task.title}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="truncate max-w-[120px]">{task.projectName}</span>
                            <span>•</span>
                            <Badge variant="outline" className={`h-5 px-1.5 text-[10px] uppercase font-semibold ${getPriorityColor(task.priority)}`}>
                              {task.priority}
                            </Badge>
                            {task.dueDate && (
                              <>
                                <span>•</span>
                                <span className={new Date(task.dueDate) < new Date() ? "text-destructive font-medium" : ""}>
                                  Due {format(new Date(task.dueDate), "MMM d")}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3 flex flex-col">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest updates across projects</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col min-h-0">
            <ScrollArea className="flex-1 -mx-6 px-6">
              {isLoadingActivity ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="flex gap-4">
                      <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : activity?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No recent activity.</p>
                </div>
              ) : (
                <div className="space-y-6 pr-4 relative before:absolute before:inset-0 before:ml-4 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
                  {activity?.map((item) => (
                    <div key={item.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full border bg-background shadow-sm shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 relative z-10">
                        {getActivityIcon(item.type)}
                      </div>
                      <div className="w-[calc(100%-3rem)] md:w-[calc(50%-1.5rem)] p-3 rounded-lg border bg-card/50 text-sm">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-foreground">{item.userName}</span>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(item.createdAt), "MMM d, h:mm a")}
                          </span>
                        </div>
                        <p className="text-muted-foreground text-xs leading-relaxed">
                          {item.description}
                        </p>
                        {(item.projectId || item.taskId) && (
                          <div className="mt-2 flex items-center gap-2">
                            {item.projectId && (
                              <Link href={`/projects/${item.projectId}`} className="text-xs text-primary hover:underline flex items-center gap-1">
                                <Briefcase className="w-3 h-3" /> Project
                              </Link>
                            )}
                            {item.taskId && item.projectId && (
                              <Link href={`/projects/${item.projectId}/tasks/${item.taskId}`} className="text-xs text-primary hover:underline flex items-center gap-1">
                                <ListTodo className="w-3 h-3" /> Task
                              </Link>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
