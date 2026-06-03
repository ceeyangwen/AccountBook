/**
 * 小程序默认启动页配置测试
 */

const fs = require('fs');
const path = require('path');

console.log('========================================');
console.log('      小程序默认启动页配置测试');
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

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message} - 期望: ${expected}, 实际: ${actual}`);
  }
}

const root = path.join(__dirname, '..');
const appJson = JSON.parse(fs.readFileSync(path.join(root, 'miniprogram/app.json'), 'utf8'));

test('小程序默认启动页应显式配置为记账首页', () => {
  assertEqual(appJson.entryPagePath, 'pages/index/index', 'entryPagePath 应指向记账首页');
  assertEqual(appJson.pages[0], 'pages/index/index', 'pages 第一项应保持记账首页');
  assertEqual(appJson.tabBar.list[0].pagePath, 'pages/index/index', 'tabBar 第一项应保持记账首页');
});

console.log('\n========================================');
console.log(`测试完成: ${passed} 通过, ${failed} 失败`);
console.log('========================================');

if (failed > 0) {
  process.exit(1);
}
