/**
 * 统计页布局样式单元测试
 */

const fs = require('fs');
const path = require('path');

console.log('========================================');
console.log('      统计页布局样式单元测试');
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

const root = path.join(__dirname, '..');
const wxml = fs.readFileSync(path.join(root, 'miniprogram/pages/statistics/statistics.wxml'), 'utf8');
const wxss = fs.readFileSync(path.join(root, 'miniprogram/pages/statistics/statistics.wxss'), 'utf8');

test('总资产趋势底部应使用稳定三列网格对齐', () => {
  assertMatches(wxss, /\.trend-footer\s*\{[\s\S]*display:\s*grid;/, 'trend-footer 应使用 grid');
  assertIncludes(wxss, 'grid-template-columns: 1fr 2rpx 1fr;', '底部应为左右等宽加中线');
});

test('期末金额文本不应包含换行缩进，避免被渲染出额外行高', () => {
  assertMatches(
    wxml,
    /<text class="summary-amount \{\{assetTrend\[assetTrend\.length-1\]\.balance >= assetTrend\[0\]\.balance \? 'income' : 'expense'\}\}">¥\{\{assetTrend\[assetTrend\.length-1\]\.balance\}\}<\/text>/,
    '期末金额应在 text 标签内单行渲染'
  );
});

console.log('\n========================================');
console.log(`测试完成: ${passed} 通过, ${failed} 失败`);
console.log('========================================');

if (failed > 0) {
  process.exit(1);
}
