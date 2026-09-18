CREATE TABLE "production_files" (
	"id" serial PRIMARY KEY NOT NULL,
	"production_id" integer NOT NULL,
	"file_name" varchar(255) NOT NULL,
	"mime_type" varchar(100) NOT NULL,
	"data" "bytea" NOT NULL,
	"created_at" varchar(30) NOT NULL,
	CONSTRAINT "production_files_production_id_unique" UNIQUE("production_id")
);
--> statement-breakpoint
ALTER TABLE "productions" ADD COLUMN "status" varchar(20) DEFAULT 'published' NOT NULL;