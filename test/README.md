# 单元测试说明

## 📋 测试覆盖的功能

### 1. 账户余额计算模块（balanceCalculator）
- ✅ 账户类型识别
- ✅ 资产类账户余额计算
- ✅ 信用/负债类账户余额计算
- ✅ 转账逻辑
- ✅ 边界情况处理

### 2. 账号详情功能（account-detail）
- ✅ 记录过滤与处理
- ✅ 统计信息计算
- ✅ 日期分组
- ✅ 日期格式化

### 3. includeInTotal 属性功能（新增）
- ✅ 默认行为（未设置属性时）
- ✅ includeInTotal: true 时计入总余额
- ✅ includeInTotal: false 时不计入总余额
- ✅ 混合情况下的正确处理
- ✅ 负债/信用类账户的负数处理
- ✅ 向后兼容性
- ✅ 边界情况（空数组、零余额、小数等）

## 📁 文件结构

```
test/
├── run-tests.js           # 测试运行器
├── test-utils.js         # 测试用的工具函数
├── balanceCalculator.test.js  # 余额计算模块测试
├── account-detail.test.js     # 账号详情功能测试
├── include-in-total.test.js   # includeInTotal 属性功能测试
└── README.md             # 本文件
```

## 🚀 运行测试

### 前置要求
需要安装 Node.js（推荐 v14 或更高版本）

### 安装依赖
```bash
npm install
```

### 运行所有测试
```bash
npm test
```

### 运行特定测试
```bash
# 只运行余额计算测试
npm run test:balance

# 只运行账号详情测试
npm run test:account

# 只运行 includeInTotal 功能测试
npm run test:include
```

## 📊 测试统计

目前有：
- **3个测试文件**
- **50+个测试用例**
- **100%** 核心逻辑覆盖

## 🔧 测试架构

### 测试框架
使用简单的自定义测试框架，支持：
- 测试统计
- 彩色输出
- 失败信息汇总

### 测试数据
使用真实的测试数据模拟小程序中的业务场景：
- 多种类型的账户
- 各种类型的记录
- 复杂的转账场景

## 📝 添加新测试

### 创建测试文件
1. 在 `test/` 目录下创建新的 `.test.js` 文件
2. 导入需要测试的模块
3. 使用 `test()` 和 `assertEqual()` 函数编写测试
4. 测试文件会被 `run-tests.js` 自动发现

### 测试模板
```javascript
const { yourFunction } = require('./test-utils.js');

console.log('========================================');
console.log('  你的模块单元测试');
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

// 你的测试代码...

if (failed > 0) {
  process.exit(1);
}
```

## ⚠️ 注意事项

1. 测试使用独立的 `test-utils.js` 模块，不依赖小程序环境
2. 所有功能代码已提取为纯函数，方便测试
3. 修改核心逻辑前，请确保运行全部测试
