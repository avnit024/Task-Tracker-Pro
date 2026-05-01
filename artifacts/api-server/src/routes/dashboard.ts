import { Router } from "express";
import { db, tasksTable, projectsTable, projectMembersTable, activityTable, usersTable } from "@workspace/db";
import { eq, and, lt, count, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();

router.get("/dashboard/summary", requireAuth, async (req, res) => {
  const userId = req.user!.userId;

  const memberOf = await db
    .select({ projectId: projectMembersTable.projectId })
    .from(projectMembersTable)
    .where(eq(projectMembersTable.userId, userId));

  const ownedProjects = await db
    .select({ id: projectsTable.id })
    .from(projectsTable)
    .where(eq(projectsTable.ownerId, userId));

  const allProjectIds = new Set([
    ...ownedProjects.map((p) => p.id),
    ...memberOf.map((m) => m.projectId),
  ]);

  const projectIdArr = Array.from(allProjectIds);

  const [totalProjects] = await db.select({ count: count() }).from(projectsTable).where(eq(projectsTable.ownerId, userId));

  const now = new Date();

  let totalTasks = 0;
  let completedTasks = 0;
  let overdueTasks = 0;
  const statusCounts = { todo: 0, in_progress: 0, done: 0 };

  for (const projectId of projectIdArr) {
    const tasks = await db.select().from(tasksTable).where(eq(tasksTable.projectId, projectId));
    totalTasks += tasks.length;
    for (const task of tasks) {
      if (task.status === "done") completedTasks++;
      if (task.status !== "done" && task.dueDate && task.dueDate < now) overdueTasks++;
      statusCounts[task.status]++;
    }
  }

  const [myTasksCount] = await db
    .select({ count: count() })
    .from(tasksTable)
    .where(eq(tasksTable.assigneeId, userId));

  const activeProjectIds = projectIdArr.filter(async (id) => {
    const [p] = await db.select().from(projectsTable).where(eq(projectsTable.id, id)).limit(1);
    return p?.status === "active";
  });

  const activeProjects = await db
    .select({ count: count() })
    .from(projectsTable)
    .where(and(eq(projectsTable.ownerId, userId), eq(projectsTable.status, "active")));

  res.json({
    totalProjects: Number(totalProjects.count),
    activeProjects: Number(activeProjects[0]?.count ?? 0),
    totalTasks,
    completedTasks,
    overdueTasks,
    myAssignedTasks: Number(myTasksCount.count),
    tasksByStatus: statusCounts,
  });
});

router.get("/dashboard/my-tasks", requireAuth, async (req, res) => {
  const userId = req.user!.userId;

  const tasks = await db
    .select({ task: tasksTable, user: usersTable, project: projectsTable })
    .from(tasksTable)
    .leftJoin(usersTable, eq(tasksTable.assigneeId, usersTable.id))
    .innerJoin(projectsTable, eq(tasksTable.projectId, projectsTable.id))
    .where(eq(tasksTable.assigneeId, userId));

  res.json(
    tasks.map(({ task, user: assignee, project }) => ({
      id: task.id,
      title: task.title,
      description: task.description ?? null,
      status: task.status,
      priority: task.priority,
      projectId: task.projectId,
      projectName: project.name,
      assigneeId: task.assigneeId ?? null,
      assignee: assignee
        ? { id: assignee.id, name: assignee.name, email: assignee.email, role: assignee.role, createdAt: assignee.createdAt.toISOString() }
        : null,
      dueDate: task.dueDate ? task.dueDate.toISOString() : null,
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
    })),
  );
});

router.get("/dashboard/overdue", requireAuth, async (req, res) => {
  const userId = req.user!.userId;
  const now = new Date();

  const memberOf = await db
    .select({ projectId: projectMembersTable.projectId })
    .from(projectMembersTable)
    .where(eq(projectMembersTable.userId, userId));

  const ownedProjects = await db
    .select({ id: projectsTable.id })
    .from(projectsTable)
    .where(eq(projectsTable.ownerId, userId));

  const allProjectIds = new Set([
    ...ownedProjects.map((p) => p.id),
    ...memberOf.map((m) => m.projectId),
  ]);

  const overdueTasks = [];
  for (const projectId of allProjectIds) {
    const tasks = await db
      .select({ task: tasksTable, user: usersTable, project: projectsTable })
      .from(tasksTable)
      .leftJoin(usersTable, eq(tasksTable.assigneeId, usersTable.id))
      .innerJoin(projectsTable, eq(tasksTable.projectId, projectsTable.id))
      .where(and(eq(tasksTable.projectId, projectId), lt(tasksTable.dueDate, now)));

    for (const { task, user: assignee, project } of tasks) {
      if (task.status !== "done") {
        overdueTasks.push({
          id: task.id,
          title: task.title,
          description: task.description ?? null,
          status: task.status,
          priority: task.priority,
          projectId: task.projectId,
          projectName: project.name,
          assigneeId: task.assigneeId ?? null,
          assignee: assignee
            ? { id: assignee.id, name: assignee.name, email: assignee.email, role: assignee.role, createdAt: assignee.createdAt.toISOString() }
            : null,
          dueDate: task.dueDate ? task.dueDate.toISOString() : null,
          createdAt: task.createdAt.toISOString(),
          updatedAt: task.updatedAt.toISOString(),
        });
      }
    }
  }

  res.json(overdueTasks);
});

router.get("/dashboard/activity", requireAuth, async (req, res) => {
  const userId = req.user!.userId;

  const memberOf = await db
    .select({ projectId: projectMembersTable.projectId })
    .from(projectMembersTable)
    .where(eq(projectMembersTable.userId, userId));

  const ownedProjects = await db
    .select({ id: projectsTable.id })
    .from(projectsTable)
    .where(eq(projectsTable.ownerId, userId));

  const allProjectIds = Array.from(
    new Set([...ownedProjects.map((p) => p.id), ...memberOf.map((m) => m.projectId)]),
  );

  const activities = [];
  for (const projectId of allProjectIds) {
    const rows = await db
      .select({ activity: activityTable, user: usersTable, project: projectsTable })
      .from(activityTable)
      .innerJoin(usersTable, eq(activityTable.userId, usersTable.id))
      .leftJoin(projectsTable, eq(activityTable.projectId, projectsTable.id))
      .where(eq(activityTable.projectId, projectId))
      .orderBy(desc(activityTable.createdAt))
      .limit(20);

    for (const { activity, user, project } of rows) {
      activities.push({
        id: activity.id,
        type: activity.type,
        description: activity.description,
        userId: activity.userId,
        userName: user.name,
        projectId: activity.projectId ?? null,
        projectName: project?.name ?? null,
        taskId: activity.taskId ?? null,
        createdAt: activity.createdAt.toISOString(),
      });
    }
  }

  activities.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  res.json(activities.slice(0, 30));
});

export default router;
