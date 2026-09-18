CREATE TABLE "production_notes" (
	"id" serial PRIMARY KEY NOT NULL,
	"production_id" integer NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"user_name" varchar(255) NOT NULL,
	"content" text NOT NULL,
	"created_at" varchar(30) NOT NULL
);
