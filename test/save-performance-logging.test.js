/**
 * 保存性能埋点和防重复提交测试
 */

const fs = require('fs');
const path = require('path');

console.log('========================================');
console.log('      保存性能埋点单元测试');
console.log('========================================\n');

let passed = 0;
let failed = 0;

async function test(description, testFn) {
  try {
    await testFn();
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

async function flushPromises(times = 6) {
  for (let i = 0; i < times; i++) {
    await Promise.resolve();
  }
}

function setupCloudStorageMock() {
  const callFunctionRequests = [];
  const storage = {
    openid: 'perf-user-1'
  };

  global.getApp = function () {
    return {};
  };

  global.wx = {
    env: {
      USER_DATA_PATH: '/tmp'
    },
    getStorageSync: function (key) {
      return storage[key];
    },
    setStorageSync: function (key, value) {
      storage[key] = value;
    },
    showModal: function () {},
    getFileSystemManager: function () {
      return {
        readFileSync: function () {
          return '[]';
        },
        writeFileSync: function () {},
        unlinkSync: function () {}
      };
    },
    cloud: {
      getEnv: function () {
        return 'cloud1-d3gvv57hn4dfa5588';
      },
      callFunction: async function (request) {
        callFunctionRequests.push(request);
        if (request.data.type === 'writeStorageData') {
          return {
            result: {
              success: true,
              fileID: 'cloud://mock/records.json',
              performance: {
                totalMs: 35,
                uploadMs: 20,
                byteLength: 128
              }
            }
          };
        }

        if (request.data.type === 'appendPerformanceLog') {
          return {
            result: {
              success: true,
              retainedCount: 1,
              deletedCount: 0
            }
          };
        }

        return { result: { success: true, data: [] } };
      },
      database: function () {
        return {
          collection: function () {
            return {
              where: function () {
                return {
                  get: async function () {
                    return { data: [] };
                  }
                };
              }
            };
          }
        };
      }
    }
  };

  [
    '../miniprogram/utils/cloudStorage.js',
    '../miniprogram/utils/logger.js'
  ].forEach(modulePath => {
    delete require.cache[require.resolve(modulePath)];
  });

  return {
    callFunctionRequests,
    cloudStorage: require('../miniprogram/utils/cloudStorage.js')
  };
}

function setupAddRecordPageMock() {
  let pageInstance = null;
  let addRecordCalls = 0;

  global.getApp = function () {
    return {
      globalData: {
        records: [],
        accounts: [{ id: 'acc-1', name: '现金', displayName: '现金', category: '现金', balance: '10.00' }],
        categories: {
          expense: {
            groups: [
              {
                id: 'expense-group-1',
                name: '支出',
                children: [{ id: 'expense-1', name: '三餐', icon: '🍽️', groupId: 'expense-group-1' }]
              }
            ]
          },
          income: { groups: [] }
        }
      },
      getFlatCategories: function () {
        return [{ id: 'expense-1', name: '三餐', icon: '🍽️', groupId: 'expense-group-1' }];
      },
      addRecord: function () {
        addRecordCalls++;
      },
      updateRecord: function () {}
    };
  };

  global.Page = function (definition) {
    pageInstance = definition;
    pageInstance.setData = function (data) {
      pageInstance.data = {
        ...pageInstance.data,
        ...data
      };
    };
  };

  global.wx = {
    getStorageSync: function () {
      return false;
    },
    showToast: function () {},
    showLoading: function () {},
    hideLoading: function () {}
  };

  [
    '../miniprogram/pages/add-record/add-record.js',
    '../miniprogram/utils/logger.js',
    '../miniprogram/utils/amountExpression.js',
    '../miniprogram/utils/accountVisibility.js'
  ].forEach(modulePath => {
    delete require.cache[require.resolve(modulePath)];
  });

  require('../miniprogram/pages/add-record/add-record.js');

  return {
    page: pageInstance,
    getAddRecordCalls: function () {
      return addRecordCalls;
    }
  };
}

(async function run() {
  await test('写入云端数据后应异步上报保存性能日志', async () => {
    const { cloudStorage, callFunctionRequests } = setupCloudStorageMock();

    const result = await cloudStorage.writeDataToCloud('records', [{ id: 'record-1', amount: '12.00' }]);
    await flushPromises();

    const writeRequest = callFunctionRequests.find(request => request.data.type === 'writeStorageData');
    const logRequest = callFunctionRequests.find(request => request.data.type === 'appendPerformanceLog');

    assertEqual(result.success, true, '写入结果');
    assertEqual(writeRequest.data.dataType, 'records', '应先写入 records');
    assertEqual(logRequest.data.log.operation, 'writeDataToCloud', '日志操作名');
    assertEqual(logRequest.data.log.dataType, 'records', '日志数据类型');
    assertEqual(logRequest.data.log.success, true, '日志成功状态');
    assertEqual(typeof logRequest.data.log.durationMs, 'number', '日志应包含客户端耗时');
    assertEqual(logRequest.data.log.serverPerformance.byteLength, 128, '日志应包含服务端字节数');
  });

  await test('保存按钮应在提交中禁用，并阻止重复提交', async () => {
    const root = path.join(__dirname, '..');
    const addRecordWxml = fs.readFileSync(path.join(root, 'miniprogram/pages/add-record/add-record.wxml'), 'utf8');
    const { page, getAddRecordCalls } = setupAddRecordPageMock();

    assertMatches(addRecordWxml, /<button[^>]*disabled="\{\{isSaving\}\}"/, '保存按钮应绑定 disabled');

    page.setData({
      isSaving: true,
      amount: '12.00',
      recordType: 'expense',
      selectedCategoryId: 'expense-1',
      selectedAccountId: 'acc-1',
      date: '2026-06-25',
      note: ''
    });
    page.saveRecord();

    assertEqual(getAddRecordCalls(), 0, '提交中不应再次调用 addRecord');
  });

  await test('云函数应紧凑写入主数据，并保留带清理策略的性能日志文件', async () => {
    const root = path.join(__dirname, '..');
    const cloudFunctionJs = fs.readFileSync(path.join(root, 'cloudfunctions/quickstartFunctions/index.js'), 'utf8');

    assertMatches(cloudFunctionJs, /const PERFORMANCE_LOG_RETENTION_DAYS\s*=/, '应有性能日志保留天数');
    assertMatches(cloudFunctionJs, /appendPerformanceLog/, '应有性能日志追加方法');
    assertMatches(cloudFunctionJs, /deletedCount/, '性能日志写入应返回清理数量');
    assertMatches(cloudFunctionJs, /JSON\.stringify\(data\)/, '主数据写入应使用紧凑 JSON');
    assertNotMatches(cloudFunctionJs, /JSON\.stringify\(data,\s*null,\s*2\)/, '主数据写入不应使用 pretty JSON');
    assertNotMatches(cloudFunctionJs, /请求数据:\`,\s*JSON\.stringify\(event\)/, '云函数不应打印完整请求体');
  });

  console.log('\n========================================');
  console.log(`测试完成: ${passed} 通过, ${failed} 失败`);
  console.log('========================================');

  if (failed > 0) {
    process.exit(1);
  }
})();
