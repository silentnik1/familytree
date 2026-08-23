(function () {
  "use strict";

  var DATA = window.TREE_DATA;
  var RECORDS = DATA.records;
  var canvas = document.getElementById("canvas");
  var canvasWrap = document.getElementById("canvas-wrap");

  var LIVING_MARK = /\((я|тато|мама)/i;

  function escapeHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function isLiving(text) {
    return LIVING_MARK.test(text || "");
  }

  function recordBadges(recs) {
    if (!recs || !recs.length) return "";
    return recs
      .filter(function (r) { return RECORDS[r]; })
      .map(function (r) { return '<span class="rec-badge" data-rec="' + escapeHtml(r) + '">' + escapeHtml(r) + "</span>"; })
      .join(" ");
  }

  function cardHTML(block) {
    if (block.type === "trunk") {
      var recBadge = block.record && RECORDS[block.record]
        ? '<span class="rec-badge" data-rec="' + escapeHtml(block.record) + '">запис ' + escapeHtml(block.record) + "</span>"
        : "";
      return (
        '<div class="card trunk" tabindex="0" data-kind="trunk" data-record="' + escapeHtml(block.record || "") + '" data-search="' +
        escapeHtml((block.groom || "") + " " + (block.bride || "")).toLowerCase() + '">' +
        '<span class="name' + (isLiving(block.groom) ? " living" : "") + '">' + escapeHtml(block.groom) + "</span>" +
        '<div class="plus">⚭ ' + escapeHtml((block.date || "").replace(/\d{1,3}\s?[-–]{1,2}\s?\d{1,2}½?/, "").trim()) + "</div>" +
        '<span class="name' + (isLiving(block.bride) ? " living" : "") + '">' + escapeHtml(block.bride) + "</span>" +
        (recBadge ? "<div>" + recBadge + "</div>" : "") +
        "</div>"
      );
    }
    if (block.type === "pair") {
      return (
        '<div class="card pair" tabindex="0" data-kind="pair" data-search="' +
        escapeHtml((block.a || "") + " " + (block.b || "")).toLowerCase() + '">' +
        '<span class="name' + (isLiving(block.a) ? " living" : "") + '">' + escapeHtml(block.a) + "</span>" +
        '<div class="plus">+</div>' +
        '<span class="name' + (isLiving(block.b) ? " living" : "") + '">' + escapeHtml(block.b) + "</span>" +
        "<div>" + recordBadges(block.records) + "</div>" +
        "</div>"
      );
    }
    // single
    return (
      '<div class="card single" tabindex="0" data-kind="single" data-search="' +
      escapeHtml(block.text || "").toLowerCase() + '">' +
      '<span class="single-text' + (isLiving(block.text) ? " living" : "") + '">' + escapeHtml(block.text) + "</span>" +
      "<div>" + recordBadges(block.records) + "</div>" +
      "</div>"
    );
  }

  function render() {
    var html = "";
    DATA.generations.forEach(function (gen) {
      html += '<section class="gen-section">';
      html += '<span class="gen-node"></span>';
      html += '<div class="gen-header"><span class="gen-label">' + escapeHtml(gen.label) + "</span>";
      html += '<span class="gen-count">' + gen.blocks.length + (gen.blocks.length === 1 ? " запис" : " записів") + "</span></div>";
      html += '<div class="gen-row">';
      gen.blocks.forEach(function (b) { html += cardHTML(b); });
      html += "</div></section>";
    });
    canvas.innerHTML = html;
    attachCardEvents();
  }

  function attachCardEvents() {
    var cards = canvas.querySelectorAll(".card");
    cards.forEach(function (card) {
      card.addEventListener("click", function (e) {
        var badge = e.target.closest(".rec-badge");
        if (badge) {
          openRecord(badge.getAttribute("data-rec"));
          e.stopPropagation();
          return;
        }
        openCard(card);
      });
      card.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openCard(card); }
      });
    });
  }

  function openCard(card) {
    var record = card.getAttribute("data-record");
    if (record && RECORDS[record]) {
      openRecord(record);
      return;
    }
    var text = card.textContent.trim();
    var body =
      '<h2>Родинний запис</h2>' +
      '<div class="rawtext">' + escapeHtml(text) + "</div>" +
      '<p class="no-record">Детального метричного запису для цього запису не знайдено в реєстрах шлюбів.</p>';
    showModal(body);
  }

  function recordRow(k, v) {
    if (!v) return "";
    return '<div class="row"><div class="k">' + escapeHtml(k) + '</div><div class="v">' + escapeHtml(v) + "</div></div>";
  }

  function openRecord(recId) {
    var r = RECORDS[recId];
    if (!r) return;
    var body = '<h2>Шлюбний запис № ' + escapeHtml(recId) + "</h2>";
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
    showModal(body);
  }

  function showModal(html) {
    document.getElementById("modal-body").innerHTML = html;
    document.getElementById("modal-overlay").classList.remove("hidden");
  }
  function closeModal() {
    document.getElementById("modal-overlay").classList.add("hidden");
  }
  document.getElementById("modal-close").addEventListener("click", closeModal);
  document.getElementById("modal-overlay").addEventListener("click", function (e) {
    if (e.target.id === "modal-overlay") closeModal();
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeModal();
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
  document.getElementById("zoomReset").addEventListener("click", function () {
    zoom = 1; applyZoom(); canvasWrap.scrollLeft = 0; canvasWrap.scrollTop = 0;
  });
  canvasWrap.addEventListener("wheel", function (e) {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    var delta = e.deltaY > 0 ? -0.08 : 0.08;
    zoom = Math.min(MAX_Z, Math.max(MIN_Z, +(zoom + delta).toFixed(2)));
    applyZoom();
  }, { passive: false });

  // drag-to-pan
  var isDown = false, startX, startY, scrollLeft, scrollTop;
  canvasWrap.addEventListener("mousedown", function (e) {
    if (e.target.closest(".card") || e.target.closest("button") || e.target.closest("input")) return;
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

  // pinch-zoom (touch)
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

  // ---------------- Search ----------------
  var searchInput = document.getElementById("search");
  var searchTimer = null;
  searchInput.addEventListener("input", function () {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(doSearch, 120);
  });
  function doSearch() {
    var q = searchInput.value.trim().toLowerCase();
    var cards = canvas.querySelectorAll(".card");
    var firstMatch = null;
    cards.forEach(function (card) {
      if (!q) {
        card.classList.remove("dimmed", "matched");
        return;
      }
      var hay = card.getAttribute("data-search") || "";
      var match = hay.indexOf(q) !== -1;
      card.classList.toggle("dimmed", !match);
      card.classList.toggle("matched", match);
      if (match && !firstMatch) firstMatch = card;
    });
    if (firstMatch) {
      firstMatch.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
    }
  }

  render();
  applyZoom();
})();
