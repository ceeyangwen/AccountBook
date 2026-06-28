#!/usr/bin/env node

/**
 * 分类管理页布局和文案单元测试
 */

const fs = require('fs');
const path = require('path');

console.log('========================================');
console.log('      分类管理页布局和文案单元测试');
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

function getRule(css, selector) {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`${escapedSelector}\\s*\\{([\\s\\S]*?)\\}`, 'm');
  const match = css.match(pattern);
  if (!match) {
    throw new Error(`未找到样式: ${selector}`);
  }
  return match[1];
}

const root = path.join(__dirname, '..');
const wxml = fs.readFileSync(path.join(root, 'miniprogram/pages/category-manage/category-manage.wxml'), 'utf8');
const wxss = fs.readFileSync(path.join(root, 'miniprogram/pages/category-manage/category-manage.wxss'), 'utf8');

test('分类管理列表应使用内部留白容器，避免左上角卡片圆角贴边缺失', () => {
  assertMatches(wxml, /<scroll-view[^>]*class="content"[\s\S]*<view class="content-inner">[\s\S]*class="group-card"/, '列表内容应放在 content-inner 内');

  const contentInner = getRule(wxss, '.content-inner');
  assertMatches(contentInner, /padding:\s*20rpx;/, '内部容器应提供列表留白');
  assertMatches(contentInner, /box-sizing:\s*border-box;/, '内部容器应避免留白导致横向裁切');
});

test('分类管理顶部标签栏应铺满页面宽度，和 header 横线对齐', () => {
  const container = getRule(wxss, '.container');
  assertMatches(container, /width:\s*100%;/, '页面容器应覆盖全局 container 的内容宽度');
  assertMatches(container, /align-items:\s*stretch;/, '页面容器应覆盖全局 container 居中对齐');

  const tabs = getRule(wxss, '.tabs');
  assertMatches(tabs, /width:\s*100%;/, '顶部标签栏应铺满页面宽度');

  const content = getRule(wxss, '.content');
  assertMatches(content, /width:\s*100%;/, '列表滚动区应铺满页面宽度');
});

test('分类管理操作按钮应全部使用中文文案', () => {
  assertIncludes(wxml, '>编辑<', '分类组编辑按钮应显示中文');
  assertIncludes(wxml, '>删除<', '删除按钮应显示中文');
  assertIncludes(wxml, '>添加<', '分类组添加分类按钮应显示中文');
  assertNotMatches(wxml, />\s*(ED|DEL|ADD)\s*</, '页面不应再显示英文操作缩写');
});

test('分类管理页分类图标应优先渲染本地图片资产', () => {
  assertMatches(
    wxml,
    /<image[^>]*wx:if="\{\{item\.badge\.iconImage\}\}"[^>]*class="badge-image"[^>]*src="\{\{item\.badge\.iconImage\}\}"/,
    '分类组图标应使用 item.badge.iconImage 渲染图片'
  );
  assertMatches(
    wxml,
    /<image[^>]*wx:if="\{\{category\.badge\.iconImage\}\}"[^>]*class="badge-image"[^>]*src="\{\{category\.badge\.iconImage\}\}"/,
    '分类项图标应使用 category.badge.iconImage 渲染图片'
  );
});

test('中文操作按钮应保留稳定点击区域，避免文案挤压换行', () => {
  const groupAction = getRule(wxss, '.group-action');
  assertMatches(groupAction, /min-width:\s*\d+rpx;/, '分类组操作按钮应有最小宽度');
  assertMatches(groupAction, /box-sizing:\s*border-box;/, '分类组操作按钮应包含内边距计算宽度');

  const actionIcon = getRule(wxss, '.group-action .icon,\n.category-action .icon,\n.btn-icon');
  assertMatches(actionIcon, /white-space:\s*nowrap;/, '操作文案应保持单行');
});

console.log('\n========================================');
console.log(`测试完成: ${passed} 通过, ${failed} 失败`);
console.log('========================================');

if (failed > 0) {
  process.exit(1);
}
