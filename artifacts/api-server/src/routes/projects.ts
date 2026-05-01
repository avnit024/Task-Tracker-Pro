import { Router } from "express";
import { db, projectsTable, projectMembersTable, usersTable, tasksTable, activityTable } from "@workspace/db";
import { eq, and, count } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { CreateProjectBody, UpdateProjectBody, AddProjectMemberBody } from "@workspace/api-zod";

const router = Router();

async function getProjectWithCounts(projectId: number) {
  const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, projectId)).limit(1);
  if (!project) return null;

  const [taskCountRow] = await db.select({ count: count() }).from(tasksTable).where(eq(tasksTable.projectId, projectId));
  const [completedCountRow] = await db.select({ count: count() }).from(tasksTable).where(and(eq(tasksTable.projectId, projectId), eq(tasksTable.status, "done")));
  const [memberCountRow] = await db.select({ count: count() }).from(projectMembersTable).where(eq(projectMembersTable.projectId, projectId));

  return {
    ...project,
    taskCount: Number(taskCountRow.count),
    completedTaskCount: Number(completedCountRow.count),
    memberCount: Number(memberCountRow.count),
  };
}

function formatProject(p: NonNullable<Awaited<ReturnType<typeof getProjectWithCounts>>>) {
  return {
    id: p.id,
    name: p.name,
    description: p.description ?? null,
    status: p.status,
    ownerId: p.ownerId,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
    taskCount: p.taskCount,
    completedTaskCount: p.completedTaskCount,
    memberCount: p.memberCount,
  };
}

router.get("/projects", requireAuth, async (req, res) => {
  const userId = req.user!.userId;

  const memberOf = await db
    .select({ projectId: projectMembersTable.projectId })
    .from(projectMembersTable)
    .where(eq(projectMembersTable.userId, userId));

  const ownedProjects = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.ownerId, userId));

  const memberProjectIds = memberOf.map((m) => m.projectId);
  const allProjectIds = new Set([...ownedProjects.map((p) => p.id), ...memberProjectIds]);

  const projects = await Promise.all(
    Array.from(allProjectIds).map((id) => getProjectWithCounts(id)),
  );

  res.json(
    projects.filter(Boolean).map((p) => formatProject(p!)),
  );
});

router.post("/projects", requireAuth, async (req, res) => {
  const parsed = CreateProjectBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const { name, description, status } = parsed.data;
  const userId = req.user!.userId;

  const [project] = await db
    .insert(projectsTable)
    .values({ name, description, status: status || "active", ownerId: userId })
    .returning();

  await db.insert(projectMembersTable).values({
    userId,
    projectId: project.id,
    role: "admin",
  });

  await db.insert(activityTable).values({
    type: "project_created",
    description: `Created project "${name}"`,
    userId,
    projectId: project.id,
  });

  const p = await getProjectWithCounts(project.id);
  res.status(201).json(formatProject(p!));
});

router.get("/projects/:projectId", requireAuth, async (req, res) => {
  const projectId = Number(req.params.projectId);
  const userId = req.user!.userId;

  const project = await getProjectWithCounts(projectId);
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const member = await db
    .select()
    .from(projectMembersTable)
    .where(and(eq(projectMembersTable.projectId, projectId), eq(projectMembersTable.userId, userId)))
    .limit(1);

  if (project.ownerId !== userId && member.length === 0) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const tasks = await db
    .select({ task: tasksTable, assignee: usersTable })
    .from(tasksTable)
    .leftJoin(usersTable, eq(tasksTable.assigneeId, usersTable.id))
    .where(eq(tasksTable.projectId, projectId));

  const members = await db
    .select({ member: projectMembersTable, user: usersTable })
    .from(projectMembersTable)
    .innerJoin(usersTable, eq(projectMembersTable.userId, usersTable.id))
    .where(eq(projectMembersTable.projectId, projectId));

  res.json({
    id: project.id,
    name: project.name,
    description: project.description ?? null,
    status: project.status,
    ownerId: project.ownerId,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
    tasks: tasks.map(({ task, assignee }) => ({
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
    })),
    members: members.map(({ member, user }) => ({
      userId: member.userId,
      projectId: member.projectId,
      role: member.role,
      joinedAt: member.joinedAt.toISOString(),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt.toISOString(),
      },
    })),
  });
});

