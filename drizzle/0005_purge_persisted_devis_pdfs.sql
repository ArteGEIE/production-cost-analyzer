-- Custom SQL migration file, put your code below! --

-- GDPR: the source devis PDF must no longer be persisted on saved
-- quotes. Drop every stored PDF that is not attached to a still-open draft.
-- Drafts keep their PDF only for the duration of the import/review session.
DELETE FROM "production_files"
WHERE "production_id" IN (
  SELECT "id" FROM "productions" WHERE "status" <> 'draft'
);
