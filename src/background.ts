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

// last active tabs by window ids
const key = 'activeTabs';

getActiveTabs().then(async (res) => {
  await chrome.storage.local.set({ [key]: res });
  if (chrome.runtime.lastError) {
    console.warn(chrome.runtime.lastError);
  }
});

chrome.tabs.onActivated.addListener(async ({ tabId, windowId }) => {
  await chrome.storage.local.get(key).then(async (result) => {
    if (chrome.runtime.lastError) {
      console.warn(chrome.runtime.lastError);
    }

    let lastActiveTabs = result[key];
    lastActiveTabs[windowId] = tabId;

    // console.log(66666, lastActiveTabs);

    await chrome.storage.local.set({ [key]: lastActiveTabs });
    if (chrome.runtime.lastError) {
      console.warn(chrome.runtime.lastError);
    }
  });
});

chrome.tabs.onCreated.addListener(async (tab) => {
  let lastActiveTabs: { [key: number]: number } | undefined;

  await chrome.storage.local.get(key).then((result) => {
    if (chrome.runtime.lastError) {
      console.warn(chrome.runtime.lastError);
    }

    lastActiveTabs = result[key];
  });

  if (!lastActiveTabs) return;

  let prevTabId = lastActiveTabs[tab.windowId];

  //   console.log('tab.windowId', tab.windowId);

  if (!prevTabId) return;

  let prevTab = await chrome.tabs.get(prevTabId).catch((e) => console.warn(e));
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
