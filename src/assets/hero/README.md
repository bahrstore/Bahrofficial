# Hero slider photos

Drop one photo per slide here, then rebuild (`npm run dev` picks them up after a restart):

| File name (any of .jpg .jpeg .png .webp .avif) | Slide |
|---|---|
| `car` | 1 — Car Accessories ("Drive calmer.") |
| `mobile` | 2 — Mobile Accessories ("Power that keeps up.") |
| `trending` | 3 — Trending ("Worth having.") |

Tips: landscape, at least 1600px wide, under ~400 KB (export as WebP or JPEG quality ~75). The bottom-left
corner sits under the slide text and a dark gradient, so keep the subject centre or right. On phones the
slider crops to a taller shape around the centre; tweak `HERO_FOCUS` in `src/data.ts` if a subject gets cut.

A slide without a file here keeps its current placeholder photo.
