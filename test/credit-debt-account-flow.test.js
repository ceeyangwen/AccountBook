/**
 * 信用卡/负债账户余额流转测试
 */

console.log('========================================');
console.log('    信用卡/负债账户余额流转单元测试');
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

async function flushPromises(times = 4) {
  for (let i = 0; i < times; i++) {
    await Promise.resolve();
  }
}

function setupAppMock() {
  let appInstance = null;
  const storage = {
    openid: 'credit-flow-user'
  };

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
    showToast: function () {},
    showModal: function () {},
    getFileSystemManager: function () {
      return {
        readFileSync: function () {
          throw new Error('file not found');
        },
        writeFileSync: function () {},
        unlinkSync: function () {}
      };
    },
    cloud: {
      getEnv: function () {
        return 'cloud1-d3gvv57hn4dfa5588';
      },
      callFunction: function ({ data }) {
        if (data.type === 'writeStorageData') {
          return Promise.resolve({
            result: {
              success: true,
              fileID: 'cloud://mock/' + data.dataType + '.json'
            }
          });
        }
        return Promise.resolve({
          result: {
            success: true,
            data: []
          }
        });
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
    '../miniprogram/app.js',
    '../miniprogram/utils/cloudStorage.js',
    '../miniprogram/utils/localCache.js',
    '../miniprogram/utils/logger.js',
    '../miniprogram/utils/balanceCalculator.js'
  ].forEach(modulePath => {
    delete require.cache[require.resolve(modulePath)];
  });

  require('../miniprogram/app.js');

  appInstance.globalData = {
    records: [],
    accounts: [
      { id: 'card', name: '招商信用卡', category: '信用卡', balance: '100.00' },
      { id: 'cash', name: '现金', category: '现金', balance: '500.00' }
    ],
    categories: {
      expense: { groups: [] },
      income: { groups: [] }
    },
    categoriesLoaded: true
  };

  return appInstance;
}

(async function run() {
  await test('信用卡新增支出应增加负债，新增收入应减少负债', async () => {
    const app = setupAppMock();

    app.addRecord({
      type: 'expense',
      amount: '30.00',
      accountId: 'card',
      date: '2026-05-23'
    }, () => {});
    await flushPromises(8);
    assertEqual(app.globalData.accounts[0].balance, '130.00', '信用卡支出后负债');

    app.addRecord({
      type: 'income',
      amount: '20.00',
      accountId: 'card',
      date: '2026-05-23'
    }, () => {});
    await flushPromises(8);
    assertEqual(app.globalData.accounts[0].balance, '110.00', '信用卡收入后负债');
  });

  await test('信用卡转出应增加负债，转入应减少负债', async () => {
    const app = setupAppMock();

    app.addTransfer({
      type: 'transfer',
      amount: '40.00',
      fromAccountId: 'card',
      toAccountId: 'cash',
      date: '2026-05-23'
    }, () => {});
    await flushPromises(8);
    assertEqual(app.globalData.accounts[0].balance, '140.00', '信用卡转出后负债');

    app.addTransfer({
      type: 'transfer',
      amount: '25.00',
      fromAccountId: 'cash',
      toAccountId: 'card',
      date: '2026-05-23'
    }, () => {});
    await flushPromises(8);
    assertEqual(app.globalData.accounts[0].balance, '115.00', '信用卡转入后负债');
  });

  await test('删除转入信用卡的转账记录应恢复负债', async () => {
    const app = setupAppMock();
    app.globalData.records = [
      {
        id: 'transfer-in-card',
        type: 'transfer',
        amount: '25.00',
        fromAccountId: 'cash',
        toAccountId: 'card',
        date: '2026-05-23'
      }
    ];
    app.globalData.accounts[0].balance = '75.00';
    app.globalData.accounts[1].balance = '475.00';

    app.deleteRecord('transfer-in-card', () => {});
    await flushPromises(8);

    assertEqual(app.globalData.accounts[0].balance, '100.00', '删除转入信用卡记录后负债');
    assertEqual(app.globalData.accounts[1].balance, '500.00', '删除转出现金记录后余额');
  });

  await test('编辑转入信用卡的转账金额应先恢复旧负债再应用新负债', async () => {
    const app = setupAppMock();
    app.globalData.records = [
      {
        id: 'transfer-in-card',
        type: 'transfer',
        amount: '25.00',
        fromAccountId: 'cash',
        toAccountId: 'card',
        date: '2026-05-23'
      }
    ];
    app.globalData.accounts[0].balance = '75.00';
    app.globalData.accounts[1].balance = '475.00';

    app.updateRecord('transfer-in-card', {
      type: 'transfer',
      amount: '10.00',
      fromAccountId: 'cash',
      toAccountId: 'card',
      date: '2026-05-23'
    }, () => {});
    await flushPromises(8);

    assertEqual(app.globalData.accounts[0].balance, '90.00', '编辑转入信用卡记录后负债');
    assertEqual(app.globalData.accounts[1].balance, '490.00', '编辑转出现金记录后余额');
  });

  console.log('\n========================================');
  console.log(`测试完成: ${passed} 通过, ${failed} 失败`);
  console.log('========================================');

  if (failed > 0) {
    process.exit(1);
  }
})();
