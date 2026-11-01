(function () {
  "use strict";
  var PAGE = 48;
  var state = {
    index: null, cat: null, raw: [], view: [], shown: 0,
    sub: "all", grp: "all", variant: "1", q: "", sort: "name",
    global: false, cache: {}, cur: -1, started: false
  };

  function $(id) { return document.getElementById(id); }
  // ── 中文搜索：把中文词切成英文关键词组（每组内 OR，组间 AND）──
  var ZH = (window.DR_ZH_MAP || {});
  var ZH_KEYS = Object.keys(ZH).sort(function (a, b) { return b.length - a.length; });
  var ZH_MAX = ZH_KEYS.length ? ZH_KEYS[0].length : 1;

  function hasHan(s) { return /[\u4e00-\u9fa5]/.test(s); }

  function segmentZh(text) {
    var groups = [], used = [];
    var i = 0;
    while (i < text.length) {
      var hit = null;
      for (var len = Math.min(ZH_MAX, text.length - i); len >= 1; len--) {
        var cand = text.substr(i, len);
        if (ZH[cand]) { hit = cand; break; }
      }
      if (hit) {
        var toks = ZH[hit].split(/\s+/).filter(Boolean);
        if (toks.length) {
          groups.push(toks);
          used.push(hit + " → " + toks.join(" / "));
        } else {
          used.push(hit + "（已忽略）");
        }
        i += hit.length;
      } else {
        i += 1;
      }
    }
    return { groups: groups, used: used };
  }

  // 返回 { groups, translated } —— 每个 group 是一个"必须命中其一"的关键词数组
  function buildQuery(raw) {
    var q = String(raw || "").trim().toLowerCase();
    var groups = [], translated = [];
    if (!q) return { groups: groups, translated: translated };
    q.split(/\s+/).forEach(function (tok) {
      if (!tok) return;
      if (hasHan(tok)) {
        var seg = segmentZh(tok);
        for (var i = 0; i < seg.groups.length; i++) groups.push(seg.groups[i]);
        translated = translated.concat(seg.used);
      } else {
        groups.push([tok]);
      }
    });
    return { groups: groups, translated: translated };
  }

  function matchGroups(search, groups) {
    for (var g = 0; g < groups.length; g++) {
      var alts = groups[g], ok = false;
      for (var a = 0; a < alts.length; a++) {
        if (alts[a] && search.indexOf(alts[a]) >= 0) { ok = true; break; }
      }
      if (!ok) return false;
    }
    return true;
  }

  function fmtBytes(n) {
    if (!n) return "0 B";
    if (n < 1024) return n + " B";
    if (n < 1048576) return (n / 1024).toFixed(1) + " KB";
    return (n / 1048576).toFixed(2) + " MB";
  }
  function fileURL(p) {
    return "files/" + p.split("/").map(encodeURIComponent).join("/");
  }
  function baseName(p) { var a = p.split("/"); return a[a.length - 1]; }
  function loadScript(url) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement("script");
      s.src = url;
      s.onload = function () { resolve(); };
      s.onerror = function () { reject(new Error("无法加载清单 " + url)); };
      document.head.appendChild(s);
    });
  }
  function loadManifest(url, key) {
    return loadScript(url).then(function () {
      var v = window[key];
      if (!v) throw new Error("清单格式异常：" + url);
      return v;
    });
  }

  // ── 彩蛋：连点侧栏「Toby Fox」5 次 ──
  function initEgg() {
    var fox = $("tobyFox"), ov = $("egg"), audio = $("eggAudio");
    if (!fox || !ov) return;
    var hits = 0, resetTimer = null;
    fox.style.display = "inline-block";
    fox.style.cursor = "pointer";
    fox.style.transition = "transform .16s ease-out, color .16s";

    function openEgg() {
      ov.hidden = false;
      document.body.style.overflow = "hidden";
      ov.classList.remove("show");
      void ov.offsetWidth;
      ov.classList.add("show");
      var hint = $("eggHint");
      if (hint) hint.textContent = "彩蛋音效加载中…（点击任意处 / 按 Esc 关闭）";
      try {
        audio.currentTime = 0;
        var pr = audio.play();
        if (pr && pr.catch) pr.catch(function () {});
      } catch (e) {}
    }
    function closeEgg() {
      ov.hidden = true;
      ov.classList.remove("show");
      document.body.style.overflow = "";
      try { audio.pause(); } catch (e) {}
    }

    fox.addEventListener("click", function (e) {
      e.stopPropagation();
      hits++;
      var scale = 1 + hits * 0.22;
      fox.style.transform = "scale(" + scale + ")";
      fox.style.color = hits >= 3 ? "#ff2f5e" : "";
      clearTimeout(resetTimer);
      resetTimer = setTimeout(function () {
        hits = 0;
        fox.style.transform = "";
        fox.style.color = "";
      }, 2500);
      if (hits >= 5) {
        hits = 0;
        clearTimeout(resetTimer);
        fox.style.transform = "";
        fox.style.color = "";
        openEgg();
      }
    });

    audio.addEventListener("playing", function () {
      var hint = $("eggHint");
      if (hint) hint.textContent = "点击任意处 / 按 Esc 关闭";
    });
    audio.addEventListener("error", function () {
      var hint = $("eggHint");
      if (hint) hint.textContent = "音频加载失败（点击任意处 / 按 Esc 关闭）";
    });
    ov.addEventListener("click", closeEgg);
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !ov.hidden) closeEgg();
    });
  }

  function introHide() {
    var wrap = $("intro");
    if (!wrap || wrap.hidden) { introDone(); return; }
    try { $("introVid").pause(); } catch (e) {}
    wrap.classList.add("fade");
    setTimeout(function () {
      wrap.hidden = true;
      wrap.classList.remove("fade");
      document.body.style.overflow = "";
      introDone();
    }, 380);
  }

  function introSkip() {
    try { sessionStorage.setItem("dr_intro_skipped", "1"); } catch (e) {}
    introHide();
    setTimeout(introDone, 500);
  }

  // 开场池兼容两种格式：["path"] 或 [{u:path, s:size}]
  var introPool = (window.DR_INTRO && window.DR_INTRO.length ? window.DR_INTRO : ["videos/intro-04.mp4"]).map(function (v) {
    return (typeof v === "string") ? { u: v, s: 0 } : v;
  });
  var introSmallOnly = false;
  var introLastU = "";
  var introLast = -1;

  function pickIntro() {
    var slowConn = false;
    try {
      var c = navigator.connection || {};
      if (c.saveData) slowConn = true;
      if (/^(slow-)?2g$|^3g$/.test(String(c.effectiveType || ""))) slowConn = true;
    } catch (e) {}
    // GitHub Pages 或慢网：用专门压过的 640x360 webm（几十~几百 KB）
    var useSmall = introSmallOnly || STATIC_HOST || slowConn;

    var pool = introPool;
    if (useSmall) {
      var smallPool = introPool.filter(function (v) { return v.sm; }).map(function (v) {
        return { u: v.sm, s: v.sms || v.s };
      });
      if (smallPool.length) pool = smallPool;
    } else {
      var normal = introPool.filter(function (v) { return !v.sm || v.s > 0; });
      if (normal.length) pool = normal;
      else pool = introPool.map(function (v) { return { u: v.u, s: v.s }; });
    }

    var idx = Math.floor(Math.random() * pool.length);
    if (pool.length > 1 && introLast >= 0 && pool[idx].u === introLastU) idx = (idx + 1) % pool.length;
    introLast = idx;
    introLastU = pool[idx].u;
    var tip = $("introTip");
    if (tip) tip.textContent = "DELTARUNE · 开场动画 " + (idx + 1) + "/" + pool.length;
    return pool[idx].u;
  }

  var introOnDone = null;
  function introDone() {
    if (introOnDone) { var cb = introOnDone; introOnDone = null; cb(); }
  }

  function startIntro(onDone) {
    var wrap = $("intro"), vid = $("introVid");
    introOnDone = onDone || null;
    if (!wrap || !vid) { introDone(); return; }
    var skipped = false;
    try { skipped = sessionStorage.getItem("dr_intro_skipped") === "1"; } catch (e) {}
    if (skipped) { wrap.hidden = true; introDone(); return; }

    var play = function (muted) {
      vid.muted = muted;
      vid.volume = 1;
      return vid.play().then(function () { return true; }).catch(function () { return false; });
    };
    var begin = function () {
      vid.src = pickIntro();
      vid.currentTime = 0;
      // 先试着带声音自动播；被浏览器拦了再静音播，并给出"开启声音"按钮
      play(false).then(function (ok) {
        if (ok || !vid.paused) return;
        play(true).then(function (ok2) {
          if (!ok2) { introSkip(); return; }
          // 不再放按钮：静音先播，用户只要在页面上任意点一下/按键，立刻自动开声音
          var tip = $("introTip");
          if (tip) tip.textContent = tip.textContent + "（点任意处开启声音）";
          var unlock = function () {
            if (!vid.muted) return;
            vid.volume = 1;
            vid.muted = false;
            var done = function () {
              if (tip) tip.textContent = tip.textContent.replace("（点任意处开启声音）", "");
              document.removeEventListener("pointerdown", unlock, true);
              document.removeEventListener("keydown", unlock, true);
            };
            vid.play().then(done).catch(function () {
              // 仍被策略挡住：继续静音播，等下一次交互
              vid.muted = true;
              vid.play().catch(function () {});
            });
          };
          document.addEventListener("pointerdown", unlock, true);
          document.addEventListener("keydown", unlock, true);
          vid.__unlock = unlock;
        });
      });
    };

    wrap.hidden = false;
    document.body.style.overflow = "hidden";
    $("introSkip").addEventListener("click", function (e) { e.stopPropagation(); introSkip(); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !wrap.hidden) introSkip();
    });
    vid.addEventListener("ended", function () { introHide(); });

    var watchdog = setTimeout(function () {
      if (vid.paused || vid.readyState < 2) introSkip();
      else introDone();
    }, 12000);
    vid.addEventListener("playing", function () { clearTimeout(watchdog); });
    begin();

    var replay = $("replayIntro");
    if (replay) replay.addEventListener("click", function () {
      try { sessionStorage.removeItem("dr_intro_skipped"); } catch (e) {}
      wrap.hidden = false;
      document.body.style.overflow = "hidden";
      clearTimeout(watchdog);
      begin();
    });
  }

  function boot() {
    initEgg();
    startIntro(startSite);
  }

  function startSite() {
    if (state.started) return;
    state.started = true;
    loadManifest("manifest/index.js", "__DR_INDEX").then(function (idx) {
      state.index = idx;
      $("totals").textContent = idx.categories.length + " 个分类 · "
        + idx.total.files + " 个素材 · " + fmtBytes(idx.total.bytes);
      $("genAt").textContent = "索引更新 " + String(idx.generatedAt).slice(0, 10);
      renderCats();
      if (idx.categories.length) selectCat(idx.categories[0].id);
    }).catch(function (e) {
      $("grid").innerHTML = "";
      var d = document.createElement("div");
      d.className = "empty";
      d.textContent = "索引载入失败：" + e.message + "（确认 manifest 目录完整；也可以双击 启动.bat 用本地服务器打开）";
      $("grid").appendChild(d);
    });
    bindEvents();
  }

  function renderCats() {
    var box = $("cats");
    box.innerHTML = "";
    state.index.categories.forEach(function (c) {
      var b = document.createElement("button");
      b.className = "cat";
      b.type = "button";
      b.dataset.id = c.id;
      var cn = document.createElement("span");
      cn.className = "cn";
      cn.textContent = c.name;
      var cc = document.createElement("span");
      cc.className = "cc";
      cc.textContent = c.count;
      b.appendChild(cn); b.appendChild(cc);
      b.addEventListener("click", function () { selectCat(c.id); });
      box.appendChild(b);
    });
  }

  function markActiveCat(id) {
    Array.prototype.forEach.call(document.querySelectorAll(".cat"), function (el) {
      el.classList.toggle("on", el.dataset.id === id);
    });
  }

  function renderZhHint(translated, raw) {
    var el = $("zhHint");
    if (!el) return;
    if (raw && hasHan(raw) && (!translated || !translated.length)) {
      el.hidden = false;
      el.textContent = "没识别到这个中文词 —— 试试：椅子 / 教堂 / 走路 / 王后 / 特效";
      return;
    }
    if (!translated || !translated.length) { el.hidden = true; el.textContent = ""; return; }
    el.hidden = false;
    el.textContent = "智能识别：" + translated.join(" ｜ ");
  }

  function toast(text) {
    var t = document.createElement("div");
    t.className = "toast";
    t.textContent = text;
    document.body.appendChild(t);
    setTimeout(function () { t.classList.add("out"); }, 3200);
    setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 3800);
  }

  function showHint(text) {
    var grid = $("grid");
    grid.innerHTML = "";
    var d = document.createElement("div");
    d.className = "empty";
    d.textContent = text;
    grid.appendChild(d);
    $("more").hidden = true;
    $("count").textContent = "";
  }

  function subLabel(cat, id) {
    var hit = ((cat && cat.subjects) || []).filter(function (s) { return s.id === id; })[0];
    return hit && hit.zh ? hit.zh + " " + id : id;
  }

  function updateHero() {
    var zip = $("zipBtn");
    if (state.global) {
      $("catName").textContent = "全库搜索";
      $("catEn").textContent = "ALL CATEGORIES";
      $("catDesc").textContent = "在全部 " + state.index.total.files + " 张素材中按名称查找，结果会标注所属分类。";
      $("catMeta").textContent = state.q.trim() ? "关键词：" + state.q.trim() : "输入关键词开始搜索";
      $("heroStats").style.display = "none";
      zip.href = "#";
      zip.classList.add("off");
      zip.textContent = "全库模式不提供打包下载";
      $("subRow").style.display = "none";
      $("grp").parentNode.style.display = "none";
      markActiveCat(null);
      return;
    }
    var cat = state.cat;
    if (!cat) return;
    $("subRow").style.display = "";
    var seg = $("variant");
    if (seg) seg.style.display = cat.kind === "video" ? "none" : "";
    $("catName").textContent = cat.name;
    $("catEn").textContent = cat.en || "";
    $("catDesc").textContent = cat.desc || "";
    var subCount = (cat.subjects || []).filter(function (s) { return s.id; }).length;
    $("heroStats").style.display = "";
    $("statCount").textContent = cat.count;
    $("statLabel") && ($("statLabel").textContent = cat.kind === "video" ? "个视频" : "个 GIF");
    $("statSize").textContent = fmtBytes(cat.bytes);
    $("statGroups").textContent = subCount > 1 ? subCount : "—";
    $("catMeta").textContent = subCount > 1 ? "含 " + subCount + " 个角色 / 主题分组" : "统一归类";
    renderCatZip(cat);
    markActiveCat(cat.id);
  }

  // 本分类打包：按 26MB 分卷（每卷可独立解压），另附单文件整包
  function renderCatZip(cat) {
    var wrap = $("zipCatWrap");
    if (!wrap) return;
    var old = $("zipBtn");
    wrap.innerHTML = "";
    if (old) wrap.appendChild(old);
    var zip = $("zipBtn");
    zip.classList.remove("off");
    zip.setAttribute("download", "");
    if (STATIC_HOST) {
      zip.href = "离线精选包.html";
      zip.classList.remove("off");
      zip.setAttribute("download", "");
      zip.textContent = "下载离线精选包（整包，静态托管版）";
      return;
    }
    if (!cat.zipBytes && !state.raw.length) {
      zip.classList.add("off");
      zip.textContent = "ZIP 未生成（运行 tools/build.mjs）";
      return;
    }
    if (!state.raw.length) {
      zip.href = cat.zip;
      zip.setAttribute("download", cat.id + "_" + cat.name + ".zip");
      zip.textContent = "打包下载本分类 ZIP（" + fmtBytes(cat.zipBytes) + "）";
      return;
    }
    var base = "zip?cat=" + cat.id + "&v=0&sub=all&grp=all&q=&size=" + PART_SIZE;
    var parts = 1, acc = 0;
    for (var i = 0; i < state.raw.length; i++) {
      var s = state.raw[i].s;
      if (acc && acc + s > PART_SIZE) { parts++; acc = 0; }
      acc += s;
    }
    zip.href = base + "&part=1";
    zip.textContent = "打包下载本分类（" + fmtBytes(cat.bytes) + (parts > 1 ? " · 共 " + parts + " 卷" : "") + "）";
    for (var k = 2; k <= parts; k++) {
      var a = document.createElement("a");
      a.className = "btn tiny part";
      a.href = base + "&part=" + k;
      a.setAttribute("download", "");
      a.textContent = "第 " + k + " 卷";
      wrap.appendChild(a);
    }
    if (cat.zipBytes) {
      var whole = document.createElement("a");
      whole.className = "btn tiny";
      whole.href = cat.zip;
      whole.setAttribute("download", cat.id + "_" + cat.name + ".zip");
      whole.textContent = "单文件整包（" + fmtBytes(cat.zipBytes) + "）";
      whole.title = "一个 83MB 的大文件；网络不稳时建议用上面分卷";
      wrap.appendChild(whole);
    }
  }

  function selectCat(id) {
    var cat = state.index.categories.filter(function (c) { return c.id === id; })[0];
    if (!cat) return;
    state.cat = cat; state.sub = "all"; state.grp = "all"; state.q = "";
    state.global = false; $("globalBtn").textContent = "当前分类";
    $("globalBtn").classList.remove("accent");
    $("q").value = ""; $("q").placeholder = "在「" + cat.name + "」中搜索素材名…";
    updateHero();

    $("grid").innerHTML = "";
    var loading = document.createElement("div");
    loading.className = "empty";
    loading.textContent = "载入中…";
    $("grid").appendChild(loading);

    var use = state.cache[cat.id];
    var task = use ? Promise.resolve(use) : loadManifest("manifest/" + cat.id + ".js", "__DR_CAT");
    task.then(function (data) {
      state.cache[cat.id] = data;
      state.sortCache = null;
      state.lastSig = "";
      state.raw = data.items.map(function (a) {
        return { n: a[0], p: a[1], v: a[2], s: a[3], w: a[4], h: a[5], sub: a[6], grp: a[7], search: a[1].toLowerCase(), dur: a[8] || 0 };
      });
      renderSubs(cat);
      renderGroups();
      renderCatZip(cat);
      apply();
    }).catch(function (e) {
      $("grid").innerHTML = "";
      var d = document.createElement("div");
      d.className = "empty";
      d.textContent = "清单载入失败：" + e.message;
      $("grid").appendChild(d);
    });
  }

  function renderSubs(cat) {
    var row = $("subRow");
    row.innerHTML = "";
    var subs = (cat.subjects || []).filter(function (s) { return s.id !== ""; });
    if (!subs.length) { $("grp").innerHTML = ""; $("grp").parentNode.style.display = "none"; return; }
    $("grp").parentNode.style.display = "";

    var wrap = document.createElement("div");
    wrap.className = "subs";

    function chip(label, id, count) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "chip" + (state.sub === id ? " on" : "");
      b.textContent = label;
      var c = document.createElement("span");
      c.className = "c";
      c.textContent = count;
      b.appendChild(c);
      b.addEventListener("click", function () {
        if (state.global) return;
        state.sub = id; state.grp = "all";
        Array.prototype.forEach.call(wrap.querySelectorAll(".chip"), function (x) { x.classList.remove("on"); });
        b.classList.add("on");
        renderGroups(); apply();
      });
      return b;
    }

    wrap.appendChild(chip("全部", "all", cat.count));
    if (subs.length > 16) {
      var si = document.createElement("input");
      si.className = "chip-search";
      si.placeholder = "过滤分组…";
      si.addEventListener("input", function () {
        var v = si.value.trim().toLowerCase();
        Array.prototype.forEach.call(wrap.querySelectorAll(".chip[data-sub]"), function (x) {
          x.style.display = (!v || x.textContent.toLowerCase().indexOf(v) >= 0) ? "" : "none";
        });
      });
      wrap.appendChild(si);
    }
    subs.forEach(function (s) {
      var el = chip(s.zh ? s.zh + " " + s.id : s.id, s.id, s.count);
      el.dataset.sub = s.id;
      wrap.appendChild(el);
    });
    row.appendChild(wrap);
  }

  function renderGroups() {
    var sel = $("grp");
    sel.innerHTML = "";
    var cat = state.cat;
    if (!cat) return;
    var set = {};
    (cat.subjects || []).forEach(function (s) {
      if (state.sub !== "all" && s.id !== state.sub) return;
      (s.groups || []).forEach(function (g) { set[g.id] = (set[g.id] || 0) + g.count; });
    });
    var ids = Object.keys(set).sort();
    if (!ids.length) { sel.parentNode.style.display = "none"; return; }
    sel.parentNode.style.display = "";
    var all = document.createElement("option");
    all.value = "all"; all.textContent = "全部分组";
    sel.appendChild(all);
    ids.forEach(function (id) {
      var o = document.createElement("option");
      o.value = id; o.textContent = id + " (" + set[id] + ")";
      sel.appendChild(o);
    });
    sel.value = state.grp;
  }

  var collator = null;
  function cmpName(a, b) {
    if (!collator) {
      try { collator = new Intl.Collator("zh-CN", { numeric: true, sensitivity: "base" }); } catch (e) { collator = false; }
    }
    if (collator) return collator.compare(a.n, b.n);
    return a.n < b.n ? -1 : a.n > b.n ? 1 : 0;
  }

  // 整类排序只做一次，之后筛选都在这份有序数组上做，不再重复排序
  function sortedRaw() {
    var key = state.sort;
    var cache = state.sortCache || (state.sortCache = {});
    if (cache.key === key && cache.arr) return cache.arr;
    var arr = state.raw.slice();
    var s = state.sort;
    if (s === "size") arr.sort(function (a, b) { return a.s - b.s; });
    else if (s === "size-d") arr.sort(function (a, b) { return b.s - a.s; });
    else if (s === "name-d") arr.sort(function (a, b) { return cmpName(b, a); });
    else arr.sort(cmpName);
    cache.key = key;
    cache.arr = arr;
    return arr;
  }

  function apply() {
    var raw = state.q.trim();
    var v = state.variant;
    var src = state.raw.length ? sortedRaw() : state.raw;
    var cat = state.cat;
    var q = buildQuery(raw);
    renderZhHint(q.translated, raw);
    var view = [];
    var unknownZh = raw && hasHan(raw) && !q.groups.length;
    for (var i = 0; !unknownZh && i < src.length; i++) {
      var it = src[i];
      if (v !== "0" && String(it.v) !== v) continue;
      if (state.sub !== "all" && it.sub !== state.sub) continue;
      if (state.grp !== "all" && it.grp !== state.grp) continue;
      if (q.groups.length && !matchGroups(it.search, q.groups)) continue;
      view.push({ it: it, cat: cat });
    }
    state.view = view;
    state.shown = PAGE;
    // 同样的筛选结果不重复重建 DOM（打字时最容易命中）
    var sig = [state.cat && state.cat.id, v, state.sub, state.grp, q, state.sort, view.length].join("|");
    if (sig === state.lastSig && $("grid").children.length === Math.min(view.length, PAGE)) return;
    state.lastSig = sig;
    renderGrid(true);
  }

  function applyGlobal() {
    var raw = state.q.trim();
    var q = buildQuery(raw);
    renderZhHint(q.translated, raw);
    var cats = state.index.categories;
    var jobs = cats.map(function (c) {
      if (state.cache[c.id]) return Promise.resolve({ cat: c, data: state.cache[c.id] });
      return loadManifest("manifest/" + c.id + ".js", "__DR_CAT").then(function (d) {
        state.cache[c.id] = d;
        return { cat: c, data: d };
      });
    });
    $("grid").innerHTML = "";
    var loading = document.createElement("div");
    loading.className = "empty";
    loading.textContent = "正在载入全部分类清单…";
    $("grid").appendChild(loading);

    Promise.all(jobs).then(function (all) {
      var out = [];
      all.forEach(function (pack) {
        pack.data.items.forEach(function (a) {
          var it = { n: a[0], p: a[1], v: a[2], s: a[3], w: a[4], h: a[5], sub: a[6], grp: a[7] };
          if (state.variant !== "0" && String(it.v) !== state.variant) return;
          if (q.groups.length && !matchGroups(it.p.toLowerCase(), q.groups)) return;
          out.push({ it: it, cat: pack.cat });
        });
      });
      out.sort(function (a, b) { return b.it.s - a.it.s; });
      state.view = out;
      state.shown = PAGE;
      $("heroStats").style.display = "";
      $("statCount").textContent = out.length;
      $("statSize").textContent = "12 类";
      $("statGroups").textContent = "—";
      $("catMeta").textContent = "关键词：" + raw + " · 全库命中 " + out.length + " 张";
      renderGrid(true);
    }).catch(function (e) {
      $("grid").innerHTML = "";
      var d = document.createElement("div");
      d.className = "empty";
      d.textContent = "全库搜索失败：" + e.message;
      $("grid").appendChild(d);
    });
  }

  var PART_SIZE = 26 * 1048576;

  function updateZipButton() {
    var wrap = $("zipFilterWrap");
    if (!wrap) return;
    var b = $("zipFilterBtn");
    wrap.innerHTML = "";
    if (!b) {
      b = document.createElement("a");
      b.id = "zipFilterBtn";
      b.className = "btn tiny accent";
      b.setAttribute("download", "");
    }
    wrap.appendChild(b);
    b.classList.remove("off");
    b.href = "#";

    if (STATIC_HOST) {
      b.classList.add("off");
      b.textContent = "静态托管版不支持按筛选打包（可下载整包）";
      return;
    }
    if (state.global) {
      b.classList.add("off");
      b.textContent = "打包下载筛选结果（全库模式请先选分类）";
      return;
    }
    var n = state.view.length, bytes = 0, i;
    for (i = 0; i < n; i++) bytes += state.view[i].it.s;
    if (!n) {
      b.classList.add("off");
      b.textContent = "打包下载筛选结果";
      return;
    }
    if (n > 6000 || bytes > 420 * 1048576) {
      b.classList.add("off");
      b.textContent = "结果过大（" + n + " 张 · " + fmtBytes(bytes) + "），请缩小筛选范围";
      return;
    }
    var base = "zip?cat=" + state.cat.id
      + "&v=" + state.variant
      + "&sub=" + encodeURIComponent(state.sub)
      + "&grp=" + encodeURIComponent(state.grp)
      + "&q=" + encodeURIComponent(state.q.trim())
      + "&size=" + PART_SIZE;

    // 按累计体积切分卷数（与服务端一致）
    var parts = 1, acc = 0;
    for (i = 0; i < n; i++) {
      var s = state.view[i].it.s;
      if (acc && acc + s > PART_SIZE) { parts++; acc = 0; }
      acc += s;
    }
    b.href = base + "&part=1";
    b.textContent = "打包下载筛选结果（" + n + " 张 · " + fmtBytes(bytes) + (parts > 1 ? " · 共 " + parts + " 卷" : "") + "）";
    if (parts > 1) {
      for (var k = 1; k <= parts; k++) {
        var a = document.createElement("a");
        a.className = "btn tiny part";
        a.href = base + "&part=" + k;
        a.setAttribute("download", "");
        a.textContent = "第 " + k + " 卷";
        wrap.appendChild(a);
      }
    }
  }

  var MAX_CARDS = 1500;   // 安全上限，防止一次滚动到底把几万张卡片全塞进 DOM
  var moreIO = null;

  function loadMore(manual) {
    if (state.shown >= state.view.length) return;
    if (!manual && state.shown >= MAX_CARDS) return;
    state.shown = Math.min(state.shown + PAGE, state.view.length);
    renderGrid(false);
  }

  var morePoll = null;
  function checkSentinel() {
    var btn = $("more");
    if (!btn || btn.hidden) { stopPoll(); return; }
    if (btn.getBoundingClientRect().top < window.innerHeight + 800) loadMore();
  }
  function startPoll() {
    if (morePoll) return;
    morePoll = setInterval(checkSentinel, 400);
  }
  function stopPoll() {
    if (morePoll) { clearInterval(morePoll); morePoll = null; }
  }

  function watchMore() {
    var btn = $("more");
    if (!btn) { stopPoll(); return; }
    if (btn.hidden) { stopPoll(); return; }
    if (typeof IntersectionObserver !== "undefined") {
      if (!moreIO) {
        moreIO = new IntersectionObserver(function (entries) {
          entries.forEach(function (en) { if (en.isIntersecting) loadMore(); });
        }, { rootMargin: "700px 0px" });
      }
      moreIO.observe(btn);
    }
    startPoll();
  }

  var cardPool = new Map();

  function renderGrid(reset) {
    var grid = $("grid");
    var total = state.view.length;
    var end = Math.min(total, state.shown);

    if (!total) {
      cardPool.clear();
      grid.innerHTML = "";
      var d = document.createElement("div");
      d.className = "empty";
      d.textContent = state.global
        ? "全库中没有匹配的素材（可以试试英文关键词，例如 queen / chair）"
        : "这个筛选条件下没有素材" + (state.q.trim() ? "（没识别到就换一个中文词，或直接用英文关键词）" : "");
      grid.appendChild(d);
      if (!state.global && state.q.trim() && state.index) {
        var goGlobal = document.createElement("button");
        goGlobal.className = "btn accent";
        goGlobal.style.marginTop = "14px";
        goGlobal.textContent = "在全部 12 个分类中搜索「" + state.q.trim() + "」";
        goGlobal.addEventListener("click", function () { $("globalBtn").click(); });
        d.appendChild(goGlobal);
      }
      $("more").hidden = true;
      $("count").textContent = "";
      updateZipButton();
      return;
    }

    if (reset) {
      // 复用已存在的卡片节点，只补新出现的；DOM 复用能让浏览器不重新下载 / 解码 GIF
      var frag = document.createDocumentFragment();
      var prefix = state.global ? "g:" : "c:";
      for (var k = 0; k < end; k++) {
        var itk = state.view[k].it;
        var keyk = prefix + itk.p;
        var el = cardPool.get(keyk);
        if (!el) { el = makeCard(state.view[k]); cardPool.set(keyk, el); }
        frag.appendChild(el);
      }
      grid.innerHTML = "";
      grid.appendChild(frag);
      if (cardPool.size > end * 4 + 200) {
        var keep = new Map();
        for (var m = 0; m < end; m++) { var kkp = (state.global ? "g:" : "c:") + state.view[m].it.p; keep.set(kkp, cardPool.get(kkp)); }
        cardPool = keep;
      }
    } else {
      var prefix2 = state.global ? "g:" : "c:";
      for (var i = grid.children.length; i < end; i++) {
        var it2 = state.view[i].it;
        var key2 = prefix2 + it2.p;
        var el2 = cardPool.get(key2);
        if (!el2) { el2 = makeCard(state.view[i]); cardPool.set(key2, el2); }
        grid.appendChild(el2);
      }
    }
    $("count").textContent = state.global
      ? "全库命中 " + total + " 张 · 已显示 " + end
      : "共 " + state.raw.length + " 张 · 筛选后 " + total + " 张 · 已显示 " + end;
    updateZipButton();
    var btn = $("more");
    if (end >= total) {
      btn.hidden = true;
      btn.textContent = "已全部加载（" + total + " 张）";
    } else if (end >= MAX_CARDS) {
      btn.hidden = false;
      btn.textContent = "已显示 " + end + " / " + total + " 张，点击继续（避免一次渲染过多）";
    } else {
      btn.hidden = false;
      btn.textContent = "向下滚动自动加载（还剩 " + (total - end) + " 张）";
    }
    watchMore();
  }

  // 懒加载 GIF：只有接近视口的卡片才拉原图，并发上限 8，避免一次刷爆带宽
  var gifQueue = [], gifActive = 0;
  function pumpGifs() {
    while (gifActive < 10 && gifQueue.length) {
      var job = gifQueue.shift();
      gifActive++;
      var pre = new Image();
      var done = function () {
        gifActive--;
        if (job.img && job.img.isConnected && !job.img.dataset.g) job.img.src = fileURL(job.it.p);
        pumpGifs();
      };
      pre.onload = done; pre.onerror = done;
      pre.src = fileURL(job.it.p);
    }
  }
  function wantGif(it, img) { gifQueue.push({ it: it, img: img }); pumpGifs(); }

  var io = null;
  if (typeof IntersectionObserver !== "undefined") {
    io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        io.unobserve(en.target);
        var job = en.target.__gif;
        if (job) wantGif(job.it, job.img);
      });
    }, { rootMargin: "80px" });
  }

  var STATIC_HOST = /\.github\.io$/i.test(location.hostname) || location.protocol === "file:";

  function thumbURL(p) {
    return "thumbs/" + p.replace(/\.gif$/i, ".webp").split("/").map(encodeURIComponent).join("/");
  }

  function indexOfPath(path) {
    for (var i = 0; i < state.view.length; i++) if (state.view[i].it.p === path) return i;
    return -1;
  }

  function makeCard(entry) {
    var it = entry.it;
    var b = document.createElement("div");
    b.className = "card" + (it.v === 2 ? " v2" : "");
    b.tabIndex = 0;
    b.setAttribute("role", "button");
    var thumb = document.createElement("div");
    thumb.className = "thumb";
    if (entry.cat && entry.cat.kind === "video") {
      var v = document.createElement("video");
      v.className = "vprev";
      v.muted = true; v.loop = true; v.playsInline = true; v.preload = "metadata";
      v.src = fileURL(it.p);
      v.addEventListener("loadedmetadata", function () {
        try { v.currentTime = Math.min(0.15, (v.duration || 1) / 10); } catch (e) {}
      });
      thumb.appendChild(v);
      var badge = document.createElement("span");
      badge.className = "vbadge";
      badge.textContent = "▶ 视频";
      thumb.appendChild(badge);
      b.addEventListener("mouseenter", function () { v.play().catch(function () {}); });
      b.addEventListener("mouseleave", function () {
        v.pause();
        try { v.currentTime = 0.05; } catch (e) {}
      });
      var vmeta = document.createElement("div");
      vmeta.className = "meta";
      var vnm = document.createElement("span");
      vnm.className = "nm";
      vnm.textContent = it.n;
      var vsz = document.createElement("span");
      vsz.className = "sz";
      vsz.textContent = it.w + "×" + it.h + " · " + (it.dur ? it.dur.toFixed(1) + " 秒 · " : "") + fmtBytes(it.s);
      vmeta.appendChild(vnm); vmeta.appendChild(vsz);
      var vdl = document.createElement("a");
      vdl.className = "dl";
      vdl.href = fileURL(it.p);
      vdl.setAttribute("download", it.n);
      vdl.textContent = "⬇";
      vdl.title = "下载原片";
      vdl.addEventListener("click", function (e) { e.stopPropagation(); });
      b.dataset.path = it.p;
      b.appendChild(thumb); b.appendChild(vmeta); b.appendChild(vdl);
      b.addEventListener("click", function () { openModal(indexOfPath(it.p)); });
      return b;
    }
    var img = document.createElement("img");
    img.className = "still";
    img.loading = "lazy";
    img.decoding = "async";
    img.alt = it.n;
    // 先秒出 2KB 缩略图，原 GIF 在后台加载完成后替换成动图（首屏从 1MB+ 降到 ~130KB）
    img.src = thumbURL(it.p);
    img.addEventListener("error", function () {
      if (img.dataset.g) return;
      img.dataset.g = "1";
      img.src = fileURL(it.p);
    });
    thumb.appendChild(img);
    b.__gif = { it: it, img: img };
    if (io) io.observe(b); else wantGif(it, img);
    var meta = document.createElement("div");
    meta.className = "meta";
    var nm = document.createElement("span");
    nm.className = "nm";
    nm.textContent = it.n.replace(/\.gif$/i, "");
    var sz = document.createElement("span");
    sz.className = "sz";
    sz.textContent = it.w + "×" + it.h + " · " + fmtBytes(it.s);
    meta.appendChild(nm);
    meta.appendChild(sz);
    if (state.global && entry.cat) {
      var cd = document.createElement("span");
      cd.className = "sz";
      cd.style.color = "var(--cyan)";
      cd.textContent = entry.cat.name;
      meta.appendChild(cd);
    }
    var dl = document.createElement("a");
    dl.className = "dl";
    dl.href = fileURL(it.p);
    dl.setAttribute("download", it.n);
    dl.title = "直接下载这张 GIF";
    dl.textContent = "⬇";
    dl.addEventListener("click", function (e) { e.stopPropagation(); });
    b.appendChild(thumb);
    b.appendChild(meta);
    b.appendChild(dl);
    b.dataset.path = it.p;
    b.addEventListener("click", function () { openModal(indexOfPath(it.p)); });
    b.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openModal(indexOfPath(it.p)); }
    });
    return b;
  }

  function openModal(idx) {
    if (idx < 0 || idx >= state.view.length) return;
    state.cur = idx;
    var entry = state.view[idx];
    var it = entry.it;
    var m = $("modal");
    var hostCat = entry.cat || state.cat;
    var isVid = !!(hostCat && hostCat.kind === "video");
    $("mImg").alt = it.n;
    $("mName").textContent = it.n.replace(/\.(gif|mp4)$/i, "");
    $("mDim").textContent = isVid
      ? it.w + " × " + it.h + " px · " + (it.dur ? it.dur.toFixed(1) + " 秒" : "视频")
      : it.w + " × " + it.h + " px · " + (it.v === 2 ? "267ms" : "133ms") + " 帧率版本";
    $("mSize").textContent = fmtBytes(it.s);
    var mv = $("mVid"), mi = $("mImg");
    if (isVid) {
      mi.hidden = true; mi.removeAttribute("src");
      mv.hidden = false;
      mv.src = fileURL(it.p);
      mv.play().catch(function () {});
    } else {
      try { mv.pause(); } catch (e) {}
      mv.hidden = true; mv.removeAttribute("src");
      mi.hidden = false;
      mi.src = fileURL(it.p);
    }
    $("mCat").textContent = (hostCat ? hostCat.name : "")
      + (it.sub ? " / " + subLabel(hostCat, it.sub) : "")
      + (it.grp ? " / " + it.grp : "");
    $("mPath").textContent = it.p;
    var dl = $("mDl");
    dl.href = fileURL(it.p);
    dl.setAttribute("download", baseName(it.p));
    $("mOpen").href = fileURL(it.p);
    m.hidden = false;
    document.body.style.overflow = "hidden";
  }

  function closeModal() {
    $("modal").hidden = true;
    $("mImg").src = "";
    var mv = $("mVid");
    if (mv) { try { mv.pause(); } catch (e) {} mv.removeAttribute("src"); }
    document.body.style.overflow = "";
  }

  function bindEvents() {
    var timer = null;
    $("q").addEventListener("input", function (e) {
      clearTimeout(timer);
      timer = setTimeout(function () {
        state.q = e.target.value;
        if (state.q.trim() && (state.sub !== "all" || state.grp !== "all")) {
          state.sub = "all"; state.grp = "all";
          if (state.cat && !state.global) { renderSubs(state.cat); renderGroups(); }
        }
        if (state.global) {
          if (state.q.trim().length >= 1) applyGlobal();
          else { showHint("输入关键词开始全库搜索（当前已载入 " + state.index.total.files + " 张素材）"); updateHero(); }
        } else apply();
      }, 260);
    });
    $("globalBtn").addEventListener("click", function () {
      state.global = !state.global;
      this.textContent = state.global ? "全库搜索中" : "当前分类";
      this.classList.toggle("accent", state.global);
      $("q").placeholder = state.global ? "在全部 " + state.index.total.files + " 张素材中搜索…" : "搜索素材名…";
      updateHero();
      $("q").focus();
      if (state.global) {
        if (state.q.trim()) applyGlobal();
        else showHint("输入关键词开始全库搜索（当前已载入 " + state.index.total.files + " 张素材）");
      } else apply();
    });
    $("sort").addEventListener("change", function (e) {
      state.sort = e.target.value;
      if (state.global) { state.view.sort(function (a, b) {
        if (state.sort === "size") return a.it.s - b.it.s;
        if (state.sort === "size-d") return b.it.s - a.it.s;
        if (state.sort === "name-d") return b.it.n.localeCompare(a.it.n);
        return a.it.n.localeCompare(b.it.n);
      }); state.shown = PAGE; renderGrid(true); }
      else apply();
    });
    $("grp").addEventListener("change", function (e) { if (state.global) return; state.grp = e.target.value; apply(); });
    $("variant").addEventListener("click", function (e) {
      var b = e.target.closest("button");
      if (!b) return;
      Array.prototype.forEach.call(this.querySelectorAll("button"), function (x) { x.classList.remove("on"); });
      b.classList.add("on");
      state.variant = b.dataset.v;
      if (state.global) applyGlobal(); else apply();
    });
    $("more").addEventListener("click", function () { loadMore(true); });
    var scrollTick = false;
    window.addEventListener("scroll", function () {
      if (scrollTick) return;
      scrollTick = true;
      requestAnimationFrame(function () {
        scrollTick = false;
        var btn = $("more");
        if (!btn || btn.hidden) return;
        var rect = btn.getBoundingClientRect();
        if (rect.top < window.innerHeight + 800) loadMore();
      });
    }, { passive: true });
    window.addEventListener("resize", function () {
      var btn = $("more");
      if (!btn || btn.hidden) return;
      if (btn.getBoundingClientRect().top < window.innerHeight + 800) loadMore();
    });
    $("fsBtn").addEventListener("click", function () {
      if (document.fullscreenElement) {
        document.exitFullscreen().then(function () { $("fsBtn").textContent = "⛶ 全屏"; });
      } else {
        document.documentElement.requestFullscreen().then(function () { $("fsBtn").textContent = "⛶ 退出全屏"; }).catch(function () {
          $("fsBtn").textContent = "按 F11 全屏";
        });
      }
    });
    document.addEventListener("fullscreenchange", function () {
      $("fsBtn").textContent = document.fullscreenElement ? "⛶ 退出全屏" : "⛶ 全屏";
    });
    ["zipBtn", "zipFilterBtn"].forEach(function (id) {
      var el = $(id);
      if (!el) return;
      el.addEventListener("click", function () {
        if (el.classList.contains("off") || el.getAttribute("href") === "#") {
          toast("当前没有可打包的内容，请先调整筛选");
          return;
        }
        toast("已开始下载：" + el.textContent.replace(/^打包下载[^（]*（/, "").replace(/）$/, "") + "，请看浏览器下载栏");
      });
    });
    $("modalX").addEventListener("click", closeModal);
    $("modal").addEventListener("click", function (e) { if (e.target === this) closeModal(); });
    $("mCopy").addEventListener("click", function () {
      var it = state.view[state.cur] && state.view[state.cur].it;
      if (!it) return;
      var text = it.n;
      var btn = this;
      var done = function () { btn.textContent = "已复制 ✓"; setTimeout(function () { btn.textContent = "复制文件名"; }, 1200); };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, done);
      } else {
        var ta = document.createElement("textarea");
        ta.value = text; document.body.appendChild(ta); ta.select();
        try { document.execCommand("copy"); } catch (err) {}
        document.body.removeChild(ta); done();
      }
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "/" && document.activeElement !== $("q")) { e.preventDefault(); $("q").focus(); }
      if ($("modal").hidden) return;
      if (e.key === "Escape") closeModal();
      if (e.key === "ArrowRight") openModal(state.cur + 1);
      if (e.key === "ArrowLeft") openModal(state.cur - 1);
    });
  }

  document.addEventListener("DOMContentLoaded", boot);
})();
