/* 路由、PWA 註冊、啟動 */
(function () {
  const { $, $$ } = SS;
  let cleanup = null;
  function route() {
    const name = (location.hash.replace(/^#\/?/, '').split('?')[0]) || 'home';
    const view = SS.views[name] || SS.views.home;
    if (typeof cleanup === 'function') { try { cleanup(); } catch (e) { /* ignore */ } }
    // 每次換頁都換成全新的容器，避免舊頁面的事件監聽殘留
    const old = $('#view');
    const main = old.cloneNode(false);
    old.replaceWith(main);
    main.classList.remove('enter'); void main.offsetWidth; main.classList.add('enter');
    document.body.dataset.view = name;
    const grp = { home: 'home', make: 'make', photo: 'make', character: 'make', phrases: 'make', taigi: 'make', blindbox: 'make', plan: 'make', textsticker: 'make', editor: 'edit', line: 'edit', collection: 'coll', pack: 'coll' }[name] || '';
    $$('#bottom-nav a').forEach((a) => a.classList.toggle('on', a.dataset.nav === grp));
    $('#topbar-title').textContent = view.title || '';
    $('#topbar').hidden = name === 'home' || !SS.views[name];
    document.title = view.title ? `${view.title.replace(/^\S+\s/, '')}｜今天貼什麼？` : '今天貼什麼？｜AI 貼圖製造機 Sticker Studio';
    cleanup = view.render(main);
    window.scrollTo(0, 0);
  }
  SS.router = { rerender: route };
  window.addEventListener('hashchange', route);

  let depth = 0; window.addEventListener('hashchange', () => { depth++; });
  $('#back-btn').addEventListener('click', () => { if (depth > 0) { depth -= 2; history.back(); } else location.hash = '#home'; });
  $('#modal').addEventListener('click', (e) => { if (e.target.id === 'modal' || e.target.closest('.modal-close')) SS.closeModal(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('#modal').hidden) SS.closeModal(); });

  /* PWA 安裝提示 */
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); SS.deferredInstall = e; const b = $('#in-btn'); if (b) b.hidden = false; SS.renderInstallCTA(); });
  window.addEventListener('appinstalled', () => { SS.deferredInstall = null; SS.ls.set('installed', true); SS.renderInstallCTA(); SS.toast('安裝完成 🎉 可以從主畫面開啟了'); });

  /* Service Worker：有新版時提示重新整理 */
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' }).then((reg) => {
        // 已安裝的 App 常常只是「切回前景」而不會重新載入，所以回到前景時主動檢查新版
        const check = () => reg.update().catch(() => {});
        document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') check(); });
        setInterval(check, 30 * 60 * 1000);
        if (reg.waiting && navigator.serviceWorker.controller) { const bar = $('#update-bar'); bar.hidden = false; $('#update-btn').onclick = () => reg.waiting.postMessage('skipWaiting'); }
        reg.addEventListener('updatefound', () => {
          const nw = reg.installing; if (!nw) return;
          nw.addEventListener('statechange', () => {
            if (nw.state === 'installed' && navigator.serviceWorker.controller) {
              const bar = $('#update-bar'); bar.hidden = false;
              $('#update-btn').onclick = () => { nw.postMessage('skipWaiting'); };
            }
          });
        });
      }).catch((err) => console.warn('SW 註冊失敗', err));
      // 只有「從舊版更新」才重新載入；第一次安裝時不重新整理（避免歡迎視窗一閃即逝）
      let reloaded = false; const hadController = !!navigator.serviceWorker.controller;
      navigator.serviceWorker.addEventListener('controllerchange', () => { if (hadController && !reloaded) { reloaded = true; location.reload(); } });
    });
  }
  window.addEventListener('offline', () => SS.toast('目前離線：本機功能仍可使用，外部 AI 網站需要連線'));

  route();
})();
