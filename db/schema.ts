import { pgTable, uuid, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const members = pgTable(
  "members",
  {
    id: uuid().primaryKey().defaultRandom(),
    name: text().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("members_name_lower_idx").on(sql`lower(${t.name})`)],
);
