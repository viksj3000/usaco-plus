(() => {
  "use strict";

  const $ = (sel, ctx) => (ctx || document).querySelector(sel);
  const el = (tag, props, ...children) => {
    const e = document.createElement(tag);
    if (props) {
      for (const [k, v] of Object.entries(props)) {
        if (k.startsWith("on") && typeof v === "function") {
          e.addEventListener(k.slice(2).toLowerCase(), v);
        } else if (k === "className") {
          e.className = v;
        } else {
          e[k] = v;
        }
      }
    }
    for (const child of children) {
      if (typeof child === "string") {
        e.appendChild(document.createTextNode(child));
      } else if (child) {
        e.appendChild(child);
      }
    }
    return e;
  };

  const SETTINGS = [
    { title: "Dark Theme", id: "darkTheme", type: "toggle" },
    { title: "Custom Style", id: "customStyle", type: "toggle" },
    { title: "Test Data buttons", id: "testData", type: "toggle" },
    { title: "Solution viewer", id: "editorial", type: "toggle" },
    { title: "Problem Tracker", id: "tracker", type: "toggle" }
  ];

  const SHORTCUTS = [
    { title: "Toggle Dark Mode", id: "darkTheme" },
    { title: "Mark as Solved", id: "markSolved" },
    { title: "Submit File", id: "submit" }
  ];

  const DEFAULTS = {
    darkTheme: false,
    customStyle: true,
    testData: true,
    editorial: true,
    tracker: true,
    shortcuts: {
      darkTheme: "Ctrl+D",
      markSolved: "Ctrl+Shift+S",
      submit: "Ctrl+S"
    }
  };

  let config = Object.assign({}, DEFAULTS);

  function createToggle(setting) {
    const input = el("input", {
      type: "checkbox",
      id: "setting-" + setting.id,
      checked: !!config[setting.id],
      onChange: (e) => {
        config[setting.id] = e.target.checked;
        saveConfig();
        propagateChange(setting.id, e.target.checked);
        if (setting.id === "darkTheme") {
          document.body.classList.toggle("dark", e.target.checked);
        }
      }
    });
    const slider = el("span", { className: "switch" });
    return el("label", { className: "toggle" }, setting.title, input, slider);
  }

  function createShortcutInput(shortcut) {
    const input = el("input", {
      className: "shortcut-input",
      type: "text",
      value: config.shortcuts?.[shortcut.id] || "",
      onKeyDown: (e) => {
        e.preventDefault();
        const parts = [];
        if (e.metaKey) parts.push("Meta");
        if (e.ctrlKey) parts.push("Ctrl");
        if (e.altKey) parts.push("Alt");
        if (e.shiftKey) parts.push("Shift");
        const key = e.key === " " ? "Space" : e.key;
        if (!["Control", "Shift", "Alt", "Meta"].includes(e.key)) {
          parts.push(key);
        }
        if (parts.length > 0) {
          const combo = parts.join("+");
          input.value = combo;
          if (!config.shortcuts) config.shortcuts = {};
          config.shortcuts[shortcut.id] = combo;
          saveConfig();
          propagateChange("shortcuts", config.shortcuts);
        }
      }
    });
    return el("label", {}, shortcut.title, input);
  }

  function saveConfig() {
    browser.storage.sync.set({ usacoPlus: config });
  }

  function propagateChange(key, value) {
    browser.runtime.sendMessage({
      type: "propagate config",
      to: "bg",
      key: key,
      value: value
    });
  }

  async function init() {
    const stored = await browser.storage.sync.get("usacoPlus");
    config = Object.assign({}, DEFAULTS, stored.usacoPlus || {});
    if (!config.shortcuts) config.shortcuts = DEFAULTS.shortcuts;

    if (config.darkTheme) {
      document.body.classList.add("dark");
    }

    const settingsContainer = $("#settings-list");
    for (const setting of SETTINGS) {
      settingsContainer.appendChild(createToggle(setting));
    }

    const shortcutsContainer = $("#shortcuts-list");
    for (const shortcut of SHORTCUTS) {
      shortcutsContainer.appendChild(createShortcutInput(shortcut));
    }
  }

  init();
})();
