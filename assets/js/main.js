/* =========================================================
   影叙文化 · 官网 交互脚本
   无依赖 / 原生 JS / 全部动效可被 prefers-reduced-motion 关闭
   ========================================================= */
(() => {
  'use strict';

  const $  = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(pointer: fine)').matches;

  /* ---------------------------------------------------------
     1. 载入层：数字从 00 走到 100，然后整屏上移
     --------------------------------------------------------- */
  const loader = $('#loader');
  const loaderNum = $('#loaderNum');
  document.body.classList.add('is-locked');

  let loaderDone = false;
  const finishLoader = () => {
    if (loaderDone || !loader) return;
    loaderDone = true;
    loaderNum.textContent = '100';
    loader.classList.add('is-done');
    document.body.classList.remove('is-locked');
    setTimeout(() => loader.remove(), 1400);
  };

  if (reduce) {
    finishLoader();
  } else {
    const t0 = performance.now();
    const DURATION = 1150;
    const step = (t) => {
      const p = clamp((t - t0) / DURATION);
      const eased = 1 - Math.pow(1 - p, 3);
      loaderNum.textContent = String(Math.round(eased * 100)).padStart(2, '0');
      if (p < 1) requestAnimationFrame(step);
      else setTimeout(finishLoader, 200);
    };
    requestAnimationFrame(step);
    setTimeout(finishLoader, 4000); // 兜底
  }

  /* ---------------------------------------------------------
     2. HERO 海报墙：5 列，每列 2 张循环，纵向漂移
     --------------------------------------------------------- */
  const wall = $('#wall');
  if (wall) {
    const posters = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'];
    const COLUMNS = 5;
    for (let c = 0; c < COLUMNS; c++) {
      const col = document.createElement('div');
      col.className = 'wall-col';
      const pair = [posters[(c * 2) % 6], posters[(c * 2 + 1) % 6]];
      // 两轮，保证 -50% 位移无缝
      for (let r = 0; r < 2; r++) {
        pair.forEach((name, i) => {
          const img = document.createElement('img');
          img.src = `assets/posters/${name}.webp`;
          img.alt = '';
          img.loading = c === 0 && r === 0 && i === 0 ? 'eager' : 'lazy';
          img.width = 540;
          img.height = 960;
          col.appendChild(img);
        });
      }
      wall.appendChild(col);
    }
  }

  /* ---------------------------------------------------------
     3. 自定义光标
     --------------------------------------------------------- */
  const cursor = $('#cursor');
  const cursorLabel = cursor ? $('.cursor__label', cursor) : null;
  const LABELS = { view: '查看', play: '播放', talk: '聊聊', mail: '写信', home: '首页' };

  if (cursor && finePointer && !reduce) {
    document.body.classList.add('has-cursor');
    let tx = window.innerWidth / 2, ty = window.innerHeight / 2;
    let cx = tx, cy = ty;

    window.addEventListener('mousemove', (e) => {
      tx = e.clientX; ty = e.clientY;
      cursor.classList.add('is-visible');
    }, { passive: true });

    document.addEventListener('mouseleave', () => cursor.classList.remove('is-visible'));

    const loop = () => {
      cx += (tx - cx) * 0.18;
      cy += (ty - cy) * 0.18;
      cursor.style.transform = `translate3d(${cx}px, ${cy}px, 0) translate(-50%, -50%)`;
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);

    const setActive = (el) => {
      const key = el.dataset.cursor;
      cursor.classList.add('is-active');
      cursorLabel.textContent = LABELS[key] || '查看';
    };
    const clearActive = () => cursor.classList.remove('is-active');

    document.addEventListener('mouseover', (e) => {
      const el = e.target.closest('[data-cursor]');
      if (el) setActive(el);
    });
    document.addEventListener('mouseout', (e) => {
      const el = e.target.closest('[data-cursor]');
      if (el && !el.contains(e.relatedTarget)) clearActive();
    });
  }

  /* ---------------------------------------------------------
     4. 磁吸按钮
     --------------------------------------------------------- */
  if (finePointer && !reduce) {
    $$('.mag').forEach((el) => {
      el.addEventListener('mousemove', (e) => {
        const r = el.getBoundingClientRect();
        const mx = e.clientX - r.left - r.width / 2;
        const my = e.clientY - r.top - r.height / 2;
        el.style.transform = `translate(${mx * 0.16}px, ${my * 0.22}px)`;
      });
      el.addEventListener('mouseleave', () => { el.style.transform = ''; });
    });
  }

  /* ---------------------------------------------------------
     5. 标题字符级拆分
     --------------------------------------------------------- */
  const splitTargets = $$('[data-split]');
  splitTargets.forEach((el) => {
    const nodes = Array.from(el.childNodes);
    el.textContent = '';
    let i = 0;
    nodes.forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        Array.from(node.textContent).forEach((ch) => {
          if (ch === ' ') {
            el.appendChild(document.createTextNode('\u00A0'));
            return;
          }
          const span = document.createElement('span');
          span.className = 'ch';
          span.style.setProperty('--i', i++);
          span.textContent = ch;
          el.appendChild(span);
        });
      } else if (node.nodeName === 'BR') {
        el.appendChild(document.createElement('br'));
      } else {
        el.appendChild(node.cloneNode(true));
      }
    });
    el.classList.add('split');
  });

  /* ---------------------------------------------------------
     6. 滚动出现 / 标题入场
     --------------------------------------------------------- */
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('in', 'is-in');
      io.unobserve(entry.target);
    });
  }, { threshold: 0.16, rootMargin: '0px 0px -8% 0px' });

  $$('[data-reveal], [data-split]').forEach((el) => io.observe(el));

  // 时间轴整块入场（触发进度线绘制）
  const timeline = $('#timeline');
  if (timeline) io.observe(timeline);

  /* ---------------------------------------------------------
     7. 数字滚动
     --------------------------------------------------------- */
  const countIO = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      countIO.unobserve(el);
      const target = parseFloat(el.dataset.count || '0');
      const decimals = parseInt(el.dataset.decimals || '0', 10);
      if (reduce) { el.textContent = target.toFixed(decimals); return; }
      const dur = 1500;
      const start = performance.now();
      const run = (now) => {
        const p = clamp((now - start) / dur);
        const eased = 1 - Math.pow(1 - p, 4);
        el.textContent = (target * eased).toFixed(decimals);
        if (p < 1) requestAnimationFrame(run);
        else el.textContent = target.toFixed(decimals);
      };
      requestAnimationFrame(run);
    });
  }, { threshold: 0.5 });
  $$('[data-count]').forEach((el) => countIO.observe(el));

  /* ---------------------------------------------------------
     8. 手风琴
     --------------------------------------------------------- */
  const acc = $('#acc');
  let accItems = [];
  if (acc) {
    const items = $$('.acc__item', acc);
    accItems = items;
    items.forEach((item) => {
      const head = $('.acc__head', item);
      const body = $('.acc__body', item);
      head.addEventListener('click', () => {
        const open = head.getAttribute('aria-expanded') === 'true';
        items.forEach((other) => {
          const oh = $('.acc__head', other);
          const ob = $('.acc__body', other);
          oh.setAttribute('aria-expanded', 'false');
          ob.style.height = '0px';
        });
        if (!open) {
          head.setAttribute('aria-expanded', 'true');
          body.style.height = body.scrollHeight + 'px';
        }
      });
    });

    // 默认展开第一条，避免整段看起来是空的
    const firstHead = $('.acc__head', items[0]);
    const firstBody = $('.acc__body', items[0]);
    if (firstHead && firstBody) {
      firstHead.setAttribute('aria-expanded', 'true');
      firstBody.style.height = firstBody.scrollHeight + 'px';
    }
  }

  /* ---------------------------------------------------------
     9. 作品走廊：滚动钉住 + 横向位移
     --------------------------------------------------------- */
  const pin = $('#works');
  const pinSticky = $('.pin__sticky');
  const track = $('#pinTrack');
  const pinBar = $('#pinBar');
  const pinIdx = $('#pinIdx');
  let pinDistance = 0;
  let pinTop = 0;
  let pinned = false;

  const layoutPin = () => {
    if (!pin || !track) return;
    pinned = window.innerWidth > 900 && !reduce;
    pin.style.height = '';
    track.style.transform = '';

    if (!pinned) { pinDistance = 0; return; }

    const viewport = track.parentElement;
    pinDistance = Math.max(0, track.scrollWidth - viewport.clientWidth);
    if (pinDistance < 40) { pinDistance = 0; return; }

    pin.style.height = `${Math.round(window.innerHeight + pinDistance)}px`;
    pinTop = pin.offsetTop;
  };

  const onPinScroll = () => {
    if (!pinned || pinDistance <= 0) return;
    const p = clamp((window.scrollY - pinTop) / pinDistance);
    track.style.transform = `translate3d(${(-p * pinDistance).toFixed(2)}px, 0, 0)`;
    if (pinBar) pinBar.style.width = `${(p * 100).toFixed(1)}%`;
    if (pinIdx) {
      const total = track.querySelectorAll('.card').length || 1;
      const n = Math.min(total, Math.round(p * (total - 1)) + 1);
      pinIdx.textContent = String(n).padStart(2, '0');
    }
  };

  /* 移动端：横向拖动 */
  if (track) {
    let down = false, startX = 0, startLeft = 0, moved = false;
    track.addEventListener('pointerdown', (e) => {
      if (pinned) return;
      down = true; moved = false;
      startX = e.clientX; startLeft = track.scrollLeft;
      track.setPointerCapture?.(e.pointerId);
    });
    track.addEventListener('pointermove', (e) => {
      if (!down || pinned) return;
      const dx = e.clientX - startX;
      if (Math.abs(dx) > 6) moved = true;
      track.scrollLeft = startLeft - dx;
    });
    const up = () => { down = false; };
    track.addEventListener('pointerup', up);
    track.addEventListener('pointercancel', up);
    track.addEventListener('click', (e) => {
      if (moved) { e.preventDefault(); e.stopPropagation(); }
    }, true);
  }

  /* ---------------------------------------------------------
     10. 卡片 3D 倾斜 + 高光跟随
     --------------------------------------------------------- */
  if (finePointer && !reduce) {
    $$('[data-tilt]').forEach((card) => {
      card.addEventListener('mousemove', (e) => {
        if (window.innerWidth <= 900) return;
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width;
        const py = (e.clientY - r.top) / r.height;
        const ry = (px - 0.5) * 10;
        const rx = (0.5 - py) * 8;
        card.style.transform =
          `perspective(1000px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) translateY(-6px)`;
        card.style.setProperty('--mx', `${(px * 100).toFixed(1)}%`);
        card.style.setProperty('--my', `${(py * 100).toFixed(1)}%`);
      });
      card.addEventListener('mouseleave', () => { card.style.transform = ''; });
    });
  }

  /* ---------------------------------------------------------
     11. 顶部进度 / 头部收缩 / 侧边点 / 浮动按钮
     --------------------------------------------------------- */
  const head = $('#head');
  const progress = $('#progress');
  const floatCta = $('#floatCta');
  const contact = $('#contact');
  const dots = $$('#dots a');

  let ticking = false;

  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const y = window.scrollY;
      const max = document.documentElement.scrollHeight - window.innerHeight;

      if (progress) progress.style.transform = `scaleX(${max > 0 ? clamp(y / max) : 0})`;
      if (head) head.classList.toggle('is-stuck', y > 40);

      if (floatCta) {
        const contactTop = contact ? contact.offsetTop : Infinity;
        const show = y > window.innerHeight * 0.85 && y < contactTop - window.innerHeight * 0.55;
        floatCta.classList.toggle('is-on', show);
      }

      // 首屏海报墙随滚动轻微下沉，制造景深
      if (wall && y < window.innerHeight * 1.2 && !reduce) {
        wall.style.transform = `translate3d(0, ${(y * 0.16).toFixed(1)}px, 0)`;
        wall.style.opacity = String(Math.max(0.25, 1 - y / (window.innerHeight * 1.1)));
      }

      onPinScroll();
      ticking = false;
    });
  };

  window.addEventListener('scroll', onScroll, { passive: true });

  /* 侧边章节高亮 */
  if (dots.length) {
    const sections = dots
      .map((a) => {
        const id = a.dataset.dot;
        const el = id === 'top' ? $('.hero') : document.getElementById(id);
        return el ? { a, el } : null;
      })
      .filter(Boolean);

    const secIO = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const picked = sections.find((s) => s.el === entry.target);
        if (!picked) return;
        dots.forEach((d) => d.classList.remove('is-active'));
        picked.a.classList.add('is-active');
      });
    }, { rootMargin: '-46% 0px -46% 0px', threshold: 0 });

    sections.forEach((s) => secIO.observe(s.el));
  }

  /* ---------------------------------------------------------
     12. 锚点平滑滚动（避开固定头部）
     --------------------------------------------------------- */
  $$('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      if (!id || id === '#') return;
      const target = id === '#top' ? document.body : document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      const top = id === '#top' ? 0 : target.getBoundingClientRect().top + window.scrollY - 62;
      window.scrollTo({ top, behavior: reduce ? 'auto' : 'smooth' });
    });
  });

  /* ---------------------------------------------------------
     14. 样片弹窗
     --------------------------------------------------------- */
  const reel = $('#reel');
  const reelVideo = $('#reelVideo');
  const reelTitle = $('#reelTitle');
  const reelGenre = $('#reelGenre');
  const reelMeta = $('#reelMeta');

  const openReel = (card) => {
    if (!reel || !reelVideo) return;
    reelVideo.src = card.dataset.video;
    const img = card.querySelector('img');
    if (img) reelVideo.poster = img.currentSrc || img.src;
    if (reelTitle) reelTitle.textContent = card.dataset.title;
    if (reelGenre) reelGenre.textContent = card.dataset.genre;
    if (reelMeta) reelMeta.textContent = card.dataset.meta;
    reel.classList.add('is-open');
    reel.setAttribute('aria-hidden', 'false');
    document.body.classList.add('is-locked');
    reelVideo.muted = false;
    const playing = reelVideo.play();
    if (playing) {
      playing.catch(() => {
        // 浏览器拦截带声音的自动播放时，退回静音播放
        reelVideo.muted = true;
        reelVideo.play().catch(() => {});
      });
    }
  };

  const closeReel = () => {
    if (!reel || !reel.classList.contains('is-open')) return;
    reel.classList.remove('is-open');
    reel.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('is-locked');
    reelVideo.pause();
    reelVideo.removeAttribute('src');
    reelVideo.load();
  };

  // 外部样片卡：直接开文档
  $$('.card[data-href]').forEach((card) => {
    const open = () => window.open(card.dataset.href, '_blank', 'noopener');
    card.addEventListener('click', open);
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
    });
  });

  $$('.card[data-video]').forEach((card) => {
    card.addEventListener('click', () => openReel(card));
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openReel(card); }
    });
  });
  $('#reelClose')?.addEventListener('click', closeReel);
  reel?.addEventListener('click', (e) => { if (e.target.dataset.close) closeReel(); });
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeReel(); });

  /* ---------------------------------------------------------
     13. 收尾：年份 / 尺寸变化
     --------------------------------------------------------- */
  const year = $('#year');
  if (year) year.textContent = String(new Date().getFullYear());

  let rt;
  const onResize = () => {
    clearTimeout(rt);
    rt = setTimeout(() => {
      layoutPin();
      onScroll();
      accItems.forEach((item) => {
        const head = $('.acc__head', item);
        const body = $('.acc__body', item);
        if (head && body && head.getAttribute('aria-expanded') === 'true') {
          body.style.height = body.scrollHeight + 'px';
        }
      });
    }, 160);
  };
  window.addEventListener('resize', onResize);

  window.addEventListener('load', () => { layoutPin(); onScroll(); });

  // 图片加载完后重新测量（避免高度变化导致钉住距离算错）
  window.addEventListener('load', () => {
    setTimeout(() => { layoutPin(); onScroll(); }, 300);
  });

  layoutPin();
  onScroll();
})();
