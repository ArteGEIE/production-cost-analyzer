import { boolean, customType, doublePrecision, index, integer, jsonb, pgTable, serial, text, uniqueIndex, varchar } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType() {
    return "bytea";
  },
});

export const productions = pgTable("productions", {
  id: serial("id").primaryKey(),
  producteur: varchar("producteur", { length: 255 }).notNull(),
  titre: varchar("titre", { length: 255 }).notNull(),
  dureeMinutes: integer("duree_minutes"),
  typeProduction: varchar("type_production", { length: 255 }),
  totalDevis: doublePrecision("total_devis"),
  coutMinute: doublePrecision("cout_minute"),
  confiance: varchar("confiance", { length: 50 }),
  diffuseur: varchar("diffuseur", { length: 255 }),
  lieuTournage: varchar("lieu_tournage", { length: 255 }),
  grilleCnc: jsonb("grille_cnc"),
  meta: jsonb("meta"),
  verificationMinima: jsonb("verification_minima"),
  anomalies: jsonb("anomalies"),
  postesNonClasses: jsonb("postes_non_classes"),
  qualitativeAnalysis: text("qualitative_analysis"),
  dateDevis: varchar("date_devis", { length: 20 }),
  formatSource: varchar("format_source", { length: 50 }),
  fileHash: varchar("file_hash", { length: 64 }),
  cncFunding: boolean("cnc_funding").default(false),
  status: varchar("status", { length: 20 }).notNull().default("published"),
  userId: varchar("user_id", { length: 255 }),
  userName: varchar("user_name", { length: 255 }),
  createdAt: varchar("created_at", { length: 30 }).notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => [
  // GDPR: supports the stale-draft purge (deleteStaleDrafts), which runs on
  // every extraction — DELETE WHERE status='draft' AND created_at < cutoff.
  // Partial index on drafts only keeps it tiny (drafts are transient).
  index("idx_productions_draft_created_at").on(table.createdAt).where(sql`status = 'draft'`),
]);

export const productionFiles = pgTable("production_files", {
  id: serial("id").primaryKey(),
  productionId: integer("production_id").notNull().unique().references(() => productions.id, { onDelete: "cascade" }),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  mimeType: varchar("mime_type", { length: 100 }).notNull(),
  data: bytea("data").notNull(),
  createdAt: varchar("created_at", { length: 30 }).notNull().$defaultFn(() => new Date().toISOString()),
});

export const ccMinimums = pgTable("cc_minimums", {
  id: serial("id").primaryKey(),
  roleKey: varchar("role_key", { length: 100 }).notNull(),
  label: varchar("label", { length: 255 }).notNull(),
  filiere: varchar("filiere", { length: 100 }),
  niveau: varchar("niveau", { length: 100 }),
  minimumDaily: doublePrecision("minimum_daily").notNull(),
  effectiveFrom: varchar("effective_from", { length: 20 }).notNull(),
  createdAt: varchar("created_at", { length: 30 }).notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => [
  uniqueIndex("idx_cc_minimums_unique").on(table.roleKey, table.effectiveFrom),
]);

export const productionNotes = pgTable("production_notes", {
  id: serial("id").primaryKey(),
  productionId: integer("production_id").notNull(),
  userId: varchar("user_id", { length: 255 }).notNull(),
  userName: varchar("user_name", { length: 255 }).notNull(),
  content: text("content").notNull(),
  createdAt: varchar("created_at", { length: 30 }).notNull().$defaultFn(() => new Date().toISOString()),
});

export const settings = pgTable("settings", {
  key: varchar("key", { length: 100 }).primaryKey(),
  value: text("value").notNull(),
  updatedAt: varchar("updated_at", { length: 30 }).notNull().$defaultFn(() => new Date().toISOString()),
});
