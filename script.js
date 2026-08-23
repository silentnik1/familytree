(function () {
  "use strict";

  var ROOT = window.PEDIGREE;
  var canvas = document.getElementById("canvas");
  var tree = document.getElementById("tree");
  var canvasWrap = document.getElementById("canvas-wrap");

  var expandedPaths = new Set(["root"]); // "root" expanded => show дід level by default
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
    var nameLine = '<span class="name' + livingCls + '">' + escapeHtml(node.husband) + "</span>";
    if (node.wife) {
      nameLine += '<div class="plus">⚭' + (node.marriage_date ? " " + escapeHtml(node.marriage_date) : "") + "</div>";
      nameLine += '<span class="name' + livingCls + '">' + escapeHtml(node.wife) + (isRoot && node.birth_year ? " (" + escapeHtml(node.birth_year) + " р.н.)" : "") + "</span>";
    } else if (isRoot && node.birth_year) {
      nameLine += '<div class="unknown">' + escapeHtml(node.birth_year) + " р.н.</div>";
    } else {
      nameLine += '<div class="unknown">дані про дружину невідомі</div>';
    }

    var badge = node.record && node.record_detail
      ? '<div><span class="rec-badge">запис ' + escapeHtml(node.record) + "</span></div>"
      : "";

    var sibHTML = "";
    if (node.siblings && node.siblings.length) {
      var open = sibOpenPaths.has(path);
      sibHTML =
        '<button class="sib-toggle" data-sibpath="' + escapeHtml(path) + '">' +
        (open ? "− " : "+ ") + node.siblings.length + " брат./сестр." +
        "</button>" +
        '<div class="sib-list' + (open ? " open" : "") + '">' +
        node.siblings.map(function (s) { return "<div>" + escapeHtml(s) + "</div>"; }).join("") +
        "</div>";
    }

    var expanded = expandedPaths.has(path);
    var canExpand = hasParents(node);
    var expandBtn = canExpand
      ? '<button class="expand-btn' + (expanded ? " expanded" : "") + '" data-path="' + escapeHtml(path) + '" aria-label="Розгорнути">+</button>'
      : "";

    return (
      '<div class="node-card' + (isRoot ? " root" : "") + '" data-detail-path="' + escapeHtml(path) + '">' +
      nameLine + badge + sibHTML + expandBtn +
      "</div>"
    );
  }

  function renderLI(node, path, isRoot) {
    var html = "<li>" + cardHTML(node, path, isRoot);
    if (hasParents(node) && expandedPaths.has(path)) {
      html += "<ul>";
      ["father_side", "mother_side"].forEach(function (key) {
        if (node.parents[key]) {
          html += renderLI(node.parents[key], path + "." + key, false);
        }
      });
      html += "</ul>";
    }
    html += "</li>";
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
    tree.innerHTML = "<ul>" + renderLI(ROOT, "root", true) + "</ul>";
    attachEvents();
  }

  function attachEvents() {
    tree.querySelectorAll(".expand-btn").forEach(function (btn) {
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
    tree.querySelectorAll(".node-card").forEach(function (card) {
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
      if (node.siblings && node.siblings.length) {
        body += '<div class="side"><h3>Брати / сестри</h3><div class="rawtext">' + node.siblings.map(escapeHtml).join("\n") + "</div></div>";
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

  // ---------------- Zoom / Pan ----------------
  var zoom = 1;
  var MIN_Z = 0.4, MAX_Z = 1.6;
  function applyZoom() {
    canvas.style.transform = "scale(" + zoom + ")";
    document.getElementById("zoomLevel").textContent = Math.round(zoom * 100) + "%";
  }
  document.getElementById("zoomIn").addEventListener("click", function () {
    zoom = Math.min(MAX_Z, +(zoom + 0.1).toFixed(2)); applyZoom();
  });
  document.getElementById("zoomOut").addEventListener("click", function () {
    zoom = Math.max(MIN_Z, +(zoom - 0.1).toFixed(2)); applyZoom();
  });
  canvasWrap.addEventListener("wheel", function (e) {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    var delta = e.deltaY > 0 ? -0.08 : 0.08;
    zoom = Math.min(MAX_Z, Math.max(MIN_Z, +(zoom + delta).toFixed(2)));
    applyZoom();
  }, { passive: false });

  var isDown = false, startX, startY, scrollLeft, scrollTop;
  canvasWrap.addEventListener("mousedown", function (e) {
    if (e.target.closest(".node-card") || e.target.closest("button")) return;
    isDown = true;
    canvasWrap.classList.add("grabbing");
    startX = e.pageX; startY = e.pageY;
    scrollLeft = canvasWrap.scrollLeft; scrollTop = canvasWrap.scrollTop;
  });
  window.addEventListener("mouseup", function () { isDown = false; canvasWrap.classList.remove("grabbing"); });
  window.addEventListener("mousemove", function (e) {
    if (!isDown) return;
    canvasWrap.scrollLeft = scrollLeft - (e.pageX - startX);
    canvasWrap.scrollTop = scrollTop - (e.pageY - startY);
  });

  var touchDist = null;
  canvasWrap.addEventListener("touchstart", function (e) {
    if (e.touches.length === 2) {
      touchDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
    }
  }, { passive: true });
  canvasWrap.addEventListener("touchmove", function (e) {
    if (e.touches.length === 2 && touchDist) {
      var d = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      var delta = (d - touchDist) / 400;
      zoom = Math.min(MAX_Z, Math.max(MIN_Z, +(zoom + delta).toFixed(2)));
      applyZoom();
      touchDist = d;
    }
  }, { passive: true });

  render();
  applyZoom();
})();
