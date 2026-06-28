# Transaction Icon Redesign Design

## Summary

Redesign AccountBook transaction category icons from text-like badges into solid glass pictogram icons. The selected direction is the restrained solid glass version: icon silhouettes are real objects or actions, the background has a subtle glass gradient, and glow is controlled so recent transaction lists stay readable.

This is a presentation-layer change. Existing records, categories, account data, statistics, cloud sync, import, and export behavior must remain unchanged.

## Goals

- Replace transaction category badges that look like text labels with recognizable pictogram icons.
- Keep the dark fintech interface established by the current UI.
- Use the restrained solid glass style selected from the brainstorming mockup.
- Make common transaction categories scannable without relying on Chinese label text inside the icon.
- Apply the icon treatment consistently anywhere transaction categories are shown.
- Keep custom or unknown categories working through a neutral fallback.
- Avoid remote icon fonts, network images, or trademark-dependent assets.

## Non-Goals

- Do not change transaction, account, category, or cloud storage schemas.
- Do not redesign the full page layout.
- Do not change income, expense, transfer, balance, statistics, or account visibility calculations.
- Do not add account brand icons in this task; account logo work is separate.
- Do not build an icon editor or theme switcher.
- Do not replace visible category names in transaction rows; the new icons complement the text.

## Visual Direction

Use a solid glass pictogram style:

- Shape: rounded square icon tile, about the same footprint as the current transaction badge.
- Fill: dark glass surface with a category-colored gradient overlay.
- Icon: filled pictogram silhouette, not a text label or decorative glyph.
- Light: small highlight and restrained glow, enough to feel modern but not enough to compete with transaction titles or amounts.
- Color: category color remains an auxiliary signal; the pictogram shape must carry the main meaning.
- Density: the recommended "balanced" weight from the mockup is the target, not the high-glow variant.

The mockup used inline SVG for speed, but implementation must not depend on inline SVG rendering in WXML. Use local, checked-in PNG icon assets under the Mini Program image tree and render them with `<image>`.

## Category Icon Set

Initial icon coverage should map existing default categories to simple pictograms:

- salary and career income: income card with incoming arrow;
- food and drink: fork and knife;
- leisure, entertainment, and toys: game controller;
- mobility and transport: car or route arrow;
- home and utilities: house;
- medical and health: medical cross;
- finance, insurance, investment, and interest: bank or chart;
- clothing and accessories: shirt or bag;
- communication: phone or signal;
- learning: book;
- gifts and relationships: gift box;
- business and part-time income: storefront or briefcase;
- bonus and windfall income: trophy or sparkle coin;
- transfer: two opposing arrows;
- other and adjustment categories: neutral document or grid.

The exact pictogram can be adjusted during implementation, but it must remain object-based and recognizable at small list sizes.

## Rendering Model

Extend the existing category badge view model rather than introducing saved fields.

A resolved category icon can include:

```js
{
  className: 'cat-food glass-icon',
  iconName: 'food',
  iconImage: '/images/category-icons/food.png',
  color: '#FF9A3D',
  background: 'linear-gradient(...)',
  source: 'resolved'
}
```

The exact field names can follow the existing `iconResolver.js` style. Required capabilities:

- category-specific CSS class and color;
- local image path for a pictogram where available;
- safe fallback when no pictogram matches;
- no mutation of category or record input objects.

Fallback behavior:

- Unknown categories use a neutral glass icon.
- If an existing saved category icon is shown as fallback, it must not become the primary design for known defaults.
- No fallback data is written back into saved records or categories.

## Surfaces

Apply the new transaction category icons to:

- home page recent transaction rows;
- add-record category group and category option lists;
- account-detail transaction rows;
- transfer route icon where transfer records are displayed.

Do not change account logo rendering on the accounts page unless it is directly required by shared CSS compatibility.

## Implementation Boundaries

Expected future implementation areas:

- `miniprogram/utils/iconResolver.js` for category icon resolution;
- shared badge/icon CSS in `miniprogram/app.wxss`;
- WXML where transaction category badges currently render `badge-glyph` and `badge-mark-text`;
- local category icon assets under `miniprogram/images/category-icons/`;
- focused tests for icon resolution and markup hooks.

Avoid touching:

- cloud functions;
- storage utilities;
- balance and statistics calculators;
- record save/update/delete logic;
- account brand logo image assets unless shared CSS requires a narrow compatibility fix.

## Testing

Add focused tests before implementation changes:

- resolver returns pictogram icon metadata for food, leisure, salary, mobility, home, health, finance, and transfer;
- known category icons do not depend on label text as the primary visual field;
- unknown categories resolve to a neutral fallback;
- existing account badge resolution still works;
- home and account-detail markup still bind category icon metadata.

Run the existing relevant test suite after implementation, then run the full test suite if the shared badge renderer or resolver changes could affect multiple pages.

## Success Criteria

- Recent transaction icons read as real icons, not text badges.
- The selected restrained solid glass style is visible in list context.
- Category names and amounts remain the dominant text hierarchy.
- Existing user data remains compatible with no migration.
- The implementation is local/offline stable and does not require network icon loading.
