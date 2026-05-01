import { pgTable, serial, text, timestamp, integer, pgEnum } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { projectsTable } from "./projects";
import { tasksTable } from "./tasks";

export const activityTypeEnum = pgEnum("activity_type", [
  "task_created",
  "task_updated",
  "task_completed",
  "project_created",
  "member_added",
]);

export const activityTable = pgTable("activity", {
  id: serial("id").primaryKey(),
  type: activityTypeEnum("type").notNull(),
  description: text("description").notNull(),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  projectId: integer("project_id").references(() => projectsTable.id, {
    onDelete: "cascade",
  }),
  taskId: integer("task_id").references(() => tasksTable.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Activity = typeof activityTable.$inferSelect;
