#!/usr/bin/env node

/**
 * 账号页大类折叠单元测试
 */

const fs = require('fs');
const path = require('path');

console.log('========================================');
console.log('        账号页大类折叠单元测试');
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

function assertMatches(actual, pattern, message) {
  if (!pattern.test(actual)) {
    throw new Error(`${message} - 未匹配: ${pattern}`);
  }
}

const root = path.join(__dirname, '..');
const accountsJs = fs.readFileSync(path.join(root, 'miniprogram/pages/accounts/accounts.js'), 'utf8');
const accountsWxml = fs.readFileSync(path.join(root, 'miniprogram/pages/accounts/accounts.wxml'), 'utf8');
const accountsWxss = fs.readFileSync(path.join(root, 'miniprogram/pages/accounts/accounts.wxss'), 'utf8');

test('账号页应维护账号大类折叠状态并提供切换方法', () => {
  assertMatches(accountsJs, /collapsedCategories:\s*\{\}/, '页面 data 应有折叠状态对象');
  assertMatches(accountsJs, /isCollapsed:\s*collapsedCategories\[cat\.name\]\s*===\s*true/, '分组数据应带上当前大类是否折叠');
  assertMatches(accountsJs, /toggleCategoryCollapse:\s*function\(e\)/, '页面应提供大类折叠切换方法');
  assertMatches(accountsJs, /collapsedCategories\[category\]\s*=\s*!collapsedCategories\[category\]/, '切换方法应按大类名翻转状态');
});

test('账号大类标题应可点击折叠，并在折叠后隐藏账号和快速添加入口', () => {
  assertMatches(accountsWxml, /class="category-header flex flex-between"[\s\S]*bindtap="toggleCategoryCollapse"/, '大类标题应绑定折叠切换');
  assertMatches(accountsWxml, /class="category-collapse-icon"/, '大类标题应展示折叠状态图标');
  assertMatches(accountsWxml, /wx:if="\{\{!item\.isCollapsed\}\}"[\s\S]*wx:for="\{\{item\.accounts\}\}"/, '账号列表应只在大类展开时展示');
  assertMatches(accountsWxml, /wx:if="\{\{!item\.isCollapsed\}\}"[\s\S]*class="add-quick-account"/, '快速添加入口应只在大类展开时展示');
});

test('折叠状态图标应有稳定尺寸，避免大类标题跳动', () => {
  assertMatches(accountsWxss, /\.category-collapse-icon\s*\{[\s\S]*width:\s*\d+rpx;/, '折叠图标应有固定宽度');
  assertMatches(accountsWxss, /\.category-collapse-icon\s*\{[\s\S]*height:\s*\d+rpx;/, '折叠图标应有固定高度');
});

console.log('\n========================================');
console.log(`测试完成: ${passed} 通过, ${failed} 失败`);
console.log('========================================');

if (failed > 0) {
  process.exit(1);
}
