(function () {
  "use strict";

  var ROOT = window.PEDIGREE;
  var tree = document.getElementById("tree");

  var expandedPaths = new Set(["root"]);
  var sibOpenPaths = new Set();

  function escapeHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function hasParents(node) {
    return !!(node.parents && (node.parents.father_side || node.parents.mother_side));
  }

  function cardHTML(node, path, isRoot) {
    var livingCls = isRoot ? " living" : "";
    var line = '<span class="name' + livingCls + '">' + escapeHtml(node.husband) + "</span>";
    if (node.wife) {
      line += '<span class="sep">⚭' + (node.marriage_date ? " " + escapeHtml(node.marriage_date) : "") + "</span>";
      line += '<span class="name' + livingCls + '">' + escapeHtml(node.wife) + "</span>";
      if (isRoot && node.birth_year) line += '<span class="meta">(' + escapeHtml(node.birth_year) + " р.н.)</span>";
    } else if (isRoot && node.birth_year) {
      line += '<span class="meta">(' + escapeHtml(node.birth_year) + " р.н.)</span>";
    } else {
      line += '<span class="unknown"> — дружина невідома</span>';
    }
    if (node.record && node.record_detail) {
      line += '<span class="rec-badge">запис ' + escapeHtml(node.record) + "</span>";
    }
    return (
      '<div class="entry-card' + (isRoot ? " root" : "") + '" data-detail-path="' + escapeHtml(path) + '">' +
      '<div class="line">' + line + "</div>" +
      "</div>"
    );
  }

  function renderEntry(node, path, isRoot) {
    var hasP = hasParents(node);
    var expanded = expandedPaths.has(path);

    var toggleHtml = hasP
      ? '<button class="toggle' + (expanded ? " open" : "") + '" data-path="' + escapeHtml(path) + '" aria-label="Розгорнути">▸</button>'
      : '<span class="toggle disabled" aria-hidden="true">·</span>';

    var html = '<div class="entry">' +
      '<div class="entry-row">' + toggleHtml + cardHTML(node, path, isRoot) + "</div>";

    if (node.siblings && node.siblings.length) {
      var sibOpen = sibOpenPaths.has(path);
      html += '<button class="sib-toggle" data-sibpath="' + escapeHtml(path) + '">' +
        (sibOpen ? "− " : "+ ") + node.siblings.length + " брат./сестр." + "</button>";
      html += '<div class="collapsible' + (sibOpen ? " open" : "") + '"><div class="inner"><div class="sib-list">' +
        node.siblings.map(function (s) {
          var m = /(\d{1,3}\s?[-–]{1,2}\s?\d{1,2}½?)/.exec(s || "");
          var rec = m ? m[1].replace(/\s/g, "") : null;
          var badge = rec ? '<span class="rec-badge">' + escapeHtml(rec) + "</span>" : "";
          return '<div class="sib-item">' + escapeHtml(s) + badge + "</div>";
        }).join("") +
        "</div></div></div>";
    }

    if (hasP) {
      html += '<div class="collapsible' + (expanded ? " open" : "") + '"><div class="inner"><div class="children">';
      ["father_side", "mother_side"].forEach(function (key) {
        if (node.parents[key]) html += renderEntry(node.parents[key], path + "." + key, false);
      });
      html += "</div></div></div>";
    }

    html += "</div>";
    return html;
  }

  function nodeAtPath(path) {
    var parts = path.split(".");
    var n = ROOT;
    for (var i = 1; i < parts.length; i++) {
      if (!n.parents || !n.parents[parts[i]]) return null;
      n = n.parents[parts[i]];
    }
    return n;
  }

  function render() {
    tree.innerHTML = renderEntry(ROOT, "root", true);
    attachEvents();
  }

  function attachEvents() {
    tree.querySelectorAll(".toggle:not(.disabled)").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        var path = btn.getAttribute("data-path");
        if (expandedPaths.has(path)) expandedPaths.delete(path);
        else expandedPaths.add(path);
        render();
      });
    });
    tree.querySelectorAll(".sib-toggle").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        var path = btn.getAttribute("data-sibpath");
        if (sibOpenPaths.has(path)) sibOpenPaths.delete(path);
        else sibOpenPaths.add(path);
        render();
      });
    });
    tree.querySelectorAll(".entry-card").forEach(function (card) {
      card.addEventListener("click", function () {
        openDetail(card.getAttribute("data-detail-path"));
      });
    });
  }

  // ---------------- Modal ----------------
  function recordRow(k, v) {
    if (!v) return "";
    return '<div class="row"><div class="k">' + escapeHtml(k) + '</div><div class="v">' + escapeHtml(v) + "</div></div>";
  }

  function openDetail(path) {
    var node = nodeAtPath(path);
    if (!node) return;
    var r = node.record_detail;
    var body;
    if (r) {
      body = '<h2>Шлюбний запис № ' + escapeHtml(node.record) + "</h2>";
      body += recordRow("Дата шлюбу", r["дата"]);
      body += recordRow("Дім №", r["дім"]);
      body += '<div class="side"><h3>Наречений</h3>';
      body += recordRow("Ім'я", r["наречений"]);
      body += recordRow("Батьки", r["батьки_нареченого"]);
      body += recordRow("Рік/дата народж.", r["дата_нар_нар"]);
      body += recordRow("Вік", r["вік_нар"]);
      body += recordRow("Стан", r["статус_нар"]);
      body += "</div>";
      body += '<div class="side"><h3>Наречена</h3>';
      body += recordRow("Ім'я", r["наречена"]);
      body += recordRow("Батьки", r["батьки_нареченої"]);
      body += recordRow("Рік/дата народж.", r["дата_нар_нев"]);
      body += recordRow("Вік", r["вік_нев"]);
      body += recordRow("Стан", r["статус_нев"]);
      body += "</div>";
      if (r["свідки"]) {
        body += '<div class="side"><h3>Свідки</h3><div class="rawtext">' + escapeHtml(r["свідки"]) + "</div></div>";
      }
    } else {
      body = "<h2>" + escapeHtml(node.husband) + (node.wife ? " та " + escapeHtml(node.wife) : "") + "</h2>";
      if (node.marriage_date) body += recordRow("Дата шлюбу", node.marriage_date);
      if (node.birth_year) body += recordRow("Рік народження", node.birth_year);
      if (!node.marriage_date && !node.birth_year) {
        body += '<p class="no-record">Детального метричного запису для цієї особи не знайдено в реєстрах шлюбів.</p>';
      }
    }
    document.getElementById("modal-body").innerHTML = body;
    document.getElementById("modal-overlay").classList.remove("hidden");
  }
  function closeModal() { document.getElementById("modal-overlay").classList.add("hidden"); }
  document.getElementById("modal-close").addEventListener("click", closeModal);
  document.getElementById("modal-overlay").addEventListener("click", function (e) {
    if (e.target.id === "modal-overlay") closeModal();
  });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeModal(); });

  // ---------------- Expand all / collapse all ----------------
  function collectPaths(node, path, acc) {
    acc.push(path);
    if (hasParents(node)) {
      ["father_side", "mother_side"].forEach(function (key) {
        if (node.parents[key]) collectPaths(node.parents[key], path + "." + key, acc);
      });
    }
    return acc;
  }
  document.getElementById("expandAll").addEventListener("click", function () {
    collectPaths(ROOT, "root", []).forEach(function (p) { expandedPaths.add(p); });
    render();
  });
  document.getElementById("collapseAll").addEventListener("click", function () {
    expandedPaths.clear();
    expandedPaths.add("root");
    render();
  });

  render();
})();
