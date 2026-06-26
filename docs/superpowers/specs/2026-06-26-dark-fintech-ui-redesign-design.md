# Dark Fintech UI Redesign Design

## Summary

Redesign the AccountBook Mini Program into a dark fintech dashboard style. The UI should feel closer to a modern financial control panel than the current warm notebook style, while preserving the existing bookkeeping behavior for expenses, income, transfers, account balances, statistics, cloud sync, import, and export.

The redesign is a presentation-layer change. Existing saved account and category records remain valid and do not require data migration.

## Goals

- Replace the current warm hand-book visual system with a dark dashboard style inspired by the selected concept image.
- Keep the app usable as a daily bookkeeping tool: dense, scannable, readable, and fast to operate.
- Apply the new visual system across the main page, accounts, account detail, add/edit expense or income, transfer, statistics, settings, and category pages.
- Render account and category icons as technology-style badges where possible.
- Show recognizable account badges for Alipay, WeChat, QQ Wallet, Huabei, JD Baitiao, and common Chinese banks by account name.
- Show redesigned category badges for expense and income categories by category name.
- Preserve all existing data semantics and calculations.
- Keep unknown or custom accounts and categories working through a safe fallback.
- Add focused tests around icon resolution and keep existing tests passing.

## Non-Goals

- Do not migrate or rewrite cloud `accounts.json`, `records.json`, or `categories.json`.
- Do not download or embed official trademark logo image assets.
- Do not change transaction save logic, transfer balance logic, statistics aggregation, local cache, cloud sync, import, or export behavior.
- Do not add a theme switcher.
- Do not redesign the information architecture beyond the existing pages and flows.
- Do not add new business features such as budgets, recurring bills, or reminders.

## Visual Direction

Use a dark financial dashboard language:

- App background: near-black navy or graphite, such as `#070B14`, `#0B1020`, and `#0F172A`.
- Panels: dark raised surfaces, such as `#101827` and `#111C2E`.
- Borders: thin cool translucent strokes, such as `rgba(148, 163, 184, 0.18)`.
- Primary accents: electric cyan and teal, such as `#22D3EE` and `#14B8A6`.
- Financial states:
  - income or positive: red stays consistent with the current Chinese bookkeeping convention where income is red;
  - expense or decrease: green stays consistent with the current convention where expense is green;
  - transfer: cyan or blue.
- Shadows and glow should be restrained. Use them for dashboard emphasis, not as decorative blobs.
- Cards use compact radius, about `8rpx` to `16rpx`, and should not be nested inside decorative outer cards.
- Replace emoji-heavy visual treatment with text badges, color badges, or simple symbolic glyphs.

## Page Design

### Global Shell

- Update `app.wxss` to define shared dark tokens and reusable classes for panels, badges, buttons, labels, dividers, empty states, and bottom sheets.
- Update `app.json` navigation and tab bar colors to match the dark theme.
- Existing tab bar pages remain: bookkeeping home, accounts, statistics, settings.
- Existing tab bar icon image files may remain in place if they still render acceptably, but the selected and unselected colors should match the new theme where possible.

### Home Page

The home page becomes the primary dashboard.

- The top summary panel should look like a financial control panel:
  - month label;
  - expense, income, and balance KPIs;
  - optional subtle grid or accent line using CSS only.
- Records remain grouped by date.
- Transaction rows become compact dark list rows:
  - left side: resolved category badge and category or transfer route;
  - middle: note and account name where available;
  - right side: signed amount and action affordance.
- The existing action sheet for edit and delete remains functionally unchanged, but uses the dark bottom-sheet style.
- The floating add and transfer actions remain, with primary add action and secondary transfer action.

### Accounts Page

- The total asset card becomes a dashboard summary panel.
- Account groups remain grouped by account category.
- Account rows use resolved account badges:
  - Alipay, WeChat, QQ Wallet, Huabei, JD Baitiao, and banks show brand-color badge variants;
  - unknown accounts fall back to the saved `account.icon` value or a generic badge.
- Existing hidden and excluded-from-total labels remain visible as compact dark tags.
- Sorting, quick add, edit, delete, and account-detail navigation remain unchanged.
- The existing debug info should either retain its current behavior or be visually toned down if it is still intentionally displayed.

### Account Detail

- Keep existing account detail metrics, records, quick actions, and navigation behavior.
- Apply the same resolved account badge and financial panel style.
- Preserve all account detail calculations and transfer record handling.

### Add/Edit Expense or Income

- Keep the existing two-step category selection flow.
- Replace emoji category cells with dark badges resolved from category names.
- The amount entry remains prominent and fast to use.
- Account picker remains a bottom sheet with account category then account selection.
- Save button remains fixed near the bottom and uses the active transaction type styling.
- Existing validation and save behavior remain unchanged.

### Transfer Page

- Preserve transfer source account, target account, amount, date, note, and save behavior.
- Use cyan or blue as the transfer state color.
- Account pickers use the same account badge resolver as other pages.

### Statistics Page

- The statistics page should carry the strongest dashboard feel:
  - dark period selector;
  - KPI panels for expense, income, and balance;
  - asset trend panel with dark chart shell;
  - category spending bars with accent colors;
  - drilldown panels remain readable and compact.
