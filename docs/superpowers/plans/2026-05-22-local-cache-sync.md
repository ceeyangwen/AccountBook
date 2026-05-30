# Local Cache Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the mini program reopen quickly by showing local cached data first, then refreshing cloud data in the background.

**Architecture:** Add a small `localCache` utility that stores `records`, `accounts`, and `categories` as JSON files under `wx.env.USER_DATA_PATH`, keyed by `openid`. `app.js` keeps cloud storage as the source of truth: successful cloud reads update memory and cache, and successful cloud writes update cache after writing to cloud.

**Tech Stack:** WeChat Mini Program APIs, Node-based unit tests with mocked `wx`, existing `cloudStorage` JSON file workflow.

---

### Task 1: Local Cache Utility

**Files:**
- Create: `miniprogram/utils/localCache.js`
- Test: `test/local-cache.test.js`

- [ ] **Step 1: Write failing tests**

Test that cached data is written to a per-user local file, can be read back, and returns `null` when no openid or file exists.

- [ ] **Step 2: Run failing test**

Run: `node test/local-cache.test.js`
Expected: fail because `miniprogram/utils/localCache.js` does not exist.

- [ ] **Step 3: Implement utility**

Create `readDataCache(dataType)`, `writeDataCache(dataType, data)`, and `clearDataCache(dataType)`. Store a wrapper object with `data` and metadata, but read raw legacy JSON too.

- [ ] **Step 4: Run passing test**

Run: `node test/local-cache.test.js`
Expected: pass.

### Task 2: App Load Uses Cache First

**Files:**
- Modify: `miniprogram/app.js`
- Test: `test/app-local-cache-sync.test.js`

- [ ] **Step 1: Write failing tests**

Test that `loadAccounts` returns cached accounts immediately, then refreshes from cloud and writes the fresh data back to local cache. Test that `forceRefresh` skips local cache.

- [ ] **Step 2: Run failing test**

Run: `node test/app-local-cache-sync.test.js`
Expected: fail because app load functions do not use `localCache`.

- [ ] **Step 3: Implement cache-first load path**

Update `loadRecords`, `loadAccounts`, and `loadCategories` to:
- keep existing memory fast path;
- wait for openid as today;
- when not forced, read local cache and invoke callback immediately if valid;
- start a background cloud refresh when cache was used;
- write successful cloud reads back to local cache.

- [ ] **Step 4: Run passing test**

Run: `node test/app-local-cache-sync.test.js`
Expected: pass.

### Task 3: Successful Writes Update Cache

**Files:**
- Modify: `miniprogram/app.js`
- Test: `test/app-local-cache-sync.test.js`

- [ ] **Step 1: Extend failing tests**

Test that successful `addAccount`, `saveAccounts`, `saveCategories`, and import/update paths write local cache after cloud write succeeds.

- [ ] **Step 2: Run failing test**

Run: `node test/app-local-cache-sync.test.js`
Expected: fail for write cache calls.

- [ ] **Step 3: Implement cache writes after cloud success**

Add a small `writeDataCache` wrapper in `app.js` and call it after successful writes for records, accounts, and categories.

- [ ] **Step 4: Run targeted and full tests**

Run: `node test/app-local-cache-sync.test.js`
Run: `npm test`
Expected: all pass.
