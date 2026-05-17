#!/usr/bin/env node

/**
 * 测试运行器
 * 运行所有单元测试
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

console.log('========================================');
console.log('        开始运行所有单元测试');
console.log('========================================\n');

// 查找所有测试文件
const testDir = __dirname;
const testFiles = fs.readdirSync(testDir)
  .filter(file => file.endsWith('.test.js'))
  .sort();

console.log(`找到 ${testFiles.length} 个测试文件:\n`);

let totalPassed = 0;
let totalFailed = 0;
const failedTests = [];

// 逐个运行测试文件
testFiles.forEach((testFile, index) => {
  console.log(`\n[${index + 1}/${testFiles.length}] 运行: ${testFile}`);
  console.log('------------------------------------------------');
  
  // 直接运行测试文件
  const result = spawnSync('node', [path.join(testDir, testFile)], {
    cwd: path.join(testDir, '..'),
    encoding: 'utf8',
    stdio: 'inherit' // 直接显示输出
  });
  
  if (result.status !== 0) {
    failedTests.push(testFile);
    totalFailed++;
  } else {
    totalPassed++;
  }
});

// 输出最终结果
console.log('\n\n========================================');
console.log('             测试结果汇总');
console.log('========================================');
console.log(`✅ 通过: ${totalPassed} 个文件`);
console.log(`❌ 失败: ${totalFailed} 个文件`);
console.log('========================================\n');

if (failedTests.length > 0) {
  console.log('失败的测试:');
  failedTests.forEach(test => {
    console.log(`  - ${test}`);
  });
  console.log('');
  process.exit(1);
} else {
  console.log('🎉 所有测试通过！');
  process.exit(0);
}
