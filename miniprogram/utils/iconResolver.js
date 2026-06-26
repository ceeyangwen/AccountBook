const ACCOUNT_RULES = [
  { keys: ['支付宝', '余额宝'], label: '付', symbol: '∿', className: 'brand-alipay', color: '#1677FF' },
  { keys: ['微信', '零钱'], label: '微', symbol: '⌁', className: 'brand-wechat', color: '#22C55E' },
  { keys: ['QQ钱包'], label: 'Q', symbol: '◌', className: 'brand-qq', color: '#38BDF8' },
  { keys: ['花呗'], label: '花', symbol: '◇', className: 'brand-huabei', color: '#1677FF' },
  { keys: ['京东白条'], label: '京', symbol: '◆', className: 'brand-jd', color: '#EF4444' },
  { keys: ['招商银行'], label: '招', symbol: '▰', className: 'bank-cmb', color: '#EF4444' },
  { keys: ['工商银行'], label: '工', symbol: '▰', className: 'bank-icbc', color: '#DC2626' },
  { keys: ['建设银行'], label: '建', symbol: '▰', className: 'bank-ccb', color: '#2563EB' },
  { keys: ['农业银行'], label: '农', symbol: '▰', className: 'bank-abc', color: '#16A34A' },
  { keys: ['中国银行'], label: '中', symbol: '▰', className: 'bank-boc', color: '#DC2626' },
  { keys: ['交通银行'], label: '交', symbol: '▰', className: 'bank-bocom', color: '#2563EB' },
  { keys: ['邮储银行'], label: '邮', symbol: '▰', className: 'bank-psbc', color: '#16A34A' },
  { keys: ['浦发银行'], label: '浦', symbol: '▰', className: 'bank-spdb', color: '#2563EB' },
  { keys: ['民生银行'], label: '民', symbol: '▰', className: 'bank-cmbc', color: '#14B8A6' },
  { keys: ['兴业银行'], label: '兴', symbol: '▰', className: 'bank-cib', color: '#1D4ED8' },
  { keys: ['广发银行'], label: '广', symbol: '▰', className: 'bank-cgb', color: '#DC2626' },
  { keys: ['平安银行'], label: '平', symbol: '▰', className: 'bank-pab', color: '#F97316' },
  { keys: ['现金'], label: '现', symbol: '¥', className: 'account-cash', color: '#F59E0B' },
  { keys: ['信用卡'], label: '卡', symbol: '▱', className: 'account-card', color: '#22D3EE' },
  { keys: ['储蓄卡', '银行'], label: '银', symbol: '▰', className: 'account-bank', color: '#60A5FA' },
  { keys: ['基金账户'], label: '基', symbol: '◒', className: 'account-fund', color: '#34D399' },
  { keys: ['股票账户'], label: '股', symbol: '↗', className: 'account-stock', color: '#F97316' },
  { keys: ['虚拟账户'], label: '虚', symbol: '⌁', className: 'account-virtual', color: '#A78BFA' },
  { keys: ['负债账户'], label: '债', symbol: '−', className: 'account-debt', color: '#F87171' },
  { keys: ['债权账户'], label: '权', symbol: '+', className: 'account-receivable', color: '#14B8A6' }
];

