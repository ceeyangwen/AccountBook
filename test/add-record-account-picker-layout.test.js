#!/usr/bin/env node

/**
 * 记一笔账户选择器布局单元测试
 */

const fs = require('fs');
const path = require('path');

console.log('========================================');
console.log('    记一笔账户选择器布局单元测试');
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

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message} - 期望 ${expected}, 实际 ${actual}`);
  }
}

const root = path.join(__dirname, '..');
const wxml = fs.readFileSync(path.join(root, 'miniprogram/pages/add-record/add-record.wxml'), 'utf8');
const appWxss = fs.readFileSync(path.join(root, 'miniprogram/app.wxss'), 'utf8');

test('记一笔已选账户和账户弹窗应使用账号列表同款图片 logo', () => {
  const logoImages = wxml.match(/class="brand-logo-image"\s+src="\{\{item\.badge\.iconImage\}\}"\s+mode="aspectFit"/g) || [];

  assertEqual(logoImages.length, 2, '已选账户和弹窗账户项都应渲染账号图片 logo');
  assertMatches(wxml, /<block wx:if="\{\{item\.badge\.iconImage\}\}">[\s\S]*class="brand-logo-image"[\s\S]*<block wx:else>/, '账号图片应只在 iconImage 存在时渲染，并保留文字兜底');
});

test('账号图片 logo 应有公共固定尺寸，避免挤压选择器布局', () => {
  assertMatches(appWxss, /\.brand-logo-image\s*\{[\s\S]*width:\s*48rpx;[\s\S]*height:\s*48rpx;/, '公共样式应限制 logo 图片尺寸');
});

console.log('\n========================================');
console.log(`测试完成: ${passed} 通过, ${failed} 失败`);
console.log('========================================');

if (failed > 0) {
  process.exit(1);
}
