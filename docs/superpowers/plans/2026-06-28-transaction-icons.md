# Transaction Icons Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace transaction category text badges with restrained solid glass pictogram icons while preserving all bookkeeping behavior.

**Architecture:** Extend the existing `iconResolver.js` view model with `iconName` and local `iconImage` metadata for category badges, then update only category/transaction WXML surfaces to render `<image>` when that metadata exists. Generate a small local PNG icon set under `miniprogram/images/category-icons/`; account badge rendering stays unchanged.

**Tech Stack:** WeChat Mini Program WXML/WXSS/JS, Node-based test scripts, local PNG assets.

---

### Task 1: Category Icon Metadata And Assets

**Files:**
- Modify: `test/icon-resolver.test.js`
- Modify: `miniprogram/utils/iconResolver.js`
- Create: `miniprogram/images/category-icons/*.png`

- [ ] **Step 1: Write failing resolver tests**

Add tests that assert known category badges return `iconName`, `iconImage`, and no `logo`, while unknown categories fall back safely:

```js
test('默认交易类别应解析为本地图标资产而不是文字徽章', () => {
  const cases = [
    [{ name: '三餐' }, '食品酒水', 'food'],
    [{ name: '休闲玩乐' }, '休闲娱乐', 'leisure'],
    [{ name: '工资收入' }, '职业收入', 'salary'],
    [{ name: '公共交通' }, '行车交通', 'mobility'],
    [{ name: '水电煤气' }, '居家物业', 'home'],
    [{ name: '药品费' }, '医疗保健', 'health'],
    [{ name: '投资收入' }, '职业收入', 'finance']
  ];

  cases.forEach(([category, groupName, iconName]) => {
    const badge = iconResolver.resolveCategoryBadge(category, groupName);
    assert.strictEqual(badge.iconName, iconName);
    assert.strictEqual(badge.iconImage, `/images/category-icons/${iconName}.png`);
    assert.strictEqual(badge.logo, false);
  });
});

test('未知交易类别应使用中性本地图标回退且不修改输入', () => {
  const category = { name: '自定义类别', icon: '类' };
  const before = JSON.stringify(category);
  const badge = iconResolver.resolveCategoryBadge(category);

  assert.strictEqual(badge.iconName, 'other');
  assert.strictEqual(badge.iconImage, '/images/category-icons/other.png');
  assert.strictEqual(badge.label, '自');
  assert.strictEqual(JSON.stringify(category), before);
});
```

- [ ] **Step 2: Run resolver test and verify RED**

Run: `node test/icon-resolver.test.js`

Expected: FAIL because `iconName` and category `iconImage` are not populated yet.

- [ ] **Step 3: Implement minimal resolver metadata**

Add `iconName` to category rules and derive local icon images in `makeBadge`:

```js
iconName: rule.iconName || '',
iconImage: rule.iconImage || (rule.logo === true && rule.iconShape ? `/images/account-logos/${rule.iconShape}.png` : rule.iconName ? `/images/category-icons/${rule.iconName}.png` : ''),
logo: rule.logo === true
```

Set unknown category fallback to `iconName: 'other'` while preserving existing `label` and `symbol` fields for compatibility.

- [ ] **Step 4: Generate local PNG pictogram assets**

Create these local assets with transparent backgrounds and white filled silhouettes:

```text
miniprogram/images/category-icons/apparel.png
miniprogram/images/category-icons/business.png
miniprogram/images/category-icons/education.png
miniprogram/images/category-icons/finance.png
miniprogram/images/category-icons/food.png
miniprogram/images/category-icons/gift.png
miniprogram/images/category-icons/health.png
miniprogram/images/category-icons/home.png
miniprogram/images/category-icons/leisure.png
miniprogram/images/category-icons/mobility.png
miniprogram/images/category-icons/other.png
miniprogram/images/category-icons/salary.png
miniprogram/images/category-icons/signal.png
miniprogram/images/category-icons/transfer-in.png
miniprogram/images/category-icons/transfer-out.png
miniprogram/images/category-icons/transfer.png
```

