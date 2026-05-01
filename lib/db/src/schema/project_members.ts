import { pgTable, timestamp, integer, pgEnum, primaryKey } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { projectsTable } from "./projects";

export const memberRoleEnum = pgEnum("member_role", ["admin", "member"]);

export const projectMembersTable = pgTable(
  "project_members",
  {
    userId: integer("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    projectId: integer("project_id")
      .notNull()
      .references(() => projectsTable.id, { onDelete: "cascade" }),
    role: memberRoleEnum("role").notNull().default("member"),
    joinedAt: timestamp("joined_at").notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.projectId] })],
);

export type ProjectMember = typeof projectMembersTable.$inferSelect;
