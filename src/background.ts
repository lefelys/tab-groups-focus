// Save active tabs per window to storage
async function savetActiveTabs() {
  let lastActiveTabs: { [key: string]: number } = {};

  await chrome.tabs.query({ active: true }).then((tabs) =>
    tabs.forEach((tab) => {
      if (tab.id !== undefined) {
        const windowStr = tab.windowId.toString();
        lastActiveTabs[windowStr] = tab.id;
      }
    })
  );

  await chrome.storage.local.set(lastActiveTabs);
  if (chrome.runtime.lastError) console.warn(chrome.runtime.lastError);
}

savetActiveTabs();

chrome.tabs.onActivated.addListener(async ({ tabId, windowId }) => {
  await chrome.storage.local.set({ [windowId]: tabId });
  if (chrome.runtime.lastError) console.warn(chrome.runtime.lastError);
});

// Delete all items from storage to avoid memory leak, and fill active tabs again
chrome.windows.onRemoved.addListener(async () => {
  await chrome.storage.local.clear();
  await savetActiveTabs();
});

chrome.tabs.onCreated.addListener(async (tab) => {
  await chrome.storage.local
    .get(tab.windowId.toString())
    .then(async (result) => {
      if (chrome.runtime.lastError) console.warn(chrome.runtime.lastError);

      let prevTabId = result[tab.windowId];
      if (!prevTabId) return;

      let prevTab = await chrome.tabs
        .get(prevTabId)
        .catch((e) => console.warn(e));
      if (!prevTab) return;

      let prevGroupId = prevTab.groupId;
      if (prevGroupId <= 0) return;

      let group = await chrome.tabGroups
        .get(prevGroupId)
        .catch((e) => console.warn(e));
      if (!group || group.collapsed) return;

      chrome.tabs
        .group({
          groupId: prevGroupId,
          tabIds: tab.id,
        })
        .catch((e) => console.warn(e));
    });
});
