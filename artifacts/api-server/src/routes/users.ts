import { Router } from "express";
import { db, usersTable } from "@workspace/db";
import { requireAuth, requireAdmin } from "../middlewares/auth";

const router = Router();

router.get("/users", requireAuth, requireAdmin, async (_req, res) => {
  const users = await db.select().from(usersTable);

  res.json(
    users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      createdAt: u.createdAt.toISOString(),
    })),
  );
});

export default router;
