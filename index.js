(() => {
  "use strict";

  // ============================================================
  // DOM Utilities
  // ============================================================
  const $ = (sel, ctx) => (ctx || document).querySelector(sel);
  const $$ = (sel, ctx) => [...(ctx || document).querySelectorAll(sel)];
  const on = (el, evt, fn, opts) => el.addEventListener(evt, fn, opts || {});

  function el(tag, props, ...children) {
    const e = document.createElement(tag);
    if (props) {
      for (const [k, v] of Object.entries(props)) {
        if (k.startsWith("data-")) {
          e.setAttribute(k, v);
        } else if (k.startsWith("on") && typeof v === "function") {
          e.addEventListener(k.slice(2).toLowerCase(), v);
        } else if (k === "className") {
          e.className = v;
        } else if (k === "innerHTML") {
          e.innerHTML = v;
        } else {
          e[k] = v;
        }
      }
    }
    for (const child of children) {
      if (typeof child === "string") {
        e.appendChild(document.createTextNode(child));
      } else if (child instanceof Array) {
        e.append(...child);
      } else if (child) {
        e.appendChild(child);
      }
    }
    return e;
  }

  // ============================================================
  // Config System
  // ============================================================
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

  let config = {};
  const listeners = {};

  function setConfig(key, value) {
    config[key] = value;
    localStorage.setItem("usacoPlus", JSON.stringify(config));
    fireListeners(key, value);
    propagateConfig(key, value);
  }

  function toggleConfig(key) {
    setConfig(key, !config[key]);
  }

  function onConfigChange(key, fn) {
    if (!listeners[key]) listeners[key] = [];
    listeners[key].push(fn);
  }

  function fireListeners(key, value) {
    (listeners[key] || []).forEach(fn => fn(value));
  }

  function propagateConfig(key, value) {
    window.postMessage({
      type: "propagate config",
      to: "cs",
      key: key,
      value: value
    }, window.origin);
  }

  // Sync config from storage on load
  function syncConfig() {
    return new Promise(resolve => {
      window.postMessage(
        { type: "get storage", to: "cs", id: "init", key: "usacoPlus" },
        window.origin
      );
      const handler = event => {
        if (event.data.type === "bg result" && event.data.id === "init") {
          window.removeEventListener("message", handler);
          const stored = event.data.result?.usacoPlus;
          config = Object.assign({}, DEFAULTS, stored || {});
          if (!config.shortcuts) config.shortcuts = DEFAULTS.shortcuts;
          fireListeners("__loaded__", config);
          resolve(config);
        }
      };
      window.addEventListener("message", handler);
    });
  }

  // Listen for config changes from background
  window.addEventListener("message", event => {
    if (event.data.to !== "is") return;
    if (event.data.type === "config change") {
      config[event.data.key] = event.data.value;
      fireListeners(event.data.key, event.data.value);
    }
  });

  // ============================================================
  // Helper: Parse current USACO page context
  // ============================================================
  function getPageContext() {
    const params = new URLSearchParams(window.location.search);
    const page = params.get("page") || "";

    return {
      url: window.location.href,
      page,
      isHome: !page || page === "",
      isProblem: page.startsWith("viewproblem2"),
      cpid: params.get("cpid")
    };
  }

  // ============================================================
  // Module: Dark Theme — injects CSS AFTER page loads
  // to override USACO's own stylesheet rules
  // ============================================================
  const DarkTheme = {
    styleEl: null,

    DARK_CSS: `
      /* Late-injected dark mode — overrides USACO's own CSS */
      html.usaco-plus-dark, html.usaco-plus-dark body {
        background: #1a1a1a !important;
        color: #d4d4d4 !important;
      }
      html.usaco-plus-dark .shadow1,
      html.usaco-plus-dark .shadow1 .content,
      html.usaco-plus-dark .panel,
      html.usaco-plus-dark .panel[style*="background"],
      html.usaco-plus-dark .sponsors {
        background-color: #1a1a1a !important;
        color: #d4d4d4 !important;
        border-color: #333 !important;
      }
      html.usaco-plus-dark p, html.usaco-plus-dark h1,
      html.usaco-plus-dark h2, html.usaco-plus-dark h3,
      html.usaco-plus-dark h4, html.usaco-plus-dark li,
      html.usaco-plus-dark span, html.usaco-plus-dark div,
      html.usaco-plus-dark td, html.usaco-plus-dark th,
      html.usaco-plus-dark label, html.usaco-plus-dark pre,
      html.usaco-plus-dark code, html.usaco-plus-dark b,
      html.usaco-plus-dark strong, html.usaco-plus-dark em,
      html.usaco-plus-dark i {
        color: #d4d4d4 !important;
        background-color: transparent !important;
      }
      html.usaco-plus-dark h1, html.usaco-plus-dark h2,
      html.usaco-plus-dark h3, html.usaco-plus-dark h4 {
        color: #e8e8e8 !important;
      }
      html.usaco-plus-dark a, html.usaco-plus-dark a:link,
      html.usaco-plus-dark a:visited { color: #6ba3f7 !important; }
      html.usaco-plus-dark a:hover { color: #89b4fa !important; }
      html.usaco-plus-dark .navbar,
      html.usaco-plus-dark .navbar ul {
        background-color: #1a1a1a !important;
      }
      html.usaco-plus-dark .navbar li { background-color: transparent !important; }
      html.usaco-plus-dark .navbar li a {
        background-color: #252525 !important;
        color: #d4d4d4 !important;
      }
      html.usaco-plus-dark .navbar li a:hover {
        background-color: #333 !important;
        color: #6ba3f7 !important;
      }
      /* PROBLEM TEXT — the main white offender */
      html.usaco-plus-dark .problem-text {
        background: #1a1a1a !important;
        border-color: #333 !important;
      }
      html.usaco-plus-dark .problem-text * {
        background-color: #1a1a1a !important;
        color: #d4d4d4 !important;
      }
      html.usaco-plus-dark .prob-in-spec,
      html.usaco-plus-dark .prob-out-spec,
      html.usaco-plus-dark .prob-section {
        background-color: #1a1a1a !important;
        color: #d4d4d4 !important;
      }
      html.usaco-plus-dark #probtext-text,
      html.usaco-plus-dark .mathjax,
      html.usaco-plus-dark span.mathjax {
        background-color: #1a1a1a !important;
        color: #d4d4d4 !important;
      }
      /* STATUS BAR — inline white */
      html.usaco-plus-dark #last-status {
        background-color: #1a1a1a !important;
        color: #d4d4d4 !important;
        border-color: #333 !important;
      }
      /* LANGUAGE SELECTOR — inline gray */
      html.usaco-plus-dark #choose-language {
        background-color: #1a1a1a !important;
        color: #d4d4d4 !important;
        border-color: #333 !important;
      }
      /* ALL BUTTONS */
      html.usaco-plus-dark button,
      html.usaco-plus-dark button[type="button"],
      html.usaco-plus-dark input[type="submit"],
      html.usaco-plus-dark input[type="button"] {
        background-color: #2a2a2a !important;
        color: #d4d4d4 !important;
        border-color: #444 !important;
      }
      html.usaco-plus-dark button:hover,
      html.usaco-plus-dark input[type="submit"]:hover {
        background-color: #333 !important;
      }
      /* CODE BLOCKS */
      html.usaco-plus-dark pre.in,
      html.usaco-plus-dark pre.out,
      html.usaco-plus-dark pre,
      html.usaco-plus-dark code,
      html.usaco-plus-dark .mono {
        background-color: #111 !important;
        color: #d4d4d4 !important;
        border-color: #333 !important;
      }
      /* FORM INPUTS */
      html.usaco-plus-dark input,
      html.usaco-plus-dark select,
      html.usaco-plus-dark textarea {
        background-color: #1a1a1a !important;
        color: #d4d4d4 !important;
        border-color: #333 !important;
      }
      /* TABLES */
      html.usaco-plus-dark table,
      html.usaco-plus-dark thead,
      html.usaco-plus-dark tbody,
      html.usaco-plus-dark tfoot,
      html.usaco-plus-dark tr,
      html.usaco-plus-dark td,
      html.usaco-plus-dark th {
        background-color: #1a1a1a !important;
        color: #d4d4d4 !important;
        border-color: #333 !important;
      }
      /* STATUS TEXT */
      html.usaco-plus-dark .status-yes { color: #a0f0a0 !important; }
      html.usaco-plus-dark .status-no { color: #f0a0a0 !important; }
      /* FORM ELEMENTS */
      html.usaco-plus-dark .field,
      html.usaco-plus-dark .field label {
        color: #d4d4d4 !important;
        background-color: transparent !important;
      }
      html.usaco-plus-dark .forgotpass { color: #d4d4d4 !important; }
      html.usaco-plus-dark .form_error { color: #f0a0a0 !important; }
      html.usaco-plus-dark .inline-block,
      html.usaco-plus-dark .inline-block * {
        background-color: transparent !important;
        color: #d4d4d4 !important;
      }
      html.usaco-plus-dark .tooltip {
        background-color: #1a1a1a !important;
        color: #d4d4d4 !important;
      }
      /* Invert ONLY the USACO logo */
      html.usaco-plus-dark img[src*="usaco_logo"] {
        filter: invert(1) hue-rotate(180deg) !important;
      }
      /* Scrollbar */
      html.usaco-plus-dark ::-webkit-scrollbar { width: 8px; }
      html.usaco-plus-dark ::-webkit-scrollbar-track { background: #1a1a1a; }
      html.usaco-plus-dark ::-webkit-scrollbar-thumb { background: #333; border-radius: 4px; }
      html.usaco-plus-dark ::-webkit-scrollbar-thumb:hover { background: #444; }
      html.usaco-plus-dark ::selection { background: #333; color: #e8e8e8; }
    `,

    install() {
      const apply = (val) => {
        document.documentElement.classList.toggle("usaco-plus-dark", val);
        if (val) this.injectLateStyle();
        else this.removeLateStyle();
      };
      onConfigChange("darkTheme", apply);
      // Apply immediately — don't wait for DOMContentLoaded
      if (config.darkTheme) {
        apply(true);
      }
    },

    injectLateStyle() {
      if (this.styleEl) return;
      this.styleEl = document.createElement("style");
      this.styleEl.id = "usaco-plus-dark-late";
      this.styleEl.textContent = this.DARK_CSS;
      (document.body || document.head || document.documentElement).appendChild(this.styleEl);
    },

    removeLateStyle() {
      if (this.styleEl) {
        this.styleEl.remove();
        this.styleEl = null;
      }
    }
  };

  // ============================================================
  // Module: Custom Style (beautiful theme)
  // ============================================================
  const CustomStyle = {
    install() {
      const apply = (val) => {
        document.documentElement.classList.toggle("usaco-plus-theme", val);
      };
      onConfigChange("customStyle", apply);
      if (config.customStyle !== false) apply(true);
    }
  };

  // ============================================================
  // Module: Test Data Quick Download
  // ============================================================
  const TestData = {
    install() {
      onConfigChange("testData", val => {
        if (val) this.addButton();
        else this.removeButton();
      });
      // Add button immediately — don't wait for DOMContentLoaded
      if (config.testData !== false) this.addButton();
    },

    addButton() {
      const ctx = getPageContext();
      if (!ctx.isProblem) return;
      if ($(".usaco-plus-testdata-btn")) return;

      const header = $("h2");
      if (!header) return;

      // Find test data link on the page
      const links = $$("a");
      let testDataUrl = null;
      for (const link of links) {
        const href = link.href || "";
        if (href.includes(".zip") && (href.includes("data/prob") || href.includes("test_data"))) {
          testDataUrl = href;
          break;
        }
      }

      const btnGroup = el("div", { className: "usaco-plus-btn-group" });

      if (testDataUrl) {
        btnGroup.appendChild(el("a", {
          href: testDataUrl,
          className: "usaco-plus-btn usaco-plus-testdata-btn",
          target: "_blank"
        }, "📥 Download Test Data"));
      } else {
        btnGroup.appendChild(el("span", {
          className: "usaco-plus-btn usaco-plus-testdata-btn",
          style: "opacity: 0.5; cursor: default;"
        }, "📥 Test data not available"));
      }

      header.parentNode.insertBefore(btnGroup, header.nextSibling);
    },

    removeButton() {
      const btn = $(".usaco-plus-testdata-btn");
      if (btn) btn.closest(".usaco-plus-btn-group")?.remove();
    }
  };

  // ============================================================
  // Module: Editorial/Solution Viewer
  // ============================================================
  const Editorial = {
    modal: null,

    install() {
      // Add link immediately — don't wait for DOMContentLoaded
      this.addLink();
    },

    addLink() {
      const ctx = getPageContext();
      if (!ctx.isProblem) return;
      if ($(".usaco-plus-editorial-link")) return;

      // Find solution link on the page
      const links = $$("a");
      let solutionUrl = null;
      for (const link of links) {
        const href = link.href || "";
        if (href.includes("sol_prob") && href.includes(".html")) {
          solutionUrl = href;
          break;
        }
      }

      if (!solutionUrl) return;

      const header = $("h2");
      if (!header) return;

      const btnGroup = header.parentNode.querySelector(".usaco-plus-btn-group")
        || el("div", { className: "usaco-plus-btn-group" });
      if (!btnGroup.parentNode) {
        header.parentNode.insertBefore(btnGroup, header.nextSibling);
      }

      btnGroup.appendChild(el("a", {
        href: "#",
        className: "usaco-plus-btn usaco-plus-editorial-link",
        onClick: (e) => {
          e.preventDefault();
          this.showModal(solutionUrl);
        }
      }, "📖 View Solution"));
    },

    showModal(url) {
      if (this.modal) this.modal.remove();

      this.modal = el("div", { className: "usaco-plus-modal" },
        el("div", { className: "usaco-plus-modal-bg", onClick: () => this.modal.remove() }),
        el("div", { className: "usaco-plus-modal-inner usaco-plus-modal-wide" },
          el("div", { className: "usaco-plus-modal-header" },
            el("span", { className: "usaco-plus-modal-title" }, "Solution / Editorial"),
            el("button", {
              className: "usaco-plus-modal-close",
              onClick: () => this.modal.remove()
            }, "×")
          ),
          el("div", { className: "usaco-plus-modal-body", innerHTML: "<p>Loading solution...</p>" })
        )
      );

      document.body.appendChild(this.modal);

      fetch(url)
        .then(r => r.text())
        .then(html => {
          const body = this.modal.querySelector(".usaco-plus-modal-body");
          body.innerHTML = html;
        })
        .catch(err => {
          const body = this.modal.querySelector(".usaco-plus-modal-body");
          body.innerHTML = `<p style="color:#c9d1d9;">Error loading solution: ${err.message}</p>`;
        });
    }
  };

  // ============================================================
  // Module: Problem Tracker
  // ============================================================
  const Tracker = {
    solved: new Set(),

    install() {
      // Add button immediately — don't wait for DOMContentLoaded
      this.addButton();
      // Load solved list from storage
      this.loadSolved();
    },

    loadSolved() {
      window.postMessage(
        { type: "get storage", to: "cs", id: "tracker-load", key: "solvedProblems" },
        window.origin
      );
      const handler = event => {
        if (event.data.type === "bg result" && event.data.id === "tracker-load") {
          window.removeEventListener("message", handler);
          const arr = event.data.result?.solvedProblems || [];
          this.solved = new Set(arr);
          this.updateButton();
        }
      };
      window.addEventListener("message", handler);
    },

    saveSolved() {
      window.postMessage({
        type: "set storage",
        to: "cs",
        key: "solvedProblems",
        value: [...this.solved]
      }, window.origin);
    },

    addButton() {
      const ctx = getPageContext();
      if (!ctx.isProblem || !ctx.cpid) return;
      if ($(".usaco-plus-tracker-btn")) return;

      const header = $("h2");
      if (!header) return;

      const btnGroup = header.parentNode.querySelector(".usaco-plus-btn-group")
        || el("div", { className: "usaco-plus-btn-group" });
      if (!btnGroup.parentNode) {
        header.parentNode.insertBefore(btnGroup, header.nextSibling);
      }

      const isSolved = this.solved.has(ctx.cpid);
      const btn = el("button", {
        className: `usaco-plus-btn usaco-plus-tracker-btn ${isSolved ? "solved" : ""}`,
        onClick: () => this.toggle(ctx.cpid)
      }, isSolved ? "✅ Solved" : "☐ Mark as Solved");

      btnGroup.appendChild(btn);
    },

    updateButton() {
      const ctx = getPageContext();
      if (!ctx.isProblem || !ctx.cpid) return;
      const btn = $(".usaco-plus-tracker-btn");
      if (!btn) return;

      const isSolved = this.solved.has(ctx.cpid);
      btn.textContent = isSolved ? "✅ Solved" : "☐ Mark as Solved";
      btn.classList.toggle("solved", isSolved);
    },

    toggle(cpid) {
      if (this.solved.has(cpid)) {
        this.solved.delete(cpid);
      } else {
        this.solved.add(cpid);
      }
      this.saveSolved();
      this.updateButton();
    }
  };

  // ============================================================
  // Module: Submit Shortcut (Ctrl+S on problem pages)
  // Only fires when EXACTLY Ctrl+S (no Shift, no Alt)
  // ============================================================
  const SubmitShortcut = {
    install() {
      on(document, "keydown", e => {
        // Only Ctrl+S / Cmd+S — NOT Ctrl+Shift+S
        if ((e.key === "s" || e.key === "S")
            && (e.ctrlKey || e.metaKey)
            && !e.shiftKey
            && !e.altKey) {
          const ctx = getPageContext();
          if (!ctx.isProblem) return;

          e.preventDefault();
          e.stopPropagation();

          // Find the file input in the submission form
          const fileInput = $('input[type="file"]');
          if (fileInput) {
            fileInput.click();

            // After file is selected, auto-focus the submit button
            const onChange = () => {
              fileInput.removeEventListener("change", onChange);
              setTimeout(() => {
                const submitBtn = $('#last-status input[type="submit"]')
                  || $('#last-status button[type="submit"]')
                  || $('input[type="submit"]');
                if (submitBtn) submitBtn.focus();
              }, 200);
            };
            fileInput.addEventListener("change", onChange);
          }
        }
      });
    }
  };

  // ============================================================
  // Module: Keyboard Shortcuts
  // ============================================================
  const Shortcuts = {
    install() {
      on(document, "keydown", e => {
        const tag = e.target.tagName;
        const isInput = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT"
          || e.target.isContentEditable;
        if (isInput) return;

        const sc = config.shortcuts || {};

        if (this.matches(e, sc.darkTheme)) {
          e.preventDefault();
          toggleConfig("darkTheme");
        } else if (this.matches(e, sc.markSolved)) {
          e.preventDefault();
          const ctx = getPageContext();
          if (ctx.cpid) Tracker.toggle(ctx.cpid);
        }
      });
    },

    matches(event, combo) {
      if (!combo) return false;
      const parts = combo.split("+");
      const key = parts.pop();
      const ctrl = parts.includes("Ctrl");
      const shift = parts.includes("Shift");
      const alt = parts.includes("Alt");
      const meta = parts.includes("Meta");

      return event.key.toLowerCase() === key.toLowerCase()
        && event.ctrlKey === ctrl
        && event.shiftKey === shift
        && event.altKey === alt
        && event.metaKey === meta;
    }
  };

  // ============================================================
  // Initialize
  // ============================================================
  syncConfig().then(() => {
    DarkTheme.install();
    CustomStyle.install();
    TestData.install();
    Editorial.install();
    Tracker.install();
    SubmitShortcut.install();
    Shortcuts.install();
  });

})();
