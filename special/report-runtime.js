(function () {
  "use strict";

  function textOf(node) {
    return (node.textContent || "").trim();
  }

  function formatRsiTables() {
    document.querySelectorAll("table").forEach(function (table) {
      var headers = Array.from(table.querySelectorAll("thead th")).map(textOf);
      var rsiIndex = headers.findIndex(function (header) { return /^RSI$/i.test(header); });
      if (rsiIndex < 0) return;

      table.querySelectorAll("tbody tr").forEach(function (row) {
        var cell = row.cells[rsiIndex];
        if (!cell) return;
        var value = Number(textOf(cell).replace(/,/g, ""));
        if (!Number.isFinite(value)) return;
        cell.classList.add("num");
        cell.classList.remove("rsi-hot", "rsi-cold");
        cell.textContent = "";
        if (value >= 70 || value <= 30) {
          var badge = document.createElement("span");
          badge.className = value >= 70 ? "rsi-hot" : "rsi-cold";
          badge.textContent = value.toFixed(2);
          cell.appendChild(badge);
        } else {
          cell.textContent = value.toFixed(2);
        }
      });
    });
  }

  function addSymbolLegend() {
    if (document.querySelector(".symbol-legend")) return;
    var summary = document.querySelector('section[aria-label*="summary"], section.grid');
    if (!summary) return;
    var legend = document.createElement("div");
    legend.className = "symbol-legend";
    legend.setAttribute("aria-label", "报告符号图例");
    legend.textContent = "符号图例：● 主要　● 条件／次要　● 观察　✓ 避免　⚠ 反向讯号　↑ 升级　↓ 降级";
    summary.insertAdjacentElement("afterend", legend);
  }

  function slugify(value, index) {
    var slug = value
      .toLowerCase()
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9\u4e00-\u9fff]+/g, "-")
      .replace(/^-+|-+$/g, "");
    return slug || "section-" + String(index + 1);
  }

  function addTableOfContents() {
    if (document.querySelector(".report-toc")) return;
    var main = document.querySelector("main");
    var headings = Array.from(document.querySelectorAll("main h2"));
    if (!main || headings.length < 2) return;

    var used = new Set();
    headings.forEach(function (heading, index) {
      if (!heading.id) {
        var base = slugify(textOf(heading), index);
        var id = base;
        var suffix = 2;
        while (used.has(id) || document.getElementById(id)) {
          id = base + "-" + String(suffix);
          suffix += 1;
        }
        heading.id = id;
      }
      used.add(heading.id);
    });

    var nav = document.createElement("nav");
    nav.className = "report-toc";
    nav.setAttribute("aria-label", "报告目录");
    var label = document.createElement("span");
    label.className = "toc-label";
    label.textContent = "快速导览";
    nav.appendChild(label);

    headings.forEach(function (heading) {
      var link = document.createElement("a");
      link.href = "#" + heading.id;
      link.textContent = textOf(heading);
      nav.appendChild(link);
    });

    var legend = document.querySelector(".symbol-legend");
    if (legend) legend.insertAdjacentElement("afterend", nav);
    else main.insertBefore(nav, main.querySelector("section"));
  }

  function colorSignedNumbers() {
    document.querySelectorAll(".num, .trend").forEach(function (cell) {
      if (cell.querySelector(".rsi, .atr, .pct")) return;
      var value = textOf(cell);
      if (cell.classList.contains("dn-ok")) {
        cell.classList.remove("up", "dn");
        return;
      }
      if (/^\+/.test(value)) cell.classList.add("up");
      else if (/^[-−]/.test(value)) cell.classList.add("dn");
      if (cell.classList.contains("trend")) {
        cell.style.fontVariantNumeric = "tabular-nums";
      }
    });
  }

  function addSectionKickers() {
    var labels = [
      [/核心结论|五个核心|收盘核心/i, "重点摘要"],
      [/Pre-market movers/i, "盘前异动"],
      [/Correction Checklist|修正检查/i, "风险检查"],
      [/宏观|事件|Fed/i, "宏观脉络"],
      [/Sector\s*\/\s*Thematic|板块|主题/i, "板块与主题"],
      [/大盘 ETF|指数|风格/i, "指数与风格"],
      [/50MA ATR/i, "延伸程度"],
      [/市场广度|Stockbee/i, "广度"],
      [/外汇|商品|利率|美债/i, "汇率与利率"],
      [/交易计划|下一周|下一交易日/i, "交易计划"],
      [/盘中触发/i, "盘中剧本"],
      [/上周对账|对账|对账/i, "对账"],
      [/Big Winners|Big Losers|赢家|输家/i, "个股领先／落后"],
      [/Cross-validation|交叉验证/i, "交叉验证"],
      [/资料来源/i, "资料来源"],
    ];
    document.querySelectorAll("main section h2").forEach(function (heading) {
      var section = heading.closest("section");
      if (!section || section.querySelector(":scope > .kicker")) return;
      var match = labels.find(function (entry) { return entry[0].test(textOf(heading)); });
      if (!match) return;
      var kicker = document.createElement("div");
      kicker.className = "kicker";
      kicker.textContent = match[1];
      section.insertBefore(kicker, heading);
    });
  }

  function formatMovingAverageStates() {
    document.querySelectorAll("table").forEach(function (table) {
      var headers = Array.from(table.querySelectorAll("thead th")).map(textOf);
      var maIndex = headers.findIndex(function (header) {
        return /20\s*\/\s*50\s*\/\s*200\s*MA|Above\s*MA/i.test(header);
      });
      if (maIndex < 0) return;

      table.querySelectorAll("tbody tr").forEach(function (row) {
        var cell = row.cells[maIndex];
        if (!cell || cell.querySelector(".ma-state")) return;
        var states = textOf(cell).split(/\s*[\/／]\s*/);
        if (states.length !== 3) return;

        var fragment = document.createDocumentFragment();
        states.forEach(function (state, index) {
          var normalized = state.trim();
          var isUp = /^(上|上方|▲|Y|Yes)$/i.test(normalized);
          var isDown = /^(下|下方|▼|N|No)$/i.test(normalized);
          if (!isUp && !isDown) return;

          var badge = document.createElement("span");
          badge.className = "ma-state " + (isUp ? "ma-up" : "ma-down");
          badge.setAttribute("aria-label", [20, 50, 200][index] + "MA " + (isUp ? "上方" : "下方"));

          var period = document.createElement("span");
          period.className = "ma-period";
          period.textContent = [20, 50, 200][index] + "MA";
          var arrow = document.createElement("span");
          arrow.className = "ma-arrow";
          arrow.textContent = isUp ? "▲" : "▼";
          badge.appendChild(period);
          badge.appendChild(arrow);
          fragment.appendChild(badge);

          if (index < states.length - 1) {
            var separator = document.createElement("span");
            separator.className = "ma-separator";
            separator.textContent = " ";
            fragment.appendChild(separator);
          }
        });

        if (fragment.childNodes.length) {
          cell.textContent = "";
          cell.classList.add("ma-cell");
          cell.appendChild(fragment);
        }
      });
    });
  }

  function init() {
    formatRsiTables();
    addSymbolLegend();
    addSectionKickers();
    addTableOfContents();
    colorSignedNumbers();
    formatMovingAverageStates();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
}());
