#!/usr/bin/env node

/**
 * 我的页设置布局和图标单元测试
 */

const fs = require('fs');
const path = require('path');

console.log('========================================');
console.log('      我的页设置布局和图标单元测试');
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
const wxml = fs.readFileSync(path.join(root, 'miniprogram/pages/settings/settings.wxml'), 'utf8');
const wxss = fs.readFileSync(path.join(root, 'miniprogram/pages/settings/settings.wxss'), 'utf8');

test('我的页图标不应显示英文缩写', () => {
  assertNotMatches(wxml, />\s*(AB|CAT|SEC|BK|CLD|IMP|SYNC|TST|DBG|LOG|CLR|DEL)\s*</, '设置页图标应使用中文或图案');
  assertNotMatches(wxml, /<text class="(?:avatar-icon|menu-icon)">/, '设置页图标不应再使用文字徽章');
});

test('我的页图标应使用本地图片资源', () => {
  const expectedIcons = [
    ['avatar-image', '/images/settings-icons/app.png'],
    ['menu-icon-image', '/images/settings-icons/category.png'],
    ['menu-icon-image', '/images/settings-icons/privacy.png'],
    ['menu-icon-image', '/images/settings-icons/backup-cloud.png'],
    ['menu-icon-image', '/images/settings-icons/cloud-import.png'],
    ['menu-icon-image', '/images/settings-icons/clipboard-import.png'],
    ['menu-icon-image', '/images/settings-icons/refresh.png'],
    ['menu-icon-image', '/images/settings-icons/cloud-test.png'],
    ['menu-icon-image', '/images/settings-icons/debug-bug.png'],
    ['menu-icon-image', '/images/settings-icons/logs.png'],
    ['menu-icon-image', '/images/settings-icons/clear-logs.png'],
    ['menu-icon-image', '/images/settings-icons/delete-data.png']
  ];

  expectedIcons.forEach(([className, src]) => {
    assertMatches(wxml, new RegExp(`<image class="${className}" src="${src}" mode="aspectFit"></image>`), `应使用本地图标 ${src}`);
    assertIncludes(fs.readFileSync(path.join(root, 'miniprogram', src), 'binary').slice(1, 4), 'PNG', `${src} 应是 PNG 图片`);
  });

  assertMatches(wxml, /backup-cloud\.png[\s\S]*备份到云端/, '备份到云端应使用云端备份图标');
  assertMatches(wxml, /debug-bug\.png[\s\S]*调试数据/, '调试数据应使用 debug 图标');
});

test('我的页设置行应保持左对齐', () => {
  const menuLeft = getRule(wxss, '.menu-left');
  assertMatches(menuLeft, /justify-content:\s*flex-start;/, '菜单行左侧内容应靠左');
  assertMatches(menuLeft, /text-align:\s*left;/, '菜单行文本应靠左');

  const pageContainer = getRule(wxss, '.page-container');
  assertMatches(pageContainer, /text-align:\s*left;/, '页面默认文本应靠左');
});

console.log('\n========================================');
console.log(`测试完成: ${passed} 通过, ${failed} 失败`);
console.log('========================================');

if (failed > 0) {
  process.exit(1);
}
