# Dark Fintech UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the Mini Program presentation as a dark fintech dashboard while preserving expense, income, transfer, account, statistics, cloud sync, import, and export behavior.

**Architecture:** Add a pure presentation helper for account and category badges, then attach derived display fields in page JS without mutating saved account or category data. Apply the dark visual system through shared `app.wxss` tokens plus page-level WXSS updates, keeping existing page flows and business logic intact.

**Tech Stack:** WeChat Mini Program native WXML/WXSS/JS, CommonJS utility modules, existing Node.js test runner.

---

## File Structure

- Create `miniprogram/utils/iconResolver.js`: pure badge resolver for account and category display.
- Create `test/icon-resolver.test.js`: focused resolver tests following red-green TDD.
- Modify `miniprogram/app.wxss`: shared dark theme tokens and reusable panel, badge, button, sheet, empty-state classes.
- Modify `miniprogram/app.json`: dark navigation and tab bar colors.
- Modify page JS files only to attach derived badge fields:
  - `miniprogram/pages/index/index.js`
  - `miniprogram/pages/accounts/accounts.js`
  - `miniprogram/pages/account-detail/account-detail.js`
  - `miniprogram/pages/add-record/add-record.js`
  - `miniprogram/pages/transfer/transfer.js`
  - `miniprogram/pages/statistics/statistics.js`
  - `miniprogram/pages/settings/settings.js` only if settings needs derived action badge data.
- Modify page WXML/WXSS files under `miniprogram/pages/` to render dark dashboard panels and badges.
- Modify existing layout tests only when class names intentionally change.

## Task 1: Icon Resolver

**Files:**
- Create: `test/icon-resolver.test.js`
- Create: `miniprogram/utils/iconResolver.js`

- [ ] **Step 1: Write the failing resolver test**

Create `test/icon-resolver.test.js`:

```js
#!/usr/bin/env node

const assert = require('assert');
const iconResolver = require('../miniprogram/utils/iconResolver.js');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✅ ${name}`);
    passed++;
  } catch (error) {
    console.error(`❌ ${name}`);
    console.error(error.message);
    failed++;
  }
}

console.log('========================================');
console.log('      深色徽章图标解析单元测试');
console.log('========================================\n');

test('应按账号名称解析支付宝、微信、花呗和京东白条徽章', () => {
  assert.strictEqual(iconResolver.resolveAccountBadge({ name: '支付宝' }).label, '付');
  assert.strictEqual(iconResolver.resolveAccountBadge({ name: '微信钱包' }).label, '微');
  assert.strictEqual(iconResolver.resolveAccountBadge({ name: '花呗' }).label, '花');
  assert.strictEqual(iconResolver.resolveAccountBadge({ name: '京东白条' }).label, '京');
});

test('应按账号名称解析常见银行徽章', () => {
  assert.strictEqual(iconResolver.resolveAccountBadge({ name: '招商银行储蓄卡' }).label, '招');
  assert.strictEqual(iconResolver.resolveAccountBadge({ name: '工商银行信用卡' }).label, '工');
  assert.strictEqual(iconResolver.resolveAccountBadge({ name: '建设银行储蓄卡' }).label, '建');
  assert.strictEqual(iconResolver.resolveAccountBadge({ name: '农业银行储蓄卡' }).label, '农');
  assert.strictEqual(iconResolver.resolveAccountBadge({ name: '中国银行储蓄卡' }).label, '中');
  assert.strictEqual(iconResolver.resolveAccountBadge({ name: '交通银行信用卡' }).label, '交');
});

test('应按支出和收入类别名称解析类别徽章', () => {
  assert.strictEqual(iconResolver.resolveCategoryBadge({ name: '三餐' }, '食品酒水').label, '餐');
  assert.strictEqual(iconResolver.resolveCategoryBadge({ name: '公共交通' }, '行车交通').label, '行');
  assert.strictEqual(iconResolver.resolveCategoryBadge({ name: '水电煤气' }, '居家物业').label, '家');
  assert.strictEqual(iconResolver.resolveCategoryBadge({ name: '工资收入' }, '职业收入').label, '薪');
  assert.strictEqual(iconResolver.resolveCategoryBadge({ name: '投资收入' }, '职业收入').label, '投');
});

test('未知账号和类别应安全回退且不修改输入对象', () => {
  const account = { name: '自定义账户', icon: '自' };
  const category = { name: '自定义类别', icon: '类' };
  const accountBefore = JSON.stringify(account);
  const categoryBefore = JSON.stringify(category);

  assert.strictEqual(iconResolver.resolveAccountBadge(account).label, '自');
  assert.strictEqual(iconResolver.resolveCategoryBadge(category).label, '类');
  assert.strictEqual(JSON.stringify(account), accountBefore);
  assert.strictEqual(JSON.stringify(category), categoryBefore);
});

