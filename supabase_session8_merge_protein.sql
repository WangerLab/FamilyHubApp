-- Session 8 — Merge "Pflanzliche Proteine" + "Fleisch & Wurst" into single "Protein"
-- Also migrates stray Eier items that landed in wrong categories.
-- Execute this AFTER the frontend code change is deployed.

-- 1. Merge both old categories into "Protein"
UPDATE grocery_items
SET category = 'Protein'
WHERE category IN ('Pflanzliche Proteine', 'Fleisch & Wurst');

-- 2. Move any "Eier" items to Protein, regardless of current (wrong) category
UPDATE grocery_items
SET category = 'Protein'
WHERE LOWER(name) IN ('eier', 'ei', 'freilandeier', 'bio-eier', 'bioeier', 'wachteleier')
  AND category != 'Protein';

-- 3. Sanity check — show counts per category after migration
SELECT category, COUNT(*) AS item_count
FROM grocery_items
WHERE deleted_at IS NULL
GROUP BY category
ORDER BY item_count DESC;
