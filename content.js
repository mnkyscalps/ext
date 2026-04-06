// Axiom TX Info - Content Script

(function () {
  'use strict';

  // === CONFIG ===
  const API_URL = 'https://ecotypically-undelayed-teodora.ngrok-free.dev';

  const CACHE = new Map();
  const PENDING = new Map();

  async function getBlockInfo(signature) {
    if (CACHE.has(signature)) return CACHE.get(signature);
    if (PENDING.has(signature)) return PENDING.get(signature);

    const promise = (async () => {
      try {
        const res = await fetch(`${API_URL}/tx/${signature}`);
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
    if (slot >= 1e9) return (slot / 1e9).toFixed(2) + 'B';
    if (slot >= 1e6) return (slot / 1e6).toFixed(1) + 'M';
    return slot.toLocaleString();
  }

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
    const idx = info.txIndex !== null ? `#${info.txIndex + 1}/${info.totalTxs}` : '-';
    el.innerHTML = `
      <div class="axiom-col axiom-col-idx">
        <span class="axiom-label">IDX</span>
        <span class="axiom-value">${idx}</span>
      </div>
      <div class="axiom-col axiom-col-blk">
        <span class="axiom-label">BLOCK</span>
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
    document.querySelectorAll('a[href*="solscan.io/tx/"], a[href*="solana.fm/tx/"], a[href*="explorer.solana.com/tx/"]')
      .forEach(link => !link.dataset.axiomProcessed && processLink(link));
  }

  function observe() {
    let timeout;
    new MutationObserver(() => {
      clearTimeout(timeout);
      timeout = setTimeout(processAllLinks, 300);
    }).observe(document.body, { childList: true, subtree: true });
  }

  async function init() {
    try {
      const res = await fetch(API_URL);
      if (!res.ok) throw new Error();
    } catch {
      console.warn('Axiom TX Info: API not available at', API_URL);
      return;
    }

    console.log('Axiom TX Info: Ready');
    setTimeout(processAllLinks, 1000);
    observe();

    let scrollTimeout;
    window.addEventListener('scroll', () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(processAllLinks, 500);
    }, { passive: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
