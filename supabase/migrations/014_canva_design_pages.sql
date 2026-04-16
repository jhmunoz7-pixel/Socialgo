-- ============================================================================
-- Migration 014: Per-page thumbnails for Canva designs
-- ============================================================================
-- A Canva design can have N pages (slides). Until now we only cached the
-- design-level thumbnail, which meant a post linked to "page 3 of 8" still
-- showed the full-design cover in the calendar — visually messy.
--
-- This migration adds a JSONB `pages` column to `canva_designs` storing an
-- array of { page_number, thumbnail_url } objects. When a post's
-- canva_page_number is set, the UI can look up the matching page thumbnail
-- here and render it on the calendar card and in the post drawer.
--
-- Shape:
--   [
--     { "page_number": 1, "thumbnail_url": "https://…" },
--     { "page_number": 2, "thumbnail_url": "https://…" }
--   ]
--
-- Population:
--   - /api/canva/sync accepts an optional `pages` array per design and
--     upserts it here.
--   - Future work: populate directly from Canva REST API
--     (GET /v1/designs/{id}/pages) once OAuth is wired up.
-- ============================================================================

ALTER TABLE public.canva_designs
  ADD COLUMN IF NOT EXISTS pages JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.canva_designs.pages IS
  'Array of {page_number, thumbnail_url} for each page of the design. Empty until synced.';
