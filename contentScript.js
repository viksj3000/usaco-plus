function postResult(id, result) {
  window.postMessage(
    { type: 'bg result', id: id, result: result, to: 'is' },
    window.origin
  );
}

function postError(id, error) {
  window.postMessage(
    { type: 'error', id: id, error: error, to: 'is' },
    window.origin
  );
}

// Forward a message to the page (index.js)
function sendToPage(msg) {
  window.postMessage(msg, window.origin);
}

// Listen for messages from the page script (index.js)
window.addEventListener('message', event => {
  if (event.origin !== window.origin || event.data.to !== 'cs') return;

  const id = event.data.id;

  if (event.data.type === 'get storage') {
    browser.storage.sync.get([event.data.key])
      .then(result => postResult(id, result))
      .catch(err => postError(id, err));
  } else if (event.data.type === 'set storage') {
    browser.storage.sync.set({ [event.data.key]: event.data.value })
      .then(result => postResult(id, result))
      .catch(err => postError(id, err));
  } else if (event.data.type === 'propagate config') {
    // Read current config, merge the change, save, then broadcast
    browser.storage.sync.get('usacoPlus').then(stored => {
      const config = Object.assign({}, stored.usacoPlus || {});
      config[event.data.key] = event.data.value;
      return browser.storage.sync.set({ usacoPlus: config });
    }).then(() => {
      browser.runtime.sendMessage({
        type: 'propagate config',
        to: 'bg',
        key: event.data.key,
        value: event.data.value
      });
    });
  } else {
    // Forward other messages to background
    const msg = Object.assign({}, event.data, { to: 'bg' });
    browser.runtime.sendMessage(msg).then(result => {
      sendToPage(result);
    });
  }
});

// Listen for messages from background and forward to page
browser.runtime.onMessage.addListener(msg => {
  sendToPage(msg);
});

// Inject index.js into the page context
let script = document.createElement('script');
script.src = browser.runtime.getURL('index.js');
script.id = 'usaco-plus';
(document.body || document.head || document.documentElement).appendChild(script);
script.remove();
