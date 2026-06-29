/**
 * 转账账户选择器布局单元测试
 */

const fs = require('fs');
const path = require('path');

console.log('========================================');
console.log('    转账账户选择器布局单元测试');
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

function assertNotMatches(actual, pattern, message) {
  if (pattern.test(actual)) {
    throw new Error(`${message} - 不应匹配: ${pattern}`);
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message} - 期望 ${expected}, 实际 ${actual}`);
  }
}

const root = path.join(__dirname, '..');
const wxml = fs.readFileSync(path.join(root, 'miniprogram/pages/transfer/transfer.wxml'), 'utf8');
const js = fs.readFileSync(path.join(root, 'miniprogram/pages/transfer/transfer.js'), 'utf8');
const wxss = fs.readFileSync(path.join(root, 'miniprogram/pages/transfer/transfer.wxss'), 'utf8');
const appWxss = fs.readFileSync(path.join(root, 'miniprogram/app.wxss'), 'utf8');

test('转出账户弹窗应先展示账户大类，再展示小账户', () => {
  assertMatches(wxml, /wx:if="\{\{!selectedFromAccountCategoryId\}\}"[\s\S]*wx:for="\{\{groupedAccounts\}\}"/, '转出账户应先展示 groupedAccounts');
  assertMatches(wxml, /wx:else[\s\S]*\{\{selectedFromAccountCategory\.name\}\}[\s\S]*wx:for="\{\{selectedFromAccountCategory\.children\}\}"/, '转出账户应展示所选大类下的小账户');
});

test('转入账户弹窗应先展示账户大类，再展示小账户', () => {
  assertMatches(wxml, /wx:if="\{\{!selectedToAccountCategoryId\}\}"[\s\S]*wx:for="\{\{groupedAccounts\}\}"/, '转入账户应先展示 groupedAccounts');
  assertMatches(wxml, /wx:else[\s\S]*\{\{selectedToAccountCategory\.name\}\}[\s\S]*wx:for="\{\{selectedToAccountCategory\.children\}\}"/, '转入账户应展示所选大类下的小账户');
});

test('转账页应提供账户分类选择和返回方法', () => {
  assertMatches(js, /groupAccountsByCategory:\s*function/, '应有账户分组方法');
  assertMatches(js, /selectFromAccountCategory:\s*function/, '应有转出账户分类选择方法');
  assertMatches(js, /backToFromAccountCategories:\s*function/, '应有转出返回大类方法');
  assertMatches(js, /selectToAccountCategory:\s*function/, '应有转入账户分类选择方法');
  assertMatches(js, /backToToAccountCategories:\s*function/, '应有转入返回大类方法');
});

test('账户弹窗内部点击应阻止冒泡到遮罩层，避免选择大类时关闭弹窗', () => {
  assertMatches(wxml, /class="account-picker-popup"\s+catchtap="onPopupTap"/, '弹窗内容区应绑定真实 catchtap 处理函数');
  assertMatches(js, /onPopupTap:\s*function\s*\(\)\s*\{[\s\S]*?\}/, '应有空的 onPopupTap 用于阻止冒泡');
});

test('转账账户弹窗不应在弹窗列表里直接遍历全部 accounts', () => {
  assertNotMatches(wxml, /account-picker-popup[\s\S]*<scroll-view scroll-y class="account-list">\s*<view\s+wx:for="\{\{accounts\}\}"/, '账户弹窗不应直接展示全部账户');
});

test('转账账户分类选项应有对应样式', () => {
  assertMatches(wxss, /\.account-category-option\s*\{[\s\S]*display:\s*flex;/, '应有账户分类选项样式');
  assertMatches(wxss, /\.account-step-header\s*\{[\s\S]*display:\s*flex;/, '应有账户小类列表头部样式');
});

test('转账已选账户和账户弹窗应使用账号列表同款图片 logo', () => {
  const logoImages = wxml.match(/class="brand-logo-image"\s+src="\{\{item\.badge\.iconImage\}\}"\s+mode="aspectFit"/g) || [];

  assertMatches(wxml, /wx:if="\{\{fromAccountId\}\}"[\s\S]*<block wx:if="\{\{item\.badge\.iconImage\}\}">[\s\S]*class="brand-logo-image"/, '转出已选账户应渲染账号图片 logo');
  assertMatches(wxml, /wx:if="\{\{toAccountId\}\}"[\s\S]*<block wx:if="\{\{item\.badge\.iconImage\}\}">[\s\S]*class="brand-logo-image"/, '转入已选账户应渲染账号图片 logo');
  assertEqual(logoImages.length, 4, '转出/转入已选账户和弹窗账户项都应渲染账号图片 logo');
});

test('转账账号图片 logo 应有公共固定尺寸，避免挤压选择器布局', () => {
  assertMatches(appWxss, /\.brand-logo-image\s*\{[\s\S]*width:\s*48rpx;[\s\S]*height:\s*48rpx;/, '公共样式应限制 logo 图片尺寸');
});

console.log('\n========================================');
console.log(`测试完成: ${passed} 通过, ${failed} 失败`);
console.log('========================================');

if (failed > 0) {
  process.exit(1);
}