router.put("/projects/:projectId", requireAuth, async (req, res) => {
  const projectId = Number(req.params.projectId);
  const userId = req.user!.userId;

  const parsed = UpdateProjectBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, projectId)).limit(1);
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  if (project.ownerId !== userId && req.user!.role !== "admin") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  await db
    .update(projectsTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(projectsTable.id, projectId));

  const updated = await getProjectWithCounts(projectId);
  res.json(formatProject(updated!));
});

router.delete("/projects/:projectId", requireAuth, async (req, res) => {
  const projectId = Number(req.params.projectId);
  const userId = req.user!.userId;

  const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, projectId)).limit(1);
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  if (project.ownerId !== userId && req.user!.role !== "admin") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  await db.delete(projectsTable).where(eq(projectsTable.id, projectId));
  res.json({ message: "Project deleted" });
});

router.get("/projects/:projectId/members", requireAuth, async (req, res) => {
  const projectId = Number(req.params.projectId);

  const members = await db
    .select({ member: projectMembersTable, user: usersTable })
    .from(projectMembersTable)
    .innerJoin(usersTable, eq(projectMembersTable.userId, usersTable.id))
    .where(eq(projectMembersTable.projectId, projectId));

  res.json(
    members.map(({ member, user }) => ({
      userId: member.userId,
      projectId: member.projectId,
      role: member.role,
      joinedAt: member.joinedAt.toISOString(),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt.toISOString(),
      },
    })),
  );
});

router.post("/projects/:projectId/members", requireAuth, async (req, res) => {
  const projectId = Number(req.params.projectId);
  const userId = req.user!.userId;

  const parsed = AddProjectMemberBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, projectId)).limit(1);
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  if (project.ownerId !== userId && req.user!.role !== "admin") {
    const myMember = await db
      .select()
      .from(projectMembersTable)
      .where(and(eq(projectMembersTable.projectId, projectId), eq(projectMembersTable.userId, userId), eq(projectMembersTable.role, "admin")))
      .limit(1);
    if (myMember.length === 0) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
  }

  const { userId: newUserId, role } = parsed.data;

  const [addedUser] = await db.select().from(usersTable).where(eq(usersTable.id, newUserId)).limit(1);
  if (!addedUser) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const [existing] = await db
    .select()
    .from(projectMembersTable)
    .where(and(eq(projectMembersTable.projectId, projectId), eq(projectMembersTable.userId, newUserId)))
    .limit(1);

  if (existing) {
    res.status(400).json({ error: "User is already a member" });
    return;
  }

  const [member] = await db
    .insert(projectMembersTable)
    .values({ userId: newUserId, projectId, role: (role as "admin" | "member") || "member" })
    .returning();

  await db.insert(activityTable).values({
    type: "member_added",
    description: `Added ${addedUser.name} to the project`,
    userId,
    projectId,
  });

  res.status(201).json({
    userId: member.userId,
    projectId: member.projectId,
    role: member.role,
    joinedAt: member.joinedAt.toISOString(),
    user: {
      id: addedUser.id,
      name: addedUser.name,
      email: addedUser.email,
      role: addedUser.role,
      createdAt: addedUser.createdAt.toISOString(),
    },
  });
});

router.delete("/projects/:projectId/members/:userId", requireAuth, async (req, res) => {
  const projectId = Number(req.params.projectId);
  const targetUserId = Number(req.params.userId);
  const requesterId = req.user!.userId;

  const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, projectId)).limit(1);
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  if (project.ownerId !== requesterId && req.user!.role !== "admin") {
    const myMember = await db
      .select()
      .from(projectMembersTable)
      .where(and(eq(projectMembersTable.projectId, projectId), eq(projectMembersTable.userId, requesterId), eq(projectMembersTable.role, "admin")))
      .limit(1);
    if (myMember.length === 0) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
  }

  await db
    .delete(projectMembersTable)
    .where(and(eq(projectMembersTable.projectId, projectId), eq(projectMembersTable.userId, targetUserId)));

  res.json({ message: "Member removed" });
});

export default router;
