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
  const VALIDATOR_CACHE = new Map();

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

    .axiom-col-blk .axiom-value {
      cursor: pointer;
    }

    .axiom-col-blk .axiom-value:hover {
      color: #fff;
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

    /* Validator Tooltip */
    .axiom-validator-tooltip {
      position: fixed;
      z-index: 99999;
      background: #1a1b23;
      border: 1px solid #2d2e3a;
      border-radius: 8px;
      padding: 12px;
      min-width: 280px;
      max-width: 320px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }

    .axiom-tooltip-header {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 10px;
      padding-bottom: 10px;
      border-bottom: 1px solid #2d2e3a;
    }

    .axiom-tooltip-icon {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      object-fit: cover;
      background: #2d2e3a;
    }

    .axiom-tooltip-name {
      font-size: 14px;
      font-weight: 600;
      color: #fff;
    }

    .axiom-tooltip-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 4px 0;
    }

    .axiom-tooltip-label {
      font-size: 12px;
      color: #5f6170;
    }

    .axiom-tooltip-value {
      font-size: 12px;
      color: #b3bac9;
      font-family: "Geist Mono", monospace;
    }

    .axiom-tooltip-loading {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      color: #5f6170;
    }

    .axiom-tooltip-error {
      color: #ef4444;
      font-size: 12px;
      text-align: center;
      padding: 10px;
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

  async function getValidatorInfo(slot) {
    const cacheKey = `validator_${slot}`;
    if (VALIDATOR_CACHE.has(cacheKey)) return VALIDATOR_CACHE.get(cacheKey);

    try {
      // First get block info to get the validator (via our proxy API)
      const blockRes = await fetch(`${API_URL}/block/${slot}/info`, {
        headers: { 'ngrok-skip-browser-warning': 'true' }
      });
      if (!blockRes.ok) return null;
      const blockData = await blockRes.json();

      if (!blockData.proposer?.votePubkey) return null;

      // Then get validator details (via our proxy API)
      const validatorRes = await fetch(`${API_URL}/validator/${blockData.proposer.votePubkey}/info`, {
        headers: { 'ngrok-skip-browser-warning': 'true' }
      });
      if (!validatorRes.ok) return null;
      const validatorData = await validatorRes.json();

      const result = {
        block: blockData,
        validator: validatorData
      };

      VALIDATOR_CACHE.set(cacheKey, result);
      return result;
    } catch {
      return null;
    }
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

  function formatStake(lamports) {
    const sol = lamports / 1e9;
    if (sol >= 1e6) return (sol / 1e6).toFixed(2) + 'M SOL';
    if (sol >= 1e3) return (sol / 1e3).toFixed(1) + 'K SOL';
    return sol.toFixed(0) + ' SOL';
  }

  // --- 3. Tooltip Functions ---
  let currentTooltip = null;
  let hoverTimeout = null;
  let isHovering = false;

  function removeTooltip() {
    isHovering = false;
    if (hoverTimeout) {
      clearTimeout(hoverTimeout);
      hoverTimeout = null;
    }
    if (currentTooltip) {
      currentTooltip.remove();
      currentTooltip = null;
    }
  }

  function createTooltip(x, y, height) {
    removeTooltip();
    const tooltip = document.createElement('div');
    tooltip.className = 'axiom-validator-tooltip';
    tooltip.innerHTML = `<div class="axiom-tooltip-loading"><span class="axiom-spinner"></span>&nbsp;Loading...</div>`;

    // Position tooltip below the element
    tooltip.style.left = `${x}px`;
    tooltip.style.top = `${y + height + 5}px`;

    document.body.appendChild(tooltip);
    currentTooltip = tooltip;
    return tooltip;
  }

  function updateTooltip(tooltip, data) {
    if (!data) {
      tooltip.innerHTML = `<div class="axiom-tooltip-error">Failed to load validator info</div>`;
      return;
    }

    const { block, validator } = data;
    const icon = validator.iconUrl || '';
    const name = validator.name || 'Unknown Validator';
    const stake = formatStake(validator.activatedStake || 0);
    const commission = (validator.commission || 0) + '%';
    const location = [validator.city, validator.country].filter(Boolean).join(', ') || 'Unknown';
    const txCount = block.nonVoteTransactions || 0;
    const priorityFees = ((block.priorityFees || 0) / 1e9).toFixed(4) + ' SOL';

    tooltip.innerHTML = `
      <div class="axiom-tooltip-header">
        ${icon ? `<img class="axiom-tooltip-icon" src="${icon}" alt="">` : '<div class="axiom-tooltip-icon"></div>'}
        <div class="axiom-tooltip-name">${name}</div>
      </div>
      <div class="axiom-tooltip-row">
        <span class="axiom-tooltip-label">Stake</span>
        <span class="axiom-tooltip-value">${stake}</span>
      </div>
      <div class="axiom-tooltip-row">
        <span class="axiom-tooltip-label">Commission</span>
        <span class="axiom-tooltip-value">${commission}</span>
      </div>
      <div class="axiom-tooltip-row">
        <span class="axiom-tooltip-label">Location</span>
        <span class="axiom-tooltip-value">${location}</span>
      </div>
      <div class="axiom-tooltip-row">
        <span class="axiom-tooltip-label">Block TXs</span>
        <span class="axiom-tooltip-value">${txCount}</span>
      </div>
      <div class="axiom-tooltip-row">
        <span class="axiom-tooltip-label">Priority Fees</span>
        <span class="axiom-tooltip-value">${priorityFees}</span>
      </div>
    `;
  }

  function handleBlockHover(e, slot) {
    // Clear any pending hover
    if (hoverTimeout) {
      clearTimeout(hoverTimeout);
    }

    isHovering = true;
    const rect = e.target.getBoundingClientRect();

    // Wait 300ms before fetching to avoid rapid requests
    hoverTimeout = setTimeout(async () => {
      if (!isHovering) return;

      const tooltip = createTooltip(rect.left, rect.top, rect.height);

      const data = await getValidatorInfo(slot);
      if (currentTooltip === tooltip && isHovering) {
        updateTooltip(tooltip, data);
      }
    }, 300);
  }

  // --- 4. Add column headers ---
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

  // --- 5. Process transaction rows ---
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
    const slot = info.slot;

    el.innerHTML = `
      <div class="axiom-col axiom-col-idx">
        <span class="axiom-value">${idx}</span>
      </div>
      <div class="axiom-col axiom-col-blk">
        <span class="axiom-value axiom-block-value" data-slot="${slot}">${formatSlot(slot)}</span>
      </div>
    `;

    // Add hover events for block value
    const blockValue = el.querySelector('.axiom-block-value');
    blockValue.addEventListener('mouseenter', (e) => handleBlockHover(e, slot));
    blockValue.addEventListener('mouseleave', removeTooltip);

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

  // --- 6. Initialize ---
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