console.log(`\n测试完成: ${passed} 通过, ${failed} 失败`);
if (failed > 0) {
  process.exit(1);
}
```

- [ ] **Step 2: Run resolver test to verify RED**

Run: `node test/icon-resolver.test.js`

Expected: FAIL with `Cannot find module '../miniprogram/utils/iconResolver.js'`.

- [ ] **Step 3: Implement minimal resolver**

Create `miniprogram/utils/iconResolver.js` with:

```js
const ACCOUNT_RULES = [
  { keys: ['支付宝', '余额宝'], label: '付', className: 'brand-alipay', color: '#1677FF' },
  { keys: ['微信', '零钱'], label: '微', className: 'brand-wechat', color: '#22C55E' },
  { keys: ['QQ钱包'], label: 'Q', className: 'brand-qq', color: '#38BDF8' },
  { keys: ['花呗'], label: '花', className: 'brand-huabei', color: '#1677FF' },
  { keys: ['京东白条'], label: '京', className: 'brand-jd', color: '#EF4444' },
  { keys: ['招商银行'], label: '招', className: 'bank-cmb', color: '#EF4444' },
  { keys: ['工商银行'], label: '工', className: 'bank-icbc', color: '#DC2626' },
  { keys: ['建设银行'], label: '建', className: 'bank-ccb', color: '#2563EB' },
  { keys: ['农业银行'], label: '农', className: 'bank-abc', color: '#16A34A' },
  { keys: ['中国银行'], label: '中', className: 'bank-boc', color: '#DC2626' },
  { keys: ['交通银行'], label: '交', className: 'bank-bocom', color: '#2563EB' },
  { keys: ['邮储银行'], label: '邮', className: 'bank-psbc', color: '#16A34A' },
  { keys: ['浦发银行'], label: '浦', className: 'bank-spdb', color: '#2563EB' },
  { keys: ['民生银行'], label: '民', className: 'bank-cmbc', color: '#14B8A6' },
  { keys: ['兴业银行'], label: '兴', className: 'bank-cib', color: '#1D4ED8' },
  { keys: ['广发银行'], label: '广', className: 'bank-cgb', color: '#DC2626' },
  { keys: ['平安银行'], label: '平', className: 'bank-pab', color: '#F97316' },
  { keys: ['现金'], label: '现', className: 'account-cash', color: '#F59E0B' },
  { keys: ['信用卡'], label: '卡', className: 'account-card', color: '#22D3EE' },
  { keys: ['储蓄卡', '银行'], label: '银', className: 'account-bank', color: '#60A5FA' }
];

const CATEGORY_RULES = [
  { keys: ['衣服', '饰品', '鞋', '帽', '包', '化妆'], label: '装', className: 'cat-apparel', color: '#F472B6' },
  { keys: ['食品', '酒水', '三餐', '水果', '零食', '下午茶', '宵夜'], label: '餐', className: 'cat-food', color: '#FB923C' },
  { keys: ['居家', '物业', '日常用品', '水电', '房租', '装修', '养娃'], label: '家', className: 'cat-home', color: '#FACC15' },
  { keys: ['交通', '行车', '打车', '停车'], label: '行', className: 'cat-mobility', color: '#22D3EE' },
  { keys: ['通信', '手机费', '上网费', '邮寄'], label: '讯', className: 'cat-signal', color: '#38BDF8' },
  { keys: ['娱乐', '休闲', '旅游', '运动', '健身', '聚会'], label: '乐', className: 'cat-leisure', color: '#A78BFA' },
  { keys: ['学习', '培训', '书画', '杂志'], label: '学', className: 'cat-education', color: '#818CF8' },
  { keys: ['人情', '送礼', '请客', '孝敬', '慈善'], label: '礼', className: 'cat-gift', color: '#F87171' },
  { keys: ['医疗', '保健', '药品', '治疗', '美容'], label: '医', className: 'cat-health', color: '#34D399' },
  { keys: ['金融', '保险', '按揭', '税收', '利息', '赔偿', '罚款'], label: '融', className: 'cat-finance', color: '#2DD4BF' },
  { keys: ['工资'], label: '薪', className: 'cat-salary', color: '#EF4444' },
  { keys: ['投资'], label: '投', className: 'cat-invest', color: '#F97316' },
  { keys: ['奖金', '中奖'], label: '奖', className: 'cat-bonus', color: '#F59E0B' },
  { keys: ['兼职', '经营'], label: '业', className: 'cat-business', color: '#14B8A6' },
  { keys: ['利息收入'], label: '息', className: 'cat-interest', color: '#06B6D4' },
  { keys: ['其他', '意外', '杂项'], label: '其', className: 'cat-other', color: '#94A3B8' }
];

