#!/usr/bin/env node

/**
 * 三屏深色仪表盘布局单元测试
 */

const fs = require('fs');
const path = require('path');

console.log('========================================');
console.log('      三屏深色仪表盘布局单元测试');
console.log('========================================\n');

let passed = 0;
let failed = 0;

function test(description, testFn) {
  try {
    testFn();
    console.log(`✅ ${description}`);
    passed++;
  } catch (error) {
    console.log(`❌ ${description}`);
    console.error(`   错误: ${error.message}`);
    failed++;
  }
}

function assertIncludes(actual, expected, message) {
  if (!actual.includes(expected)) {
    throw new Error(`${message} - 未找到: ${expected}`);
  }
}

function assertMatches(actual, pattern, message) {
  if (!pattern.test(actual)) {
    throw new Error(`${message} - 未匹配: ${pattern}`);
  }
}

function assertNotMatches(actual, pattern, message) {
  if (pattern.test(actual)) {
    throw new Error(`${message} - 不应匹配: ${pattern}`);
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message} - 期望: ${expected}, 实际: ${actual}`);
  }
}

const root = path.join(__dirname, '..');
const appJson = JSON.parse(fs.readFileSync(path.join(root, 'miniprogram/app.json'), 'utf8'));
const indexWxml = fs.readFileSync(path.join(root, 'miniprogram/pages/index/index.wxml'), 'utf8');
const indexWxss = fs.readFileSync(path.join(root, 'miniprogram/pages/index/index.wxss'), 'utf8');
const indexJs = fs.readFileSync(path.join(root, 'miniprogram/pages/index/index.js'), 'utf8');
const accountsWxml = fs.readFileSync(path.join(root, 'miniprogram/pages/accounts/accounts.wxml'), 'utf8');
const accountsWxss = fs.readFileSync(path.join(root, 'miniprogram/pages/accounts/accounts.wxss'), 'utf8');
const statisticsWxml = fs.readFileSync(path.join(root, 'miniprogram/pages/statistics/statistics.wxml'), 'utf8');
const statisticsWxss = fs.readFileSync(path.join(root, 'miniprogram/pages/statistics/statistics.wxss'), 'utf8');

test('底部导航应保留首页、账户、统计、我的四项', () => {
  assertEqual(appJson.tabBar.list.length, 4, 'tabBar 应保留四项');
  assertEqual(appJson.tabBar.list[0].text, '首页', '第一项应为首页');
  assertEqual(appJson.tabBar.list[1].text, '账户', '第二项应为账户');
  assertEqual(appJson.tabBar.list[2].text, '统计', '第三项应为统计');
  assertEqual(appJson.tabBar.list[3].text, '我的', '第四项应恢复我的设置入口');
  assertEqual(appJson.tabBar.list[3].pagePath, 'pages/settings/settings', '我的 tab 应指向原设置页');
  assertEqual(appJson.tabBar.selectedColor, '#12D8C8', '选中态应使用截图中的青绿色');
});

test('首页应包含截图版月度 KPI、预算进度、快捷操作和最近交易结构', () => {
  assertIncludes(indexWxml, 'class="month-dashboard-card', '首页应有月度仪表盘卡片');
  assertMatches(indexWxml, /class="budget-progress expense-progress"[\s\S]*width:\s*\{\{expenseBudgetRate\}\}%/, '支出预算进度应绑定支出占比');
  assertMatches(indexWxml, /class="budget-progress income-progress"[\s\S]*width:\s*\{\{incomeBudgetRate\}\}%/, '收入预算进度应绑定收入占比');
  assertIncludes(indexWxml, 'class="quick-action-grid"', '首页应有四宫格快捷操作');
  assertIncludes(indexWxml, '最近交易', '首页交易区标题应为最近交易');
  assertMatches(indexJs, /expenseBudgetRate:/, '首页 data 应提供支出预算进度');
  assertMatches(indexJs, /incomeBudgetRate:/, '首页 data 应提供收入预算进度');
});

test('首页深色样式应贴近截图中的紧凑卡片和底部留白', () => {
  assertMatches(indexWxss, /\.month-dashboard-card\s*\{[\s\S]*border-radius:\s*16rpx;/, '月度卡片应为紧凑圆角面板');
  assertMatches(indexWxss, /\.quick-action-grid\s*\{[\s\S]*grid-template-columns:\s*repeat\(4,\s*1fr\);/, '快捷操作应为四列');
  assertMatches(indexWxss, /\.recent-card\s*\{[\s\S]*background:\s*rgba\(15,\s*23,\s*42,/m, '最近交易卡片应使用深色面板');
});

test('账号页应使用截图版资产概览和账号卡片图形 logo', () => {
  assertIncludes(accountsWxml, 'class="asset-overview"', '账号页应有资产概览区域');
  assertIncludes(accountsWxml, '资产总览（元）', '账号页资产标题应贴近截图');
  assertIncludes(accountsWxml, '资产分析', '账号页应有资产分析入口文案');
  assertIncludes(accountsWxml, 'class="account-group-card"', '账号页分组应使用卡片容器');
  assertMatches(accountsWxml, /wx:if="\{\{account\.badge\.iconImage\}\}"[\s\S]*class="brand-logo-image"[\s\S]*mode="aspectFit"/, '已知账号图标应以图片 aspectFit 渲染，保持正常比例');
  assertNotMatches(accountsWxml, /\{\{account\.badge\.logoText \|\| account\.badge\.symbol\}\}/, '账号图标不应再渲染 logoText 纯文字');
  assertMatches(accountsWxss, /\.brand-logo-image\s*\{[\s\S]*width:\s*48rpx;[\s\S]*height:\s*48rpx;/, '账号 logo 图片应有适配账号容器的固定尺寸');
  assertNotMatches(accountsWxss, /\.brand-logo\s*\{[\s\S]*transform:\s*scale\(/, '账号 logo 不应通过整体 scale 压缩');
  assertMatches(accountsWxss, /\.account-item\.asset-account\s*\{[\s\S]*linear-gradient\(135deg,/m, '资产账号卡片应有青蓝渐变');
  assertMatches(accountsWxss, /\.account-item\.debt-account\s*\{[\s\S]*rgba\(248,\s*113,\s*113,/m, '负债账号卡片应有红色暗面板');
});

test('统计页应包含截图版分段控制、收支趋势、支出分类和排名卡片', () => {
  assertIncludes(statisticsWxml, "data-period=\"week\"", '统计页应有周分段');
  assertIncludes(statisticsWxml, "data-period=\"custom\"", '统计页应有自定义分段');
  assertIncludes(statisticsWxml, '收支趋势', '统计页应有收支趋势标题');
  assertIncludes(statisticsWxml, '支出分类', '统计页应有支出分类标题');
  assertIncludes(statisticsWxml, '支出排行', '统计页应有支出排行标题');
  assertIncludes(statisticsWxml, 'class="category-ranking-card"', '统计页应有排行卡片');
  assertMatches(statisticsWxss, /\.period-selector\s*\{[\s\S]*grid-template-columns:\s*repeat\(4,\s*1fr\);/, '统计分段控制应为四列');
  assertMatches(statisticsWxss, /\.analytics-card\s*\{[\s\S]*background:\s*rgba\(15,\s*23,\s*42,/m, '统计卡片应使用深色面板');
});

console.log('\n========================================');
console.log(`测试完成: ${passed} 通过, ${failed} 失败`);
console.log('========================================');

if (failed > 0) {
  process.exit(1);
}