- Preserve period logic, category grouping, asset trend calculation, hidden-account behavior, and drilldown records.

### Settings and Category Management

- Settings becomes a dark operations page with grouped action rows.
- Category management and category edit pages retain existing category CRUD behavior.
- Category icon display uses resolved badge previews, but stored category icon values are not rewritten unless the user edits and saves a category normally.

## Icon Resolver

Add a small presentation helper, for example `miniprogram/utils/iconResolver.js`.

The resolver should be pure and side-effect-free. It accepts a display object or name and returns a view model for rendering a badge:

```js
{
  label: '付',
  className: 'brand-alipay',
  color: '#1677FF',
  background: 'rgba(22, 119, 255, 0.16)',
  source: 'resolved'
}
```

The exact structure can match the implementation style, but it must support:

- a short visual label;
- brand or category color;
- optional CSS class;
- fallback to the saved icon or a generic label.

### Account Matching

Match account display names case-insensitively where applicable and by Chinese keywords first:

- 支付宝, 余额宝 -> Alipay-style blue badge, label `付` or `支`.
- 微信, 微信钱包, 零钱 -> WeChat-style green badge, label `微`.
- QQ钱包 -> QQ-style blue badge, label `Q`.
- 花呗 -> Alipay/Huabei style badge, label `花`.
- 京东白条 -> JD-style red badge, label `京`.
- 招商银行 -> CMB-style red badge, label `招`.
- 工商银行 -> ICBC-style red badge, label `工`.
- 建设银行 -> CCB-style blue badge, label `建`.
- 农业银行 -> ABC-style green badge, label `农`.
- 中国银行 -> BOC-style red badge, label `中`.
- 交通银行 -> Bocom-style blue badge, label `交`.
- 邮储银行 -> PSBC-style green badge, label `邮`.
- 浦发银行 -> SPDB-style blue badge, label `浦`.
- 民生银行 -> CMBC-style teal badge, label `民`.
- 兴业银行 -> CIB-style navy badge, label `兴`.
- 广发银行 -> CGB-style red badge, label `广`.
- 平安银行 -> PAB-style orange badge, label `平`.
- 现金 -> neutral cash badge, label `现`.
- generic credit card -> card badge, label `卡`.
- generic bank or savings card -> bank badge, label `银`.

### Category Matching

Match by category name and group name:

- clothing and accessories -> apparel badge;
- food and drink -> dining badge;
- home and utilities -> home badge;
- transportation -> mobility badge;
- communication -> signal badge;
- entertainment and travel -> leisure badge;
- learning -> education badge;
- gifts and relationships -> gift badge;
- medical -> health badge;
- finance and insurance -> finance badge;
- other expense -> miscellaneous badge;
- salary, bonus, part-time, investment, interest, business, gift income, windfall -> income badges.

The visual treatment should be abstract and consistent rather than emoji-like.

### Fallback Behavior

- If an account or category does not match any rule, render the saved `icon` as a badge label when present.
- If no saved icon is available, derive one Chinese character from the name.
- If no name is available, use a neutral fallback label.
- The resolver must not mutate input data.

## Data and Compatibility

- Existing `account.icon`, category `icon`, and `color` fields remain stored as they are.
- Existing imports and exports preserve old data exactly.
- Existing user custom categories remain selectable and visible.
- Existing transaction records continue to reference `categoryId` and `accountId`; no record schema changes.
- Existing statistics and account calculations continue to use current account/category structures.
- The UI can add derived render fields in page data, such as `displayBadge`, but those fields must not be saved back unless they already belonged to editable form data.

## Implementation Scope

Expected touched areas:

- `miniprogram/app.wxss`
- `miniprogram/app.json`
- page WXML/WXSS files under `miniprogram/pages/`
- page JS files only where derived display badges need to be attached to existing view data
- new utility file such as `miniprogram/utils/iconResolver.js`
- focused tests under `test/`

Avoid touching cloud functions, storage utilities, balance calculation, and statistics calculation except if a test shows an existing display-only coupling must be adjusted.

## Testing

Add focused tests for the resolver:

- Alipay, WeChat, QQ Wallet, Huabei, JD Baitiao.
- At least six major banks.
- common expense category groups.
- common income categories.
- unknown account and category fallback.
- resolver does not mutate input objects.

Keep or update layout tests only where markup class names intentionally change.

Run the full test suite with:

```bash
npm test
```

Manual verification in WeChat Developer Tools should cover:

- add expense;
- add income;
- add transfer;
- edit and delete a record;
- account list, account detail, account edit;
- statistics month/year switch and category drilldown;
- settings import/export visibility;
- custom category display.

## Risks

- A full visual pass can easily become too large. The implementation should proceed page by page while keeping business logic unchanged.
- Existing tests may assert old class names. Those tests should be updated only for intentional markup changes, not disabled.
- Some existing tab bar icons may look mismatched on a dark background. If this happens, replace them with simple local dark-theme icons in a focused pass.
- WeChat Mini Program CSS support is narrower than web CSS. Avoid relying on backdrop blur or complex browser-only effects.
- Official financial logos are trademarked. This design uses local brand-color badges and short labels, not downloaded official marks.