function makeBadge(rule, source) {
  return {
    label: rule.label,
    className: rule.className,
    color: rule.color,
    background: withAlpha(rule.color, 0.16),
    source
  };
}

function withAlpha(hex, alpha) {
  const normalized = String(hex || '').replace('#', '');
  if (normalized.length !== 6) {
    return 'rgba(148, 163, 184, 0.16)';
  }

  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function findRule(text, rules) {
  return rules.find(rule => rule.keys.some(key => text.indexOf(key) !== -1));
}

function fallbackBadge(item, fallbackClass) {
  const icon = item && item.icon ? String(item.icon) : '';
  const name = item && item.name ? String(item.name) : '';
  const label = icon || name.slice(0, 1) || '·';
  const color = item && item.color ? item.color : '#94A3B8';
  return makeBadge({ label, className: fallbackClass, color }, 'fallback');
}

function resolveAccountBadge(account) {
  const name = account && account.name ? String(account.name) : '';
  const category = account && account.category ? String(account.category) : '';
  const text = `${name} ${category}`;
  const rule = findRule(text, ACCOUNT_RULES);
  return rule ? makeBadge(rule, 'resolved') : fallbackBadge(account, 'account-generic');
}

function resolveCategoryBadge(category, groupName) {
  const name = category && category.name ? String(category.name) : '';
  const text = `${groupName || ''} ${name}`;
  const rule = findRule(text, CATEGORY_RULES);
  return rule ? makeBadge(rule, 'resolved') : fallbackBadge(category, 'cat-generic');
}

module.exports = {
  resolveAccountBadge,
  resolveCategoryBadge
};
```

- [ ] **Step 4: Run resolver test to verify GREEN**

Run: `node test/icon-resolver.test.js`

Expected: PASS.

- [ ] **Step 5: Run full tests**

Run: `npm test`

Expected: all test files pass.

## Task 2: Attach Badge View Models

**Files:**
- Modify: `miniprogram/pages/index/index.js`
- Modify: `miniprogram/pages/accounts/accounts.js`
- Modify: `miniprogram/pages/account-detail/account-detail.js`
- Modify: `miniprogram/pages/add-record/add-record.js`
- Modify: `miniprogram/pages/transfer/transfer.js`
- Modify: `miniprogram/pages/statistics/statistics.js`
- Test: `test/icon-resolver.test.js`

- [ ] **Step 1: Extend tests for non-mutating page-style derived usage**

Append to `test/icon-resolver.test.js`:

```js
test('解析出的徽章应包含 WXML 可直接使用的颜色字段', () => {
  const badge = iconResolver.resolveAccountBadge({ name: '微信钱包' });
  assert.ok(badge.color);
  assert.ok(badge.background);
  assert.ok(badge.className);
});
```

- [ ] **Step 2: Run focused test to verify RED or coverage gap**

Run: `node test/icon-resolver.test.js`

Expected: PASS if Task 1 already returned all fields; otherwise FAIL until resolver returns the fields.

- [ ] **Step 3: Import and use resolver in page data preparation**

For each page JS that already builds render records, import:

```js
const iconResolver = require('../../utils/iconResolver.js');
```

Attach derived fields without saving them:

```js
categoryBadge: iconResolver.resolveCategoryBadge(category, category.groupName),
accountBadge: iconResolver.resolveAccountBadge(account)
```

For grouped categories, pass the group name when available. For transfers, use a fixed transfer badge object:

```js
const TRANSFER_BADGE = {
  label: '转',
  className: 'type-transfer',
  color: '#22D3EE',
  background: 'rgba(34, 211, 238, 0.16)',
  source: 'resolved'
};
```

- [ ] **Step 4: Run page and resolver tests**

Run: `node test/icon-resolver.test.js`

Expected: PASS.

Run: `npm test`

Expected: all existing tests pass or fail only because intentional class names changed in later WXML tasks.

## Task 3: Global Dark Shell

**Files:**
- Modify: `miniprogram/app.wxss`
- Modify: `miniprogram/app.json`

- [ ] **Step 1: Update global theme CSS**

Replace warm global page, card, button, and utility colors with dark dashboard tokens:

```css
page {
  background: #070B14;
  color: #E5EEF8;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
  box-sizing: border-box;
}

.card,
.panel {
  background: linear-gradient(180deg, rgba(17, 28, 46, 0.96), rgba(12, 18, 32, 0.96));
  border: 1rpx solid rgba(148, 163, 184, 0.18);
  border-radius: 16rpx;
  box-shadow: 0 18rpx 42rpx rgba(0, 0, 0, 0.28);
  position: relative;
  overflow: hidden;
}

.btn-primary {
  background: linear-gradient(135deg, #22D3EE 0%, #14B8A6 100%);
  color: #06111F;
  border-radius: 16rpx;
  font-weight: 700;
  box-shadow: 0 10rpx 28rpx rgba(34, 211, 238, 0.24);
}

.btn-secondary {
  background: rgba(15, 23, 42, 0.92);
  color: #67E8F9;
  border: 1rpx solid rgba(34, 211, 238, 0.28);
  border-radius: 16rpx;
  font-weight: 600;
}

.text-primary {
  color: #67E8F9;
}

.text-secondary {
  color: #8EA0B8;
}

.text-dark {
  color: #E5EEF8;
}
```

- [ ] **Step 2: Update Mini Program shell colors**

Set `miniprogram/app.json` window and tab bar colors:

```json
"window": {
  "backgroundColor": "#070B14",
  "backgroundTextStyle": "light",
  "navigationBarBackgroundColor": "#070B14",
  "navigationBarTitleText": "手账记账",
  "navigationBarTextStyle": "white"
},
"tabBar": {
  "color": "#64748B",
  "selectedColor": "#22D3EE",
  "backgroundColor": "#0B1020",
  "borderStyle": "black"
}
```

- [ ] **Step 3: Run layout-sensitive tests**

Run: `npm test`

Expected: all tests pass.

## Task 4: Page Markup and Dark Dashboard Styling

**Files:**
- Modify WXML/WXSS under:
  - `miniprogram/pages/index/`
  - `miniprogram/pages/accounts/`
  - `miniprogram/pages/account-detail/`
  - `miniprogram/pages/add-record/`
  - `miniprogram/pages/transfer/`
  - `miniprogram/pages/statistics/`
  - `miniprogram/pages/settings/`
  - `miniprogram/pages/account-edit/`
  - `miniprogram/pages/category-manage/`
  - `miniprogram/pages/category-edit/`

- [ ] **Step 1: Replace emoji badge markup with resolver badge markup**

Use this WXML pattern wherever a resolved badge exists:

```xml
<view class="badge-mark {{item.badge.className}}" style="background: {{item.badge.background}}; border-color: {{item.badge.color}};">
  <text class="badge-mark-text" style="color: {{item.badge.color}};">{{item.badge.label}}</text>
</view>
```

For records:

```xml
<view class="category-icon" style="background: {{record.categoryBadge.background}}; border-color: {{record.categoryBadge.color}};">
  <text class="category-emoji" style="color: {{record.categoryBadge.color}};">{{record.categoryBadge.label}}</text>
</view>
```

- [ ] **Step 2: Apply dark page styling**

For each page WXSS, update page backgrounds, cards, lists, inputs, pickers, modals, bottom sheets, labels, and empty states to use the global dark tokens. Preserve fixed widths tested by existing layout tests:

```css
.page-container {
  min-height: 100vh;
  padding: 24rpx;
  padding-bottom: 140rpx;
  background:
    radial-gradient(circle at 20% 0%, rgba(34, 211, 238, 0.12), transparent 38%),
    linear-gradient(180deg, #07101D 0%, #070B14 100%);
}

.section-title {
  color: #E5EEF8;
  font-size: 30rpx;
  font-weight: 700;
}

.summary-label,
.account-note,
.record-note,
.empty-hint {
  color: #8EA0B8;
}

.expense {
  color: #22C55E;
}

.income {
  color: #EF4444;
}

.transfer {
  color: #22D3EE;
}
```

- [ ] **Step 3: Preserve tested layout constraints**

Keep these constraints unless a test is intentionally updated:

```css
.record-right {
  width: 220rpx;
  flex-shrink: 0;
  align-items: flex-end;
}

.record-amount {
  white-space: nowrap;
  overflow: hidden;
}

.account-right {
  width: 200rpx;
  flex-shrink: 0;
  align-items: flex-end;
}
```

- [ ] **Step 4: Run full tests**

Run: `npm test`

Expected: all tests pass. If a layout test fails due to intentional class rename, update the test to assert the new class and rerun.

## Task 5: Final Verification and Commit

**Files:**
- All changed implementation and test files.

- [ ] **Step 1: Inspect git diff**

Run: `git diff --stat`

Expected: changes are limited to planned UI, resolver, tests, and plan/spec docs.

- [ ] **Step 2: Run full tests**

Run: `npm test`

Expected: all 23 test files pass after adding `icon-resolver.test.js`.

- [ ] **Step 3: Commit implementation**

Run:

```bash
git add miniprogram test docs/superpowers/plans/2026-06-26-dark-fintech-ui-redesign.md
git commit -m "feat: apply dark fintech UI redesign"
```

Expected: commit succeeds on `codex/dark-fintech-ui`.
