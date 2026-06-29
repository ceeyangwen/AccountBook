/**
 * 对抗式功能回归测试
 */

console.log('========================================');
console.log('      对抗式功能回归单元测试');
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

function assertDeepEqual(actual, expected, message) {
  const actualJson = JSON.stringify(actual);
  const expectedJson = JSON.stringify(expected);
  if (actualJson !== expectedJson) {
    throw new Error(`${message} - 期望: ${expectedJson}, 实际: ${actualJson}`);
  }
}

function assertMatches(content, pattern, message) {
  if (!pattern.test(content)) {
    throw new Error(message);
  }
}

async function flushPromises(times = 6) {
  for (let i = 0; i < times; i++) {
    await Promise.resolve();
  }
}

function nextWriteResult(writeResults, dataType) {
  const configured = writeResults[dataType];
  if (Array.isArray(configured)) {
    return configured.length > 0 ? configured.shift() : true;
  }
  if (configured !== undefined) {
    return configured;
  }
  return true;
}

function clearAppModules() {
  [
    '../miniprogram/app.js',
    '../miniprogram/utils/cloudStorage.js',
    '../miniprogram/utils/localCache.js',
    '../miniprogram/utils/logger.js',
    '../miniprogram/utils/balanceCalculator.js'
  ].forEach(modulePath => {
    delete require.cache[require.resolve(modulePath)];
  });
}

function setupAppMock(options = {}) {
  let appInstance = null;
  let openidSuccess = null;
  let openidFail = null;
  const files = {};
  const storage = {
    openid: options.openid === undefined ? 'regression-user' : options.openid
  };
  const cloudWrites = [];
  const writeResults = options.writeResults || {};
  const toasts = [];
  const modals = [];

  global.App = function (definition) {
    appInstance = definition;
  };

  global.getApp = function () {
    return appInstance || {};
  };

  global.wx = {
    env: {
      USER_DATA_PATH: '/mock-user-data'
    },
    getStorageSync: function (key) {
      return storage[key];
    },
    setStorageSync: function (key, value) {
      storage[key] = value;
    },
    showToast: function (options) {
      toasts.push(options);
    },
    showModal: function (options) {
      modals.push(options);
    },
    showLoading: function () {},
    hideLoading: function () {},
    navigateBack: function () {},
    getFileSystemManager: function () {
      return {
        readFileSync: function (path) {
          if (!Object.prototype.hasOwnProperty.call(files, path)) {
            throw new Error('file not found');
          }
          return files[path];
        },
        writeFileSync: function (path, content) {
          files[path] = content;
        },
        unlinkSync: function (path) {
          delete files[path];
        }
      };
    },
    cloud: {
      init: function () {},
      getEnv: function () {
        return 'cloud1-d3gvv57hn4dfa5588';
      },
      callFunction: function (request) {
        const data = request.data || {};

        if (data.type === 'getOpenId') {
          openidSuccess = request.success;
          openidFail = request.fail;
          return;
        }

        if (data.type === 'readStorageData') {
          return Promise.resolve(options.readStorageResult || {
            result: {
              success: true,
              data: options.readStorageData || []
            }
          });
        }

        if (data.type === 'writeStorageData') {
          cloudWrites.push({
            dataType: data.dataType,
            data: data.data
          });
          const success = nextWriteResult(writeResults, data.dataType);
          return Promise.resolve({
            result: success
              ? { success: true, fileID: 'cloud://mock/' + data.dataType + '.json' }
              : { success: false, errMsg: 'mock write failed: ' + data.dataType }
          });
        }

        if (data.type === 'appendPerformanceLog') {
          return Promise.resolve({ result: { success: true } });
        }

        return Promise.resolve({ result: { success: true } });
      },
      downloadFile: async function () {
        throw new Error(options.downloadError || 'file not exist');
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
              },
              add: async function () {
                return {};
              }
            };
          }
        };
      }
    }
  };

  clearAppModules();
  require('../miniprogram/app.js');

  appInstance.globalData = {
    records: [],
    accounts: [],
    categories: {
      expense: { groups: [] },
      income: { groups: [] }
    },
    categoriesLoaded: true,
    accountCategories: [
      { id: 1, name: '现金', icon: '💵', type: 'asset' },
      { id: 2, name: '信用卡', icon: '💳', type: 'credit' }
    ]
  };

  return {
    app: appInstance,
    cloudWrites,
    storage,
    toasts,
    modals,
    resolveOpenId: function (response) {
      openidSuccess(response);
    },
    rejectOpenId: function (error) {
      openidFail(error);
    }
  };
}

