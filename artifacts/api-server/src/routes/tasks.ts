import { Router } from "express";
import { db, tasksTable, usersTable, projectsTable, projectMembersTable, activityTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { CreateTaskBody, UpdateTaskBody, ListTasksParams } from "@workspace/api-zod";

const router = Router({ mergeParams: true });

async function formatTask(task: typeof tasksTable.$inferSelect, assignee: typeof usersTable.$inferSelect | null) {
  return {
    id: task.id,
    title: task.title,
    description: task.description ?? null,
    status: task.status,
    priority: task.priority,
    projectId: task.projectId,
    assigneeId: task.assigneeId ?? null,
    assignee: assignee
      ? { id: assignee.id, name: assignee.name, email: assignee.email, role: assignee.role, createdAt: assignee.createdAt.toISOString() }
      : null,
    dueDate: task.dueDate ? task.dueDate.toISOString() : null,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  };
}

async function checkProjectAccess(projectId: number, userId: number) {
  const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, projectId)).limit(1);
  if (!project) return null;

  if (project.ownerId === userId) return project;

  const [member] = await db
    .select()
    .from(projectMembersTable)
    .where(and(eq(projectMembersTable.projectId, projectId), eq(projectMembersTable.userId, userId)))
    .limit(1);

  return member ? project : null;
}

const tasksRouter = Router({ mergeParams: true });

tasksRouter.get("/", requireAuth, async (req, res) => {
  const projectId = Number(req.params.projectId);
  const userId = req.user!.userId;

  const project = await checkProjectAccess(projectId, userId);
  if (!project) {
    res.status(403).json({ error: "Forbidden or project not found" });
    return;
  }

  const queryParams = ListTasksParams.safeParse(req.query);

  const conditions = [eq(tasksTable.projectId, projectId)];
  if (queryParams.success && queryParams.data.status) {
    conditions.push(eq(tasksTable.status, queryParams.data.status));
  }
  if (queryParams.success && queryParams.data.assigneeId) {
    conditions.push(eq(tasksTable.assigneeId, queryParams.data.assigneeId));
  }

  const tasks = await db
    .select({ task: tasksTable, assignee: usersTable })
    .from(tasksTable)
    .leftJoin(usersTable, eq(tasksTable.assigneeId, usersTable.id))
    .where(and(...conditions));

  res.json(await Promise.all(tasks.map(({ task, assignee }) => formatTask(task, assignee))));
});

tasksRouter.post("/", requireAuth, async (req, res) => {
  const projectId = Number(req.params.projectId);
  const userId = req.user!.userId;

  const project = await checkProjectAccess(projectId, userId);
  if (!project) {
    res.status(403).json({ error: "Forbidden or project not found" });
    return;
  }

  const parsed = CreateTaskBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const { title, description, status, priority, assigneeId, dueDate } = parsed.data;

  const [task] = await db
    .insert(tasksTable)
    .values({
      title,
      description,
      status: status || "todo",
      priority: priority || "medium",
      projectId,
      assigneeId: assigneeId || null,
      dueDate: dueDate ? new Date(dueDate) : null,
    })
    .returning();

  await db.insert(activityTable).values({
    type: "task_created",
    description: `Created task "${title}"`,
    userId,
    projectId,
    taskId: task.id,
  });

  let assignee: typeof usersTable.$inferSelect | null = null;
  if (task.assigneeId) {
    const [a] = await db.select().from(usersTable).where(eq(usersTable.id, task.assigneeId)).limit(1);
    assignee = a ?? null;
  }

  res.status(201).json(await formatTask(task, assignee));
});

tasksRouter.get("/:taskId", requireAuth, async (req, res) => {
  const projectId = Number(req.params.projectId);
  const taskId = Number(req.params.taskId);
  const userId = req.user!.userId;

  const project = await checkProjectAccess(projectId, userId);
  if (!project) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const [row] = await db
    .select({ task: tasksTable, assignee: usersTable })
    .from(tasksTable)
    .leftJoin(usersTable, eq(tasksTable.assigneeId, usersTable.id))
    .where(and(eq(tasksTable.id, taskId), eq(tasksTable.projectId, projectId)));

  if (!row) {
    res.status(404).json({ error: "Task not found" });
    return;
  }

  res.json(await formatTask(row.task, row.assignee));
});

tasksRouter.put("/:taskId", requireAuth, async (req, res) => {
  const projectId = Number(req.params.projectId);
  const taskId = Number(req.params.taskId);
  const userId = req.user!.userId;

  const project = await checkProjectAccess(projectId, userId);
  if (!project) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const parsed = UpdateTaskBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const [existing] = await db.select().from(tasksTable).where(and(eq(tasksTable.id, taskId), eq(tasksTable.projectId, projectId))).limit(1);
  if (!existing) {
    res.status(404).json({ error: "Task not found" });
    return;
  }

  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  if (parsed.data.title !== undefined) updateData.title = parsed.data.title;
  if (parsed.data.description !== undefined) updateData.description = parsed.data.description;
  if (parsed.data.status !== undefined) updateData.status = parsed.data.status;
  if (parsed.data.priority !== undefined) updateData.priority = parsed.data.priority;
  if (parsed.data.assigneeId !== undefined) updateData.assigneeId = parsed.data.assigneeId;
  if (parsed.data.dueDate !== undefined) updateData.dueDate = parsed.data.dueDate ? new Date(parsed.data.dueDate) : null;

  await db.update(tasksTable).set(updateData).where(eq(tasksTable.id, taskId));

  const activityType = parsed.data.status === "done" ? "task_completed" : "task_updated";
  await db.insert(activityTable).values({
    type: activityType,
    description: `Updated task "${existing.title}"`,
    userId,
    projectId,
    taskId,
  });

  const [row] = await db
    .select({ task: tasksTable, assignee: usersTable })
    .from(tasksTable)
    .leftJoin(usersTable, eq(tasksTable.assigneeId, usersTable.id))
    .where(eq(tasksTable.id, taskId));

  res.json(await formatTask(row.task, row.assignee));
});

tasksRouter.delete("/:taskId", requireAuth, async (req, res) => {
  const projectId = Number(req.params.projectId);
  const taskId = Number(req.params.taskId);
  const userId = req.user!.userId;

  const project = await checkProjectAccess(projectId, userId);
  if (!project) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  await db.delete(tasksTable).where(and(eq(tasksTable.id, taskId), eq(tasksTable.projectId, projectId)));
  res.json({ message: "Task deleted" });
});

export { tasksRouter };
export default tasksRouter;