const CATEGORY_RULES = [
  { keys: ['衣服', '饰品', '鞋', '帽', '包', '化妆'], label: '装', symbol: '◇', className: 'cat-apparel', color: '#F472B6' },
  { keys: ['食品', '酒水', '三餐', '水果', '零食', '下午茶', '宵夜'], label: '餐', symbol: '≋', className: 'cat-food', color: '#FB923C' },
  { keys: ['居家', '物业', '日常用品', '水电', '房租', '装修', '养娃'], label: '家', symbol: '⌂', className: 'cat-home', color: '#FACC15' },
  { keys: ['交通', '行车', '打车', '停车'], label: '行', symbol: '↗', className: 'cat-mobility', color: '#22D3EE' },
  { keys: ['通信', '手机费', '上网费', '邮寄'], label: '讯', symbol: '⌁', className: 'cat-signal', color: '#38BDF8' },
  { keys: ['娱乐', '休闲', '旅游', '运动', '健身', '聚会'], label: '乐', symbol: '✦', className: 'cat-leisure', color: '#A78BFA' },
  { keys: ['学习', '培训', '书画', '杂志'], label: '学', symbol: '▱', className: 'cat-education', color: '#818CF8' },
  { keys: ['人情', '送礼', '请客', '孝敬', '慈善', '礼金'], label: '礼', symbol: '◆', className: 'cat-gift', color: '#F87171' },
  { keys: ['医疗', '保健', '药品', '治疗', '美容'], label: '医', symbol: '+', className: 'cat-health', color: '#34D399' },
  { keys: ['金融', '保险', '按揭', '税收', '利息', '赔偿', '罚款'], label: '融', symbol: '¥', className: 'cat-finance', color: '#2DD4BF' },
  { keys: ['工资'], label: '薪', symbol: '¥', className: 'cat-salary', color: '#EF4444' },
  { keys: ['投资'], label: '投', symbol: '↗', className: 'cat-invest', color: '#F97316' },
  { keys: ['奖金', '中奖'], label: '奖', symbol: '✦', className: 'cat-bonus', color: '#F59E0B' },
  { keys: ['兼职', '经营'], label: '业', symbol: '▰', className: 'cat-business', color: '#14B8A6' },
  { keys: ['利息收入'], label: '息', symbol: '◒', className: 'cat-interest', color: '#06B6D4' },
  { keys: ['加班'], label: '班', symbol: '⌁', className: 'cat-overtime', color: '#38BDF8' },
  { keys: ['刷单'], label: '刷', symbol: '◇', className: 'cat-side-task', color: '#A78BFA' },
  { keys: ['信用卡还款'], label: '还', symbol: '↺', className: 'cat-repayment', color: '#22D3EE' },
  { keys: ['乱账'], label: '账', symbol: '∷', className: 'cat-adjustment', color: '#94A3B8' },
  { keys: ['职业收入'], label: '职', symbol: '▰', className: 'cat-career', color: '#818CF8' },
  { keys: ['其他', '意外', '杂项'], label: '其', symbol: '∷', className: 'cat-other', color: '#94A3B8' }
];

function makeBadge(rule, source) {
  return {
    label: rule.label,
    symbol: rule.symbol || '◇',
    className: rule.className,
    color: rule.color,
    background: withAlpha(rule.color, 0.16),
    source
  };
}

function withAlpha(hex, alpha) {
  const normalized = String(hex || '').replace('#', '');
  if (normalized.length !== 6) {
    return 'rgba(148, 163, 184, 0.16)';
  }

  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function findRule(text, rules) {
  return rules.find(rule => rule.keys.some(key => text.indexOf(key) !== -1));
}

function fallbackBadge(item, fallbackClass) {
  const icon = item && item.icon ? String(item.icon) : '';
  const name = item && item.name ? String(item.name) : '';
  const label = name.slice(0, 1) || icon || '·';
  const color = item && item.color ? item.color : '#94A3B8';
  return makeBadge({ label, symbol: '◇', className: fallbackClass, color }, 'fallback');
}

function resolveAccountBadge(account) {
  const name = account && account.name ? String(account.name) : '';
  const category = account && account.category ? String(account.category) : '';
  const text = `${name} ${category}`;
  const rule = findRule(text, ACCOUNT_RULES);
  return rule ? makeBadge(rule, 'resolved') : fallbackBadge(account, 'account-generic');
}

function resolveCategoryBadge(category, groupName) {
  const name = category && category.name ? String(category.name) : '';
  const text = `${groupName || ''} ${name}`;
  const rule = findRule(text, CATEGORY_RULES);
  return rule ? makeBadge(rule, 'resolved') : fallbackBadge(category, 'cat-generic');
}

module.exports = {
  resolveAccountBadge,
  resolveCategoryBadge
};
