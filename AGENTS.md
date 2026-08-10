You are developing view file, an html file.

The file will be uploaded into a platform, and the html will kind of navigate between views

Once uploaded, the view will have this kind of URL
https://d2-standards-bank.taskern.com/services-preview/ccp5-dishing-control-8702b962?view=pv-kfdqqx

the view id is pv-kfdqqx in this case, from the query

in the JS section of the file, there will be a preview object

and if user asks for you to apply a redirect function, when they pass a link, please pass the view id to the preview go

here are some things to pay attention:

1. if preview is not in the window, please add it to the window, window.preview = preview
2. If you want any function which directly accessed in the html, then the js should also attach the function into the window,
   window.functionName = functionName
3. Pay attention to the default styling colors, use the colors when developing the view
4. When the html contain styling and js in the same file, please split it out into its own files, 'style.css' and 'script.js'
5. Put these lines in the top of the JS file, if it not available

```js
const _SVC = (() => {
  const p = location.pathname.split("/");
  return p[1] === "services-preview" ? p[2] : "";
})();

// ── Data store ──────────────────────────────────────────────────────
const store = {
  save: (collection, data) =>
    fetch(`/api/public/preview-store/${_SVC}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ collection, data }),
    }).then((r) => r.json()),
  list: (collection) =>
    fetch(`/api/public/preview-store/${_SVC}?collection=${collection}`, {
      cache: "no-store",
    }).then((r) => r.json()),
  records: (collection) =>
    fetch(
      `/api/public/preview-store/${_SVC}?collection=${collection}&mode=all`,
      { cache: "no-store" },
    ).then((r) => r.json()),
  get: (collection, key) =>
    fetch(
      `/api/public/preview-store/${_SVC}?collection=${collection}&key=${encodeURIComponent(key)}`,
      { cache: "no-store" },
    ).then((r) => (r.ok ? r.json() : null)),
  set: (collection, key, data) =>
    fetch(`/api/public/preview-store/${_SVC}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ collection, key, data }),
    }).then((r) => r.json()),
  del: (id) =>
    fetch(`/api/public/preview-store/${_SVC}?id=${id}`, { method: "DELETE" }),
};

// ── Cross-preview navigation ────────────────────────────────────────
var preview = {
  serviceId: _SVC,
  params: new URLSearchParams(location.search),
  currentViewId() {
    return this.params.get("view") || "";
  },
  recordId() {
    return this.params.get("record") || this.params.get("id") || "";
  },
  recordKey(record) {
    return record?.slotKey || record?.data?.id || record?.id || "";
  },
  async loadSubmission(recordId = this.recordId()) {
    if (!recordId) return null;
    const direct = await store.get("submissions", recordId);
    if (direct?.record) return direct.record;
    const { records = [] } = await store.records("submissions");
    return (
      records.find(
        (r) =>
          r.slotKey === recordId ||
          r.id === recordId ||
          r.data?.id === recordId,
      ) || null
    );
  },
  go(viewId, extra = {}) {
    const next = new URLSearchParams();
    next.set("view", viewId);
    for (const [k, v] of Object.entries(extra)) {
      if (v == null || v === "") next.delete(k);
      else next.set(k, String(v));
    }
    location.href = `/services-preview/${this.serviceId}?${next.toString()}`;
  },
  openRecord(viewId, recordId) {
    this.go(viewId, { record: recordId });
  },
  backTo(viewId) {
    this.go(viewId, { record: null, id: null });
  },
  _embedQueue: Promise.resolve(),
  embed: function (viewId, target, props) {
    if (props === undefined) props = {};
    var self = this;
    var run = async function () {
      var el =
        typeof target === "string" ? document.querySelector(target) : target;
      if (!el) {
        console.error("[preview.embed] target not found:", target);
        return null;
      }
      var colon = viewId.indexOf(":");
      var svcId, vid;
      if (colon !== -1) {
        svcId = viewId.slice(0, colon);
        vid = viewId.slice(colon + 1);
      } else {
        svcId = self.serviceId;
        vid = viewId;
      }
      var src = "/services-preview/" + svcId + "/component/" + vid + ".js";
      var embedKey = svcId + ":" + vid;
      var script = document.querySelector(
        'script[data-embed="' + embedKey + '"]',
      );
      var tag = script && script.dataset.tag ? script.dataset.tag : null;
      if (!tag) {
        if (script && !script.dataset.tag) {
          script.remove();
          script = null;
        }
        var captured = null;
        var origDefine = customElements.define.bind(customElements);
        customElements.define = function (name, ctor, opts) {
          if (!captured && typeof name === "string" && name.indexOf("-") !== -1)
            captured = name;
          return origDefine(name, ctor, opts);
        };
        try {
          script = document.createElement("script");
          script.type = "module";
          script.src = src;
          script.dataset.embed = embedKey;
          await new Promise(function (res, rej) {
            script.onload = function () {
              res();
            };
            script.onerror = function () {
              rej(new Error("failed to load " + src));
            };
            document.head.appendChild(script);
          });
          for (
            var i = 0;
            i < 40 && !captured && !window.__previewElementName;
            i++
          ) {
            await new Promise(function (r) {
              setTimeout(r, 25);
            });
          }
        } finally {
          customElements.define = origDefine;
        }
        tag = captured || window.__previewElementName || null;
      }
      if (!tag) {
        console.error("[preview.embed] component defined no element:", vid);
        return null;
      }
      script.dataset.tag = tag;
      await customElements.whenDefined(tag);
      var node = document.createElement(tag);
      for (var k in props) {
        if (!Object.prototype.hasOwnProperty.call(props, k)) continue;
        var v = props[k];
        try {
          node[k] = v;
        } catch (e) {}
        if (v != null && typeof v !== "object") node.setAttribute(k, String(v));
      }
      el.replaceChildren(node);
      return node;
    };
    var next = this._embedQueue.then(run, run);
    this._embedQueue = next.catch(function () {});
    return next;
  },
};
```

6. Here is the default styling color

```css
:root {
  --bg-page: #0f193c;
  --bg-surface: #162044;
  --bg-surface-hover: #1c2a54;
  --border: #243264;
  --border-hover: #2e3f7a;
  --text-primary: #f0f2f8;
  --text-secondary: #8892b0;
  --accent: #6366f1;
  --accent-hover: #818cf8;
  --accent-contrast: #f0f2f8;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  background: var(--bg-page);
  color: var(--text-secondary);
  font-family:
    -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  line-height: 1.6;
}
```

```

```
