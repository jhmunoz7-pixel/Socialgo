-- ============================================================================
-- Migration 013: Link a post to a specific page of a Canva design
-- ============================================================================
-- Before this, a post could be linked to a whole Canva design via
-- canva_designs.linked_post_id. Now a post carries its own reference to a
-- Canva design AND the page index within that design, so we can show a
-- per-page thumbnail in the calendar instead of the whole-design one.
-- ============================================================================

ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS canva_design_id UUID
    REFERENCES public.canva_designs(id) ON DELETE SET NULL;

ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS canva_page_number INTEGER
    CHECK (canva_page_number IS NULL OR canva_page_number >= 1);

-- Speed up calendar lookups by design
CREATE INDEX IF NOT EXISTS posts_canva_design_idx
  ON public.posts (canva_design_id)
  WHERE canva_design_id IS NOT NULL;

COMMENT ON COLUMN public.posts.canva_design_id IS
  'FK to canva_designs. A post can point to a Canva design so we render its thumbnail on the calendar.';
COMMENT ON COLUMN public.posts.canva_page_number IS
  '1-based page index within the linked Canva design. NULL means use the design-level thumbnail.';
