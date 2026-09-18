CREATE TABLE "cc_minimums" (
	"id" serial PRIMARY KEY NOT NULL,
	"role_key" varchar(100) NOT NULL,
	"label" varchar(255) NOT NULL,
	"filiere" varchar(100),
	"niveau" varchar(100),
	"minimum_daily" double precision NOT NULL,
	"effective_from" varchar(20) NOT NULL,
	"created_at" varchar(30) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "productions" (
	"id" serial PRIMARY KEY NOT NULL,
	"producteur" varchar(255) NOT NULL,
	"titre" varchar(255) NOT NULL,
	"duree_minutes" integer,
	"type_production" varchar(255),
	"total_devis" double precision,
	"cout_minute" double precision,
	"confiance" varchar(50),
	"diffuseur" varchar(255),
	"lieu_tournage" varchar(255),
	"realisateurs" jsonb,
	"grille_cnc" jsonb,
	"meta" jsonb,
	"verification_minima" jsonb,
	"anomalies" jsonb,
	"postes_non_classes" jsonb,
	"qualitative_analysis" text,
	"date_devis" varchar(20),
	"format_source" varchar(50),
	"file_hash" varchar(64),
	"cnc_funding" boolean DEFAULT false,
	"user_id" varchar(255),
	"user_name" varchar(255),
	"created_at" varchar(30) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"key" varchar(100) PRIMARY KEY NOT NULL,
	"value" text NOT NULL,
	"updated_at" varchar(30) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "idx_cc_minimums_unique" ON "cc_minimums" USING btree ("role_key","effective_from");