const SHOW_HIDDEN_ACCOUNTS_KEY = 'showHiddenAccounts';
const HIDDEN_ACCOUNT_NAME = '已隐藏账号';

function isHiddenAccount(account) {
  return !!account && account.isHidden === true;
}

function getShowHiddenAccounts() {
  if (typeof wx === 'undefined' || !wx.getStorageSync) {
    return false;
  }

  try {
    return wx.getStorageSync(SHOW_HIDDEN_ACCOUNTS_KEY) === true;
  } catch (e) {
    return false;
  }
}

function setShowHiddenAccounts(value) {
  if (typeof wx === 'undefined' || !wx.setStorageSync) {
    return;
  }

  wx.setStorageSync(SHOW_HIDDEN_ACCOUNTS_KEY, value === true);
}

function getVisibleAccounts(accounts, options = {}) {
  const source = Array.isArray(accounts) ? accounts : [];
  const showHidden = options.showHidden !== undefined
    ? options.showHidden === true
    : getShowHiddenAccounts();
  const keepIds = new Set((options.keepIds || []).filter(Boolean));

  return source.filter(account => {
    return !isHiddenAccount(account) || showHidden || keepIds.has(account.id);
  });
}

function getDisplayAccountName(account, showHidden) {
  if (!account) return '';
  if (isHiddenAccount(account) && showHidden !== true) {
    return HIDDEN_ACCOUNT_NAME;
  }
  return account.name || '';
}

function decorateAccount(account, showHidden) {
  return {
    ...account,
    displayName: getDisplayAccountName(account, showHidden),
    isDisplayHidden: isHiddenAccount(account) && showHidden !== true
  };
}

function decorateAccounts(accounts, showHidden) {
  return (Array.isArray(accounts) ? accounts : []).map(account => decorateAccount(account, showHidden));
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    SHOW_HIDDEN_ACCOUNTS_KEY,
    HIDDEN_ACCOUNT_NAME,
    isHiddenAccount,
    getShowHiddenAccounts,
    setShowHiddenAccounts,
    getVisibleAccounts,
    getDisplayAccountName,
    decorateAccount,
    decorateAccounts
  };
}
