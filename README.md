# 手账记账

手账记账是一款基于微信小程序云开发的个人记账应用，用来记录日常收入、支出和账户转账，并按账户、分类和时间维度查看资产变化。项目采用本地小程序前端加微信云开发后端的结构，核心数据按用户 `openid` 隔离存储在云端。

## 主要功能

- 记账首页：按日期展示收支记录，支持新增、编辑、删除收入/支出记录和转账记录。
- 账户管理：维护现金、信用卡、储蓄卡、基金、股票、虚拟账户、负债账户、债权账户等账户类型。
- 账户详情：查看单个账户的余额、收入、支出、转账流水和统计信息。
- 分类管理：维护支出和收入分类组，支持自定义分类名称、图标和颜色。
- 统计分析：查看本月/本年收支概览、总资产趋势和支出分类统计。
- 数据备份：支持云端读取、云端写入、粘贴导入、导出备份、刷新数据和调试日志。

## 技术栈

- 微信小程序原生框架
- 微信云开发
- 云存储 JSON 文件：`records.json`、`accounts.json`、`categories.json`
- 云函数：`quickstartFunctions`
- Node.js 自定义单元测试

## 项目结构

```text
.
├── cloudfunctions/
│   └── quickstartFunctions/       # 云函数入口，处理 openid、云存储读写等能力
├── miniprogram/
│   ├── app.js                     # 全局数据、云开发初始化、记录/账户/分类加载与写入
│   ├── app.json                   # 页面、导航栏、TabBar 配置
│   ├── pages/
│   │   ├── index/                 # 记账首页
│   │   ├── accounts/              # 账户列表
│   │   ├── account-detail/        # 账户详情
│   │   ├── account-edit/          # 新增/编辑账户
│   │   ├── add-record/            # 新增/编辑收入支出
│   │   ├── transfer/              # 新增/编辑转账
│   │   ├── statistics/            # 统计页
│   │   ├── settings/              # 设置、导入导出、调试
│   │   ├── category-manage/       # 分类管理
│   │   └── category-edit/         # 新增/编辑分类
│   └── utils/
│       ├── balanceCalculator.js   # 账户余额计算
│       ├── cloudStorage.js        # 云存储读写封装
│       └── logger.js              # 日志工具
├── test/                          # Node.js 单元测试
├── package.json                   # 测试脚本
└── project.config.json            # 微信开发者工具项目配置
```

## 数据存储说明

用户数据保存在微信云存储中，路径按 `openid` 分组：

```text
users/<openid>/records.json
users/<openid>/accounts.json
users/<openid>/categories.json
```

其中：

- `records.json` 保存收入、支出、转账流水。
- `accounts.json` 保存账户列表、余额、账户类型和是否计入总资产等配置。
- `categories.json` 保存收入/支出分类配置。

前端优先通过云函数读写云存储，避免小程序端直接上传时遇到权限限制；云函数不可用时会尝试前端下载/上传作为兜底。云存储文件 ID 会同步记录到 `file_mappings` 集合中，便于后续读取。

## 本地开发

1. 使用微信开发者工具打开项目根目录。
2. 确认 `project.config.json` 中的小程序根目录为 `miniprogram/`，云函数目录为 `cloudfunctions/`。
3. 确认 `miniprogram/app.js` 和 `miniprogram/utils/cloudStorage.js` 中的云开发环境 ID 与当前环境一致。
4. 右键 `cloudfunctions/quickstartFunctions`，选择“上传并部署：云端安装依赖”。
5. 在微信开发者工具中编译或预览小程序。

## 测试

项目包含一组不依赖小程序运行时的 Node.js 单元测试，用于覆盖余额计算、账户详情、云存储读写、openid 加载竞态和关键页面布局约束。

安装依赖：

```bash
npm install
```

运行全部测试：

```bash
npm test
```

运行部分测试：

```bash
npm run test:balance
npm run test:account
npm run test:include
```

新增 `.test.js` 文件后会被 `test/run-tests.js` 自动发现并执行。

## 常见维护点

- 修改云函数后，需要重新上传并部署 `quickstartFunctions`。
- 修改云存储路径或环境 ID 后，需要同步检查 `cloudStorage.js` 中的 File ID 候选逻辑。
- 修改账户余额规则时，需要同步运行余额计算、账户详情和统计相关测试。
- 修改页面布局时，建议补充或更新对应的布局测试，避免不同金额长度、长文本或空数据状态导致错位。

## 适用场景

这个项目适合作为个人记账小程序、微信云开发数据同步示例、以及小程序前端结合云存储 JSON 文件的实践项目。
