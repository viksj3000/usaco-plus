importScripts('browser-polyfill.min.js');

browser.runtime.onMessage.addListener(msg => {
  if (msg.to !== 'bg') return false;

  if (msg.type === 'propagate config') {
    browser.tabs.query({ url: '*://usaco.org/*' }).then(tabs => {
      tabs.forEach(tab => {
        browser.tabs.sendMessage(tab.id, {
          type: 'config change',
          to: 'is',
          key: msg.key,
          value: msg.value
        });
      });
    });
    return Promise.resolve({ id: msg.id, to: 'is', type: 'bg result' });
  }
});
