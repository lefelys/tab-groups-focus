// last active tabs by window ids

const key = 'activeTabs';

// On extension load - fill lastActiveTabs
function getActiveTabs(): {} {
  let lastActiveTabs: { [key: string]: number } = {};

  chrome.tabs.query({ active: true }, (tabs) => {
    tabs.forEach((tab) => {
      if (tab.id !== undefined) {
        lastActiveTabs[tab.windowId.toString()] = tab.id;
      }
    });
  });

  return lastActiveTabs;
}

console.log('getActiveTabs', getActiveTabs()); // 538139414 : 538139810
console.log('stringify', JSON.stringify(getActiveTabs())); // {}
console.log('stringify', JSON.stringify({ a: 'a' })); // {}
console.log('!stringify', getActiveTabs()); // 538139414 : 538139810

chrome.storage.local
  .set({ activeTabs: JSON.stringify(getActiveTabs()) })
  .then(() => {
    //   console.log('Value is set to ', key, lastActiveTabs);
  });
if (chrome.runtime.lastError) {
  console.warn(chrome.runtime.lastError);
}

chrome.storage.local.get().then((items) => {
  // Copy the data retrieved from storage into storageCache.
  console.log(items);
});

chrome.storage.local.get(['activeTabs']).then((result) => {
  console.log('Value currently is', result);
});

chrome.tabs.onActivated.addListener(({ tabId, windowId }) => {
  chrome.storage.local.get(['activeTabs'], (lastActiveTabs) => {
    console.log(123, key, lastActiveTabs);

    if (chrome.runtime.lastError) {
      console.warn(chrome.runtime.lastError);
    }

    lastActiveTabs[windowId] = tabId;

    chrome.storage.local.set({ activeTabs: lastActiveTabs });

    if (chrome.runtime.lastError) {
      console.warn(chrome.runtime.lastError);
    }
  });
});

chrome.tabs.onCreated.addListener(async (tab) => {
  let lastActiveTabs: { [key: number]: number } | undefined;

  chrome.storage.local.get(['activeTabs'], (result) => {
    if (chrome.runtime.lastError) {
      console.warn(chrome.runtime.lastError);
    }

    // console.log(result);
    lastActiveTabs = result;
  });

  if (!lastActiveTabs) return;

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

  chrome.tabs
    .group({
      groupId: prevGroupId,
      tabIds: tab.id,
    })
    .catch((e) => console.warn(e));
});
