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

chrome.runtime.onInstalled.addListener(async function () {
  await savetActiveTabs();
});

const startupTimeFreezeKey = 'startupTimeFreeze';

chrome.runtime.onStartup.addListener(async function () {
  await chrome.storage.local.clear();

  // freeze extension for 2 seconds on startup to avoid adding all tabs from previous session
  // to the last tab group
  await setFreezeDeadline();
});

chrome.tabs.onActivated.addListener(async ({ tabId, windowId }) => {
  await chrome.storage.local.set({ [windowId]: tabId });
  if (chrome.runtime.lastError) console.warn(chrome.runtime.lastError);
});

// Delete all items from storage to avoid memory leak, and fill active tabs again
chrome.windows.onRemoved.addListener(async () => {
  await chrome.storage.local.clear();
  await savetActiveTabs();
});

// set freeze deadline for 2 seconds
async function setFreezeDeadline() {
  let freezeUntil = new Date();
  freezeUntil.setSeconds(freezeUntil.getSeconds() + 2);

  await chrome.storage.local.set({
    [startupTimeFreezeKey]: freezeUntil.getTime(),
  });
  if (chrome.runtime.lastError) console.warn(chrome.runtime.lastError);
}

// check if freeze is active
async function isFrozen() {
  let isFrozen = false;
  await chrome.storage.local.get(startupTimeFreezeKey).then(async (result) => {
    if (chrome.runtime.lastError) console.warn(chrome.runtime.lastError);

    let ms = result[startupTimeFreezeKey];
    if (ms && ms > 0) {
      if (new Date() < new Date(ms)) {
        isFrozen = true;
      }
    }
  });

  return isFrozen;
}

chrome.tabs.onCreated.addListener(async (tab) => {
  await chrome.storage.local
    .get(tab.windowId.toString())
    .then(async (result) => {
      if (chrome.runtime.lastError) console.warn(chrome.runtime.lastError);

      if (await isFrozen()) {
        return;
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