function setupTransferPageMock() {
  let pageInstance = null;
  const addTransferCalls = [];
  const app = {
    globalData: {
      accounts: [
        { id: 'cash', name: '现金', category: '现金', balance: '100.00' },
        { id: 'card', name: '信用卡', category: '信用卡', balance: '0.00' }
      ],
      accountCategories: [
        { id: 1, name: '现金', icon: '💵' },
        { id: 2, name: '信用卡', icon: '💳' }
      ]
    },
    addTransfer: function (transfer) {
      addTransferCalls.push(transfer);
    },
    updateRecord: function () {}
  };

  global.getApp = function () {
    return app;
  };

  global.Page = function (definition) {
    pageInstance = definition;
    pageInstance.setData = function (data) {
      this.data = {
        ...this.data,
        ...data
      };
    };
  };

  global.wx = {
    getStorageSync: function () {
      return false;
    },
    setStorageSync: function () {},
    showToast: function () {},
    showLoading: function () {},
    hideLoading: function () {},
    navigateBack: function () {}
  };

  [
    '../miniprogram/pages/transfer/transfer.js',
    '../miniprogram/utils/amountExpression.js',
    '../miniprogram/utils/accountVisibility.js',
    '../miniprogram/utils/iconResolver.js',
    '../miniprogram/utils/logger.js'
  ].forEach(modulePath => {
    delete require.cache[require.resolve(modulePath)];
  });

  require('../miniprogram/pages/transfer/transfer.js');

  return {
    page: pageInstance,
    addTransferCalls
  };
}

(async function run() {
  await test('记录保存失败时不应留下本地记录或提前改账户余额', async () => {
    const { app } = setupAppMock({ writeResults: { records: false } });
    app.globalData.records = [];
    app.globalData.accounts = [
      { id: 'cash', name: '现金', category: '现金', balance: '100.00' }
    ];
    let callbackResult = null;

    app.addRecord({
      type: 'expense',
      amount: '10.00',
      accountId: 'cash',
      date: '2026-06-29'
    }, success => {
      callbackResult = success;
    });
    await flushPromises(12);

    assertEqual(callbackResult, false, '保存失败回调');
    assertEqual(app.globalData.records.length, 0, '本地记录数量');
    assertEqual(app.globalData.accounts[0].balance, '100.00', '账户余额');
  });

  await test('账户余额写入失败时整次记账应失败且本地状态不变', async () => {
    const { app } = setupAppMock({ writeResults: { records: true, accounts: false } });
    app.globalData.records = [];
    app.globalData.accounts = [
      { id: 'cash', name: '现金', category: '现金', balance: '100.00' }
    ];
    let callbackResult = null;

    app.addRecord({
      type: 'expense',
      amount: '10.00',
      accountId: 'cash',
      date: '2026-06-29'
    }, success => {
      callbackResult = success;
    });
    await flushPromises(16);

    assertEqual(callbackResult, false, '保存失败回调');
    assertEqual(app.globalData.records.length, 0, '本地记录数量');
    assertEqual(app.globalData.accounts[0].balance, '100.00', '账户余额');
  });

  await test('有历史记录引用的账户不应被删除', async () => {
    const { app, cloudWrites } = setupAppMock();
    app.globalData.accounts = [
      { id: 'cash', name: '现金', category: '现金', balance: '100.00' },
      { id: 'card', name: '信用卡', category: '信用卡', balance: '0.00' }
    ];
    app.globalData.records = [
      { id: 'record-1', type: 'expense', accountId: 'cash', amount: '10.00' }
    ];
    let callbackResult = null;

    app.deleteAccount('cash', success => {
      callbackResult = success;
    });
    await flushPromises(8);

    assertEqual(callbackResult, false, '删除回调');
    assertEqual(app.globalData.accounts.length, 2, '账户数量不变');
    assertEqual(cloudWrites.length, 0, '不应写入云端账户文件');
  });

  await test('转账保存中应禁用按钮并阻止重复提交', async () => {
    const fs = require('fs');
    const path = require('path');
    const transferWxml = fs.readFileSync(path.join(__dirname, '../miniprogram/pages/transfer/transfer.wxml'), 'utf8');
    const { page, addTransferCalls } = setupTransferPageMock();

    assertMatches(transferWxml, /<button[^>]*disabled="\{\{isSaving\}\}"/, '转账保存按钮应绑定 disabled');

    page.setData({
      amount: '12.00',
      date: '2026-06-29',
      note: '',
      fromAccountId: 'cash',
      toAccountId: 'card',
      accounts: [
        { id: 'cash', name: '现金', category: '现金', balance: '100.00' },
        { id: 'card', name: '信用卡', category: '信用卡', balance: '0.00' }
      ]
    });

    page.saveTransfer();
    page.saveTransfer();

    assertEqual(addTransferCalls.length, 1, '重复点击提交次数');
  });

  await test('openid 异常返回应结束等待并允许后续重试', async () => {
    const { app, resolveOpenId } = setupAppMock({ openid: '' });
    const callbackValues = [];

    app.waitForOpenId(openid => {
      callbackValues.push(openid);
    });
    resolveOpenId({ result: {} });
    await flushPromises(4);

    assertDeepEqual(callbackValues, [null], '等待回调应收到失败结果');
    assertEqual(app.isGettingOpenId, false, 'openid 获取状态应复位');
  });

  await test('云端读取权限异常不应被伪装成空数组', async () => {
    setupAppMock({
      readStorageResult: {
        result: {
          success: false,
          errMsg: 'permission denied'
        }
      },
      downloadError: 'permission denied'
    });
    const cloudStorage = require('../miniprogram/utils/cloudStorage.js');

    const data = await cloudStorage.readDataFromCloud('accounts');

    assertEqual(data, null, '权限异常读取结果');
  });

  console.log('\n========================================');
  console.log(`测试完成: ${passed} 通过, ${failed} 失败`);
  console.log('========================================');

  if (failed > 0) {
    process.exit(1);
  }
})();
