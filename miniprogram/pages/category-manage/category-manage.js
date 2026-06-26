const app = getApp();
const iconResolver = require('../../utils/iconResolver.js');

Page({
  data: {
    currentTab: 'expense',
    categories: null,
    expandedGroups: {}
  },

  onLoad: function(options) {
    const type = options.type || 'expense';
    this.setData({ currentTab: type });
    this.loadCategories();
  },

  onShow: function() {
    this.loadCategories();
  },

  loadCategories: function() {
    app.loadCategories(() => {
      this.setData({
        categories: app.globalData.categories[this.data.currentTab]
      });
      this.setData({
        categories: this.decorateCategories(this.data.categories)
      });
    });
  },

  decorateCategories: function(categories) {
    if (!categories || !Array.isArray(categories.groups)) {
      return categories;
    }

    return {
      ...categories,
      groups: categories.groups.map(group => ({
        ...group,
        badge: iconResolver.resolveCategoryBadge(group, group.name),
        children: (group.children || []).map(category => ({
          ...category,
          badge: iconResolver.resolveCategoryBadge(category, group.name)
        }))
      }))
    };
  },

  switchTab: function(e) {
    const type = e.currentTarget.dataset.type;
    this.setData({ currentTab: type });
    this.loadCategories();
  },

  toggleGroup: function(e) {
    const groupId = e.currentTarget.dataset.id;
    const expandedGroups = { ...this.data.expandedGroups };
    expandedGroups[groupId] = !expandedGroups[groupId];
    this.setData({ expandedGroups });
  },

  editCategory: function(e) {
    const { groupid, categoryid } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/category-edit/category-edit?type=${this.data.currentTab}&groupId=${groupid}&categoryId=${categoryid}`
    });
  },

  editGroup: function(e) {
    const { groupid } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/category-edit/category-edit?type=${this.data.currentTab}&groupId=${groupid}&isGroup=true`
    });
  },

  addCategory: function(e) {
    const { groupid } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/category-edit/category-edit?type=${this.data.currentTab}&groupId=${groupid}&isNew=true`
    });
  },

  addGroup: function() {
    wx.navigateTo({
      url: `/pages/category-edit/category-edit?type=${this.data.currentTab}&isNew=true&isGroup=true`
    });
  },

  deleteCategory: function(e) {
    const { groupid, categoryid } = e.currentTarget.dataset;
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个分类吗？',
      success: (res) => {
        if (res.confirm) {
          app.deleteCategory(this.data.currentTab, groupid, categoryid, () => {
            this.loadCategories();
          });
        }
      }
    });
  },

  deleteGroup: function(e) {
    const { groupid } = e.currentTarget.dataset;
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个分类组吗？该组下的所有分类也会被删除。',
      success: (res) => {
        if (res.confirm) {
          app.deleteCategoryGroup(this.data.currentTab, groupid, () => {
            this.loadCategories();
          });
        }
      }
    });
  }
});
