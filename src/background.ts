// On extension load - fill lastActiveTabs
async function getActiveTabs() {
  let lastActiveTabs: { [key: string]: number } = {};

  await chrome.tabs.query({ active: true }).then((tabs) =>
    tabs.forEach((tab) => {
      if (tab.id !== undefined) {
        const windowStr = tab.windowId.toString();
        lastActiveTabs[windowStr] = tab.id;
      }
    })
  );

  return lastActiveTabs;
}

getActiveTabs().then(async (res) => {
  await chrome.storage.local.set(res);
  if (chrome.runtime.lastError) {
    console.warn(chrome.runtime.lastError);
  }
});

chrome.tabs.onActivated.addListener(async ({ tabId, windowId }) => {
  await chrome.storage.local.set({ [windowId]: tabId });
  if (chrome.runtime.lastError) {
    console.warn(chrome.runtime.lastError);
  }
});

chrome.tabs.onCreated.addListener(async (tab) => {
  await chrome.storage.local
    .get(tab.windowId.toString())
    .then(async (result) => {
      if (chrome.runtime.lastError) {
        console.warn(chrome.runtime.lastError);
      }

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
