// ============================================================
// Axiom Trade – Show Tx Index & Block columns in the trade feed
// ============================================================

(function () {
  "use strict";

  // --- CONFIG ---
  const API_URL = 'https://ecotypically-undelayed-teodora.ngrok-free.dev';
  const PANEL_WIDTH = 520;
  const IDX_COL_WIDTH = 70;
  const BLK_COL_WIDTH = 90;
  const POLL_INTERVAL = 2000;

  const CACHE = new Map();
  const PENDING = new Map();

  // --- 1. Inject CSS overrides ---
  const style = document.createElement("style");
  style.textContent = `
    /* Widen the feed panel */
    .min-w-\\[292px\\].max-w-\\[292px\\] {
      min-width: ${PANEL_WIDTH}px !important;
      max-width: ${PANEL_WIDTH}px !important;
    }

    /* Style the axiom-tx-info-container */
    .axiom-tx-info-container {
      display: flex !important;
      flex: 0 0 auto !important;
      gap: 4px;
    }

    /* Tx Index column */
    .axiom-col.axiom-col-idx {
      display: flex !important;
      min-width: ${IDX_COL_WIDTH}px !important;
      max-width: ${IDX_COL_WIDTH}px !important;
      justify-content: flex-end;
      overflow: hidden;
      padding: 0 8px;
      margin-left: 4px;
    }

    /* Block column */
    .axiom-col.axiom-col-blk {
      display: flex !important;
      min-width: ${BLK_COL_WIDTH}px !important;
      max-width: ${BLK_COL_WIDTH}px !important;
      justify-content: flex-end;
      overflow: hidden;
      padding: 0 8px;
      margin-left: 4px;
    }

    /* Value text styling */
    .axiom-col .axiom-value {
      font-size: 12px;
      font-family: "Geist Mono", monospace;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      color: #b3bac9;
    }

    .axiom-col-idx .axiom-value {
      color: #b3bac9;
    }

    /* Column header styling */
    .axiom-custom-header {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      flex: 0 0 auto;
      padding: 0 8px;
      margin-left: 4px;
    }
    .axiom-custom-header span {
      font-size: 12px;
      font-weight: 400;
      line-height: 16px;
      color: #5f6170;
    }

    /* Loading spinner */
    .axiom-loading {
      opacity: 0.5;
    }
    .axiom-spinner {
      width: 12px;
      height: 12px;
      border: 2px solid rgba(255, 255, 255, 0.1);
      border-top-color: rgba(255, 255, 255, 0.4);
      border-radius: 50%;
      animation: axiom-spin 0.8s linear infinite;
    }
    @keyframes axiom-spin {
      to { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);

  // --- 2. API Functions ---
  async function getBlockInfo(signature) {
    if (CACHE.has(signature)) return CACHE.get(signature);
    if (PENDING.has(signature)) return PENDING.get(signature);

    const promise = (async () => {
      try {
        const res = await fetch(`${API_URL}/tx/${signature}`, {
          headers: { 'ngrok-skip-browser-warning': 'true' }
        });
        if (!res.ok) return null;
        const data = await res.json();
        if (data) CACHE.set(signature, data);
        return data;
      } catch {
        return null;
      } finally {
        PENDING.delete(signature);
      }
    })();

    PENDING.set(signature, promise);
    return promise;
  }

  function extractSignature(url) {
    const match = url.match(/(?:solscan\.io|solana\.fm|explorer\.solana\.com)\/tx\/([A-HJ-NP-Za-km-z1-9]{80,90})/);
    return match ? match[1] : null;
  }

  function formatSlot(slot) {
    const str = slot.toString();
    if (str.length > 6) {
      return str.slice(0, 3) + '...' + str.slice(-3);
    }
    return str;
  }

  // --- 3. Add column headers ---
  function addHeaders() {
    const panels = document.querySelectorAll(
      '[class*="min-w-[292px]"][class*="max-w-[292px]"]'
    );
    let panel = null;
    for (const p of panels) {
      if (p.getBoundingClientRect().width > 0) {
        panel = p;
        break;
      }
    }
    if (!panel) return false;

    const headerRow = panel.querySelector(
      '[class*="max-h-[28px]"][class*="min-h-[28px]"]'
    );
    if (!headerRow || headerRow.querySelector(".axiom-custom-header")) {
      return true;
    }

    const idxHeader = document.createElement("div");
    idxHeader.className = "axiom-custom-header";
    idxHeader.style.minWidth = IDX_COL_WIDTH + "px";
    idxHeader.style.maxWidth = IDX_COL_WIDTH + "px";
    idxHeader.innerHTML = `<span>Tx Idx</span>`;

    const blkHeader = document.createElement("div");
    blkHeader.className = "axiom-custom-header";
    blkHeader.style.minWidth = BLK_COL_WIDTH + "px";
    blkHeader.style.maxWidth = BLK_COL_WIDTH + "px";
    blkHeader.innerHTML = `<span>Block</span>`;

    headerRow.appendChild(idxHeader);
    headerRow.appendChild(blkHeader);
    return true;
  }

  // --- 4. Process transaction rows ---
  function findTxRow(link) {
    let el = link.parentElement;
    for (let i = 0; i < 10 && el; i++) {
      const style = window.getComputedStyle(el);
      const isRow = style.display === 'flex' || style.display === 'grid' ||
                    el.tagName === 'TR' || /row|item|trade|transaction/.test(el.className);
      if (isRow && el.offsetWidth > 200) return el;
      el = el.parentElement;
    }
    return link.parentElement;
  }

  function createInfoEl(info) {
    const el = document.createElement('div');
    el.className = 'axiom-tx-info-container';
    const idx = info.txIndex !== null ? `#${info.txIndex + 1}` : '-';
    el.innerHTML = `
      <div class="axiom-col axiom-col-idx">
        <span class="axiom-value">${idx}</span>
      </div>
      <div class="axiom-col axiom-col-blk">
        <span class="axiom-value" title="${info.slot.toLocaleString()}">${formatSlot(info.slot)}</span>
      </div>
    `;
    return el;
  }

  function createLoader() {
    const el = document.createElement('div');
    el.className = 'axiom-tx-info-container axiom-loading';
    el.innerHTML = '<div class="axiom-col"><span class="axiom-spinner"></span></div>';
    return el;
  }

  async function processLink(link) {
    if (link.dataset.axiomProcessed) return;
    link.dataset.axiomProcessed = 'true';

    const sig = extractSignature(link.href);
    if (!sig) return;

    const row = findTxRow(link);
    if (!row || row.dataset.axiomProcessed) return;
    row.dataset.axiomProcessed = 'true';

    const loader = createLoader();
    row.appendChild(loader);

    const info = await getBlockInfo(sig);
    loader.remove();

    if (info?.slot) {
      row.appendChild(createInfoEl(info));
    }
  }

  function processAllLinks() {
    addHeaders();
    document.querySelectorAll('a[href*="solscan.io/tx/"], a[href*="solana.fm/tx/"], a[href*="explorer.solana.com/tx/"]')
      .forEach(link => !link.dataset.axiomProcessed && processLink(link));
  }

  // --- 5. Initialize ---
  async function init() {
    try {
      const res = await fetch(API_URL, {
        headers: { 'ngrok-skip-browser-warning': 'true' }
      });
      if (!res.ok) throw new Error();
    } catch {
      console.warn('Axiom TX Info: API not available at', API_URL);
      return;
    }

    console.log('Axiom TX Info: Ready');

    // Initial processing
    setTimeout(processAllLinks, 1000);

    // Watch for DOM changes
    new MutationObserver(() => {
      processAllLinks();
    }).observe(document.body, { childList: true, subtree: true });

    // Poll for virtual scroll re-renders
    setInterval(processAllLinks, POLL_INTERVAL);
  }

  if (document.readyState === "complete") {
    init();
  } else {
    window.addEventListener("load", init);
  }
})();
