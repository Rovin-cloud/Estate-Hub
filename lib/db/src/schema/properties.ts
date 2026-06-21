import { pgTable, text, serial, timestamp, numeric, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const propertiesTable = pgTable("properties", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id"),
  projectName: text("project_name").notNull(),
  location: text("location").notNull(),
  unitNumber: text("unit_number").notNull(),
  type: text("type").notNull().default("Flat"),
  block: text("block"),
  price: numeric("price", { precision: 14, scale: 2 }).notNull(),
  availability: text("availability").notNull().default("Available"),
  description: text("description"),
  floorPlan: text("floor_plan"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertPropertySchema = createInsertSchema(propertiesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertProperty = z.infer<typeof insertPropertySchema>;
export type Property = typeof propertiesTable.$inferSelect;
