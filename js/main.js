/**
 * portfolio/js/main.js
 * 本田 貴裕 — AI Development Portfolio
 *
 * 責務ごとに関数を分離（単一責任の原則）
 * - initNav()         : ナビゲーション スクロール・ハンバーガー
 * - initReveal()      : スクロールアニメーション（IntersectionObserver）
 * - initSkillBars()   : スキルバー アニメーション
 */

'use strict';

/* ─── 定数 ──────────────────────────────────────────────────────────
   マジックナンバーを定数化して可読性・保守性を向上
──────────────────────────────────────────────────────────────────── */
const CONFIG = Object.freeze({
  NAV_SCROLL_THRESHOLD: 10,       // px: ナビにシャドウが付くスクロール量
  REVEAL_THRESHOLD: 0.05,         // IntersectionObserver しきい値
  SKILL_BAR_THRESHOLD: 0.3,       // スキルバー発火しきい値
  SKILL_BAR_DELAY_MS: 200,        // スキルバーアニメーション開始遅延
  WIDTH_MIN: 0,                   // data-width 許容最小値
  WIDTH_MAX: 100,                 // data-width 許容最大値
});

/* ─── ユーティリティ ────────────────────────────────────────────────
   セキュリティ: 外部入力値を安全に数値へ変換するバリデーター
──────────────────────────────────────────────────────────────────── */

/**
 * data-width 属性をサニタイズして安全な数値を返す。
 * 数値以外・範囲外はすべて 0 にフォールバックする。
 * （CSS Injection 対策: 属性値を直接 style に渡さない）
 *
 * @param {string | null} raw - data-width 属性の生文字列
 * @returns {number} 0–100 の整数
 */
function sanitizeWidth(raw) {
  const parsed = parseInt(raw, 10);
  if (Number.isNaN(parsed)) return 0;
  return Math.min(CONFIG.WIDTH_MAX, Math.max(CONFIG.WIDTH_MIN, parsed));
}

/* ─── initNav ───────────────────────────────────────────────────────
   責務: スクロール時のナビシャドウ付与 + ハンバーガーメニュー制御
──────────────────────────────────────────────────────────────────── */
function initNav() {
  const nav       = document.getElementById('mainNav');
  const hamburger = document.getElementById('hamburger');
  const mobileNav = document.getElementById('mobileNav');
  const mobileClose = document.getElementById('mobileClose');

  // 要素が存在しない場合は安全に終了（部分的なHTMLでも壊れない）
  if (!nav || !hamburger || !mobileNav || !mobileClose) return;

  // スクロールシャドウ（passive: true でスクロールパフォーマンスを保護）
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > CONFIG.NAV_SCROLL_THRESHOLD);
  }, { passive: true });

  // ハンバーガー開閉 — aria-expanded を同期して a11y を担保
  const openMobileNav = () => {
    mobileNav.classList.add('open');
    hamburger.setAttribute('aria-expanded', 'true');
    mobileNav.removeAttribute('aria-hidden');
  };

  const closeMobileNav = () => {
    mobileNav.classList.remove('open');
    hamburger.setAttribute('aria-expanded', 'false');
    mobileNav.setAttribute('aria-hidden', 'true');
  };

  hamburger.addEventListener('click', openMobileNav);
  mobileClose.addEventListener('click', closeMobileNav);

  // モバイルNav 内のリンクをクリックしたら閉じる
  mobileNav.querySelectorAll('a').forEach(anchor => {
    anchor.addEventListener('click', closeMobileNav);
  });

  // ESC キーで閉じる（キーボード操作対応）
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && mobileNav.classList.contains('open')) {
      closeMobileNav();
      hamburger.focus(); // フォーカスを戻す
    }
  });
}

/* ─── initReveal ────────────────────────────────────────────────────
   責務: .reveal 要素のスクロールフェードイン制御
──────────────────────────────────────────────────────────────────── */
function initReveal() {
  // JS 有効フラグを body に付与（CSS の .js-ready セレクタと連動）
  document.body.classList.add('js-ready');

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('show');
        observer.unobserve(entry.target); // 一度表示したら監視解除（メモリ節約）
      }
    });
  }, { threshold: CONFIG.REVEAL_THRESHOLD });

  document.querySelectorAll('.reveal').forEach(el => {
    const rect = el.getBoundingClientRect();
    // 初期表示時にすでにビューポート内にある要素は即時表示
    if (rect.top < window.innerHeight) {
      el.classList.add('show');
    } else {
      observer.observe(el);
    }
  });
}

/* ─── initSkillBars ─────────────────────────────────────────────────
   責務: スキルバーのスクロールトリガーアニメーション
   セキュリティ: data-width を sanitizeWidth() で検証してから適用
──────────────────────────────────────────────────────────────────── */
function initSkillBars() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;

      entry.target.querySelectorAll('.skill-bar-fill').forEach(fill => {
        // 🔒 セキュリティ修正: 属性値を検証してから style に反映
        const safeWidth = sanitizeWidth(fill.getAttribute('data-width'));
        setTimeout(() => {
          fill.style.width = `${safeWidth}%`; // テンプレートリテラルで型明確化
        }, CONFIG.SKILL_BAR_DELAY_MS);
      });

      observer.unobserve(entry.target);
    });
  }, { threshold: CONFIG.SKILL_BAR_THRESHOLD });

  document.querySelectorAll('.skill-bars').forEach(el => observer.observe(el));
}

/* ─── initExternalLinks ─────────────────────────────────────────────
   責務: target="_blank" リンクに rel="noopener noreferrer" を自動付与
   セキュリティ: Tabnapping 攻撃対策
──────────────────────────────────────────────────────────────────── */
function initExternalLinks() {
  document.querySelectorAll('a[target="_blank"]').forEach(link => {
    const rel = link.getAttribute('rel') || '';
    const parts = new Set(rel.split(' ').filter(Boolean));
    parts.add('noopener');
    parts.add('noreferrer');
    link.setAttribute('rel', [...parts].join(' '));
  });
}

/* ─── エントリーポイント ─────────────────────────────────────────────
   DOM 構築完了後に全モジュールを初期化
──────────────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  initNav();
  initReveal();
  initSkillBars();
  initExternalLinks();
});
