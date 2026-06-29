#!/usr/bin/env node

/**
 * 记一笔分类选择暗色主题单元测试
 */

const fs = require('fs');
const path = require('path');

console.log('========================================');
console.log('    记一笔分类选择暗色主题单元测试');
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

function getLastRule(css, selector) {
  const pattern = /([^{}]+)\{([^{}]*)\}/g;
  const matches = [...css.matchAll(pattern)]
    .filter(match => match[1].split(',').map(item => item.trim()).includes(selector));
  if (matches.length === 0) {
    throw new Error(`未找到样式: ${selector}`);
  }
  return matches[matches.length - 1][2];
}

const root = path.join(__dirname, '..');
const wxml = fs.readFileSync(path.join(root, 'miniprogram/pages/add-record/add-record.wxml'), 'utf8');
const wxss = fs.readFileSync(path.join(root, 'miniprogram/pages/add-record/add-record.wxss'), 'utf8');

test('记一笔小类选择面板应覆盖为暗色容器，不能保留白底', () => {
  const categoryStep = getLastRule(wxss, '.category-step');

  assertMatches(categoryStep, /background:\s*rgba\(15,\s*23,\s*42,\s*0\.\d+\);/, '小类选择面板应使用深色背景');
  assertMatches(categoryStep, /border:\s*1rpx solid rgba\(148,\s*163,\s*184,\s*0\.\d+\);/, '小类选择面板应使用暗色边框');
  assertNotMatches(categoryStep, /background:\s*white;/, '小类选择面板不应是白底');
});

test('收入分类选中态应按 WXML 类名顺序提供暗色覆盖', () => {
  assertMatches(
    wxml,
    /class="category-item \{\{recordType\}\} \{\{selectedCategoryId === item\.id \? 'selected' : ''\}\}"/,
    '分类项类名顺序应为 category-item income selected'
  );

  const selectedIncome = getLastRule(wxss, '.category-item.income.selected');

  assertMatches(selectedIncome, /background:\s*rgba\(239,\s*68,\s*68,\s*0\.10\);/, '收入选中态应使用暗红透明背景');
  assertMatches(selectedIncome, /border-color:\s*rgba\(239,\s*68,\s*68,\s*0\.55\);/, '收入选中态应使用暗红边框');
  assertNotMatches(selectedIncome, /background:\s*#FDECEC;/, '收入选中态不应保留浅粉背景');
});

console.log('\n========================================');
console.log(`测试完成: ${passed} 通过, ${failed} 失败`);
console.log('========================================');

if (failed > 0) {
  process.exit(1);
}
