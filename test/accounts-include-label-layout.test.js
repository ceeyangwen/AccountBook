/**
 * 账号页不计入总资产标签布局单元测试
 */

const fs = require('fs');
const path = require('path');

console.log('========================================');
console.log('    账号页不计入总资产标签布局单元测试');
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
const wxml = fs.readFileSync(path.join(root, 'miniprogram/pages/accounts/accounts.wxml'), 'utf8');
const wxss = fs.readFileSync(path.join(root, 'miniprogram/pages/accounts/accounts.wxss'), 'utf8');

function getCssRule(selector) {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = wxss.match(new RegExp(`${escapedSelector}\\s*\\{([\\s\\S]*?)\\}`));
  return match ? match[1] : '';
}

test('账号列表应为不计入总资产的账号显示标签', () => {
  assertMatches(wxml, /account-name-row/, '账号名称应有独立行承载标签');
  assertMatches(wxml, /wx:if="\{\{account\.includeInTotal === false\}\}"/, '标签应只在 includeInTotal 为 false 时展示');
  assertMatches(wxml, /不计入总资产/, '标签文案应清楚说明账号不计入总资产');
});

test('不计入总资产标签应有轻量样式，且不挤压账号名称', () => {
  assertMatches(wxss, /\.account-name-row\s*\{[\s\S]*display:\s*flex;/, '账号名称行应使用 flex 布局');
  assertMatches(wxss, /\.account-name-row\s*\{[\s\S]*min-width:\s*0;/, '账号名称行应允许内容收缩');
  assertMatches(wxss, /\.account-name\s*\{[\s\S]*text-overflow:\s*ellipsis;/, '长账号名称应省略显示');
  assertMatches(wxss, /\.exclude-total-label\s*\{[\s\S]*flex-shrink:\s*0;/, '标签不应被压缩');
  assertMatches(wxss, /\.exclude-total-label\s*\{[\s\S]*background:/, '标签应有背景色区分');
});

test('账号编辑和删除按钮应固定在右侧操作列内对齐', () => {
  const rightRule = getCssRule('.account-right');
  const actionsRule = getCssRule('.account-actions');
  const actionBtnRule = getCssRule('.action-btn');

  assertMatches(rightRule, /width:\s*\d+rpx;/, '右侧账户操作列应有固定宽度');
  assertMatches(rightRule, /flex-shrink:\s*0;/, '右侧账户操作列不应被左侧内容挤压');
  assertMatches(rightRule, /align-items:\s*flex-end;/, '右侧账户操作列内容应统一靠右');
  assertMatches(actionsRule, /width:\s*100%;/, '操作按钮行应占满右侧操作列宽度');
  assertMatches(actionsRule, /justify-content:\s*flex-end;/, '编辑和删除按钮应靠右对齐');
  assertMatches(actionBtnRule, /min-width:\s*\d+rpx;/, '编辑和删除按钮应有稳定最小宽度');
  assertMatches(actionBtnRule, /text-align:\s*center;/, '编辑和删除按钮文字应居中');
});

console.log('\n========================================');
console.log(`测试完成: ${passed} 通过, ${failed} 失败`);
console.log('========================================');

if (failed > 0) {
  process.exit(1);
}
