// last active tabs by window ids
let lastActiveTabs: { [key: number]: number } = {};

chrome.tabs.onActivated.addListener(({ tabId, windowId }) => {
  lastActiveTabs[windowId] = tabId;
});

chrome.tabs.onCreated.addListener(async (tab) => {
  let prevTabId = lastActiveTabs[tab.windowId];
  if (!prevTabId) return;

  let prevTab = await chrome.tabs.get(prevTabId).catch((e) => console.warn(e));
  if (!prevTab) return;

  let prevGroupId = prevTab.groupId;
  if (prevGroupId <= 0) return;

  let group = await chrome.tabGroups
    .get(prevGroupId)
    .catch((e) => console.warn(e));
  if (!group || group.collapsed) return;

  chrome.tabs.group({
    groupId: prevGroupId,
    tabIds: tab.id,
  });
});