- [ ] **Step 5: Run resolver test and verify GREEN**

Run: `node test/icon-resolver.test.js`

Expected: PASS.

### Task 2: Category Badge Rendering

**Files:**
- Modify: `test/index-record-actions-layout.test.js`
- Modify: `test/statistics-layout.test.js`
- Modify: `test/category-manage-layout.test.js`
- Modify: `miniprogram/app.wxss`
- Modify: `miniprogram/pages/index/index.wxml`
- Modify: `miniprogram/pages/index/index.js`
- Modify: `miniprogram/pages/add-record/add-record.wxml`
- Modify: `miniprogram/pages/account-detail/account-detail.wxml`
- Modify: `miniprogram/pages/account-detail/account-detail.js`
- Modify: `miniprogram/pages/statistics/statistics.wxml`
- Modify: `miniprogram/pages/category-manage/category-manage.wxml`

- [ ] **Step 1: Write failing WXML/CSS tests**

Add layout assertions that category and record badges render `badge-image` from `iconImage`, and that global CSS defines `.glass-category-icon` plus `.badge-image`.

- [ ] **Step 2: Run layout tests and verify RED**

Run:

```bash
node test/index-record-actions-layout.test.js
node test/statistics-layout.test.js
node test/category-manage-layout.test.js
```

Expected: FAIL because WXML still renders only `badge-glyph` and `badge-mark-text`.

- [ ] **Step 3: Add global glass category styles**

In `miniprogram/app.wxss`, add a `.glass-category-icon` variant that suppresses old pseudo-elements, uses a restrained category-colored glass surface, and centers `.badge-image`.

- [ ] **Step 4: Render category icon images in WXML**

For category/transaction badge nodes only, render:

```xml
<image wx:if="{{badge.iconImage}}" class="badge-image" src="{{badge.iconImage}}" mode="aspectFit"></image>
<block wx:else>
  <text class="badge-glyph">{{badge.symbol}}</text>
  <text class="badge-mark-text">{{badge.label}}</text>
</block>
```

Use the actual scope variable for each page, such as `record.categoryBadge`, `item.badge`, `category.badge`, or `record.recordBadge`. Do not apply this change to account badge nodes.

- [ ] **Step 5: Use resolver transfer badges**

Replace local transfer badge constants with `iconResolver.resolveTransferBadge('transfer')`, `resolveTransferBadge('out')`, and `resolveTransferBadge('in')` so transfer rows also get local pictogram assets.

- [ ] **Step 6: Run layout tests and verify GREEN**

Run the same layout tests from Step 2.

Expected: PASS.

### Task 3: Verification And Workspace Cleanup

**Files:**
- Modify: `.gitignore`

- [ ] **Step 1: Ignore brainstorm scratch files**

Add `.superpowers/` to `.gitignore` so visual brainstorming scratch files stay out of repo status.

- [ ] **Step 2: Run focused tests**

Run:

```bash
node test/icon-resolver.test.js
node test/index-record-actions-layout.test.js
node test/statistics-layout.test.js
node test/category-manage-layout.test.js
```

Expected: PASS.

- [ ] **Step 3: Run full test suite**

Run: `npm test`

Expected: PASS.

- [ ] **Step 4: Inspect final diff**

Run: `git diff -- miniprogram/utils/iconResolver.js miniprogram/app.wxss miniprogram/pages/index/index.wxml miniprogram/pages/index/index.js miniprogram/pages/add-record/add-record.wxml miniprogram/pages/account-detail/account-detail.wxml miniprogram/pages/account-detail/account-detail.js miniprogram/pages/statistics/statistics.wxml miniprogram/pages/category-manage/category-manage.wxml test/icon-resolver.test.js test/index-record-actions-layout.test.js test/statistics-layout.test.js test/category-manage-layout.test.js .gitignore`

Expected: Diff only contains transaction icon changes and scratch ignore cleanup.
