/**
 * <best-sellers-carousel> — the Best Sellers section's own 3D coverflow,
 * built to design_handoff_best_sellers/. A dominant center card with two
 * receded, scaled, rotated side neighbours; advanced by the section's
 * arrows/dots, a horizontal swipe, or the arrow keys. Scoped entirely to
 * this section's data-bs-* hooks — it touches no shared carousel, header or
 * footer logic anywhere else in the theme.
 *
 * Geometry is fixed per the handoff (not derived from measured widths, which
 * was the earlier "cards overlapping with zero gap" bug): center-to-center
 * separation is a fixed 300px on desktop / 400px on mobile, so side cards
 * sit clearly apart from (desktop) or fully outside (mobile) the center.
 *
 * Vertical page scroll is never blocked: the stage carries touch-action:
 * pan-y and this script never calls preventDefault on a scroll gesture — a
 * horizontal swipe past the threshold navigates, anything else is left to
 * the page.
 */
class BestSellersCarousel extends HTMLElement {
  static TRANSITION_MS = 900;
  static EASING = 'cubic-bezier(0.22, 0.61, 0.36, 1)';
  static SWIPE_THRESHOLD = 50; // px of horizontal travel that counts as a swipe

  // Fixed depth/geometry per breakpoint (handoff §Desktop/Mobile Composition).
  static DESKTOP = { sep: 300, rot: 6, scale: 0.9, opacity: 0.53, tz: -60 };
  static MOBILE = { sep: 400, rot: 3.6, scale: 0.92, opacity: 0.45, tz: -30 };

  #active = 0;
  #locked = false;
  #lockTimer = 0;
  #resizeRaf = 0;
  #mqlDesktop = window.matchMedia('(min-width: 750px)');
  #mqlReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  connectedCallback() {
    this.track = this.querySelector('[data-bs-track]');
    this.slides = Array.from(this.querySelectorAll('[data-bs-slide]'));
    this.prevButton = this.querySelector('[data-bs-prev]');
    this.nextButton = this.querySelector('[data-bs-next]');
    this.dots = Array.from(this.querySelectorAll('[data-bs-dot]'));

    if (!this.track || this.slides.length === 0) return;

    this.prevButton?.addEventListener('click', () => this.go(this.#active - 1));
    this.nextButton?.addEventListener('click', () => this.go(this.#active + 1));
    this.dots.forEach((dot, index) => dot.addEventListener('click', () => this.go(index)));

    // A click on a side card recenters it (and must NOT follow the card's PDP
    // link or trigger the shared product-card's own navigation). Capture phase
    // lets us pre-empt both before the inner <a>/<product-card> sees the click.
    // The bag chip is exempt so add-to-cart still works from a side card.
    this.slides.forEach((slide, index) => {
      slide.addEventListener(
        'click',
        (event) => {
          if (this.#offsetOf(index) === 0) return; // center: normal behaviour
          if (event.target.closest('button')) return; // let the bag chip work
          event.preventDefault();
          event.stopPropagation();
          this.go(index);
        },
        true
      );
    });

    this.track.addEventListener('pointerdown', this.#onPointerDown);

    this.addEventListener('keydown', this.#onKeydown);
    if (!this.hasAttribute('tabindex')) this.setAttribute('tabindex', '0');

    window.addEventListener('resize', this.#onResize, { passive: true });

    this.render({ instant: true });
    this.#fitHeight();
    // Re-fit once web fonts land, since text wrapping (and therefore each
    // card's natural height) can change after the fonts swap in.
    document.fonts?.ready.then(() => this.#fitHeight());
  }

  disconnectedCallback() {
    window.removeEventListener('resize', this.#onResize);
    clearTimeout(this.#lockTimer);
  }

  #onResize = () => {
    cancelAnimationFrame(this.#resizeRaf);
    this.#resizeRaf = requestAnimationFrame(() => {
      this.render({ instant: true });
      this.#fitHeight();
    });
  };

  /**
   * Size the stage to the tallest card's natural height so a full-scale
   * (center) card is never clipped by the stage's overflow:hidden. The
   * earlier fixed height was tuned to a single-line-price card, so a
   * discounted product (compare-at + sale = an extra price line) or a
   * two-line title made the center card taller than the stage and its last
   * line — the sale price — was cut off. offsetHeight is the card's layout
   * height, unaffected by the scale transform, so this measures the true
   * natural height of every card and fits the tallest. Content-driven, so it
   * holds for any product, title length, or currency without hardcoding.
   */
  #fitHeight = () => {
    if (!this.track || !this.slides || this.slides.length === 0) return;
    let max = 0;
    for (const slide of this.slides) {
      if (slide.offsetHeight > max) max = slide.offsetHeight;
    }
    if (max > 0) this.track.style.height = `${max}px`;
  };

  #onKeydown = (event) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      this.go(this.#active - 1);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      this.go(this.#active + 1);
    }
  };

  /** Signed, wrapped distance of a slide from the active one (…-1, 0, 1…). */
  #offsetOf(index) {
    const len = this.slides.length;
    let offset = index - this.#active;
    if (offset > len / 2) offset -= len;
    if (offset < -len / 2) offset += len;
    return offset;
  }

  /**
   * Advance to a slide. Wraps around, and ignores input while a transition is
   * in flight so one click/swipe is always exactly one step (handoff: "ignore
   * additional nav input until the in-flight transition completes").
   */
  go(index) {
    if (this.#locked) return;
    const len = this.slides.length;
    const next = ((index % len) + len) % len;
    if (next === this.#active) return;

    this.#active = next;
    this.render();

    if (this.#mqlReducedMotion.matches) return;
    this.#locked = true;
    clearTimeout(this.#lockTimer);
    this.#lockTimer = setTimeout(() => {
      this.#locked = false;
    }, BestSellersCarousel.TRANSITION_MS + 30);
  }

  /** @param {{ instant?: boolean }} [options] */
  render({ instant = false } = {}) {
    const cfg = this.#mqlDesktop.matches ? BestSellersCarousel.DESKTOP : BestSellersCarousel.MOBILE;
    const animate = !instant && !this.#mqlReducedMotion.matches;
    const transition = animate
      ? `transform ${BestSellersCarousel.TRANSITION_MS}ms ${BestSellersCarousel.EASING}, opacity ${BestSellersCarousel.TRANSITION_MS}ms ${BestSellersCarousel.EASING}`
      : 'none';

    this.slides.forEach((slide, index) => {
      const offset = this.#offsetOf(index);
      const abs = Math.abs(offset);
      const dir = offset === 0 ? 0 : offset > 0 ? 1 : -1;

      const scale = abs === 0 ? 1 : cfg.scale;
      const rotate = abs === 0 ? 0 : -dir * cfg.rot; // left tilts +, right tilts − (both away)
      const tz = abs === 0 ? 0 : cfg.tz;
      const tx = offset * cfg.sep;
      const opacity = abs === 0 ? 1 : abs === 1 ? cfg.opacity : 0;
      const zIndex = abs === 0 ? 3 : abs === 1 ? 2 : 1;
      const pointerEvents = abs <= 1 ? 'auto' : 'none';

      slide.style.transition = transition;
      slide.style.transform = `translateX(${tx}px) translateZ(${tz}px) rotateY(${rotate}deg) scale(${scale})`;
      slide.style.opacity = String(opacity);
      slide.style.zIndex = String(zIndex);
      slide.style.pointerEvents = pointerEvents;
      slide.setAttribute('aria-hidden', String(abs !== 0));

      const productCard = slide.querySelector('product-card');
      if (productCard) productCard.toggleAttribute('data-no-navigation', abs !== 0);

      slide.querySelectorAll('a, button, input').forEach((control) => {
        if (abs === 0) control.removeAttribute('tabindex');
        else control.setAttribute('tabindex', '-1');
      });
    });

    this.dots.forEach((dot, index) => dot.classList.toggle('is-active', index === this.#active));
  }

  // Swipe: decide on release, then run the same transition system as the
  // arrows (handoff: "arrow click and swipe both trigger the identical
  // transition"). The cards do not follow the finger mid-drag.
  #onPointerDown = (event) => {
    if (event.button !== undefined && event.button !== 0) return;

    const startX = event.clientX;
    const startY = event.clientY;
    let decided = null; // null → undecided, true → horizontal, false → vertical

    const onMove = (moveEvent) => {
      if (decided !== null) return;
      const dx = Math.abs(moveEvent.clientX - startX);
      const dy = Math.abs(moveEvent.clientY - startY);
      if (dx < 6 && dy < 6) return;
      decided = dx > dy; // vertical intent is left entirely to the page scroll
    };

    const onUp = (upEvent) => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      if (decided !== true) return;
      const dx = upEvent.clientX - startX;
      if (dx <= -BestSellersCarousel.SWIPE_THRESHOLD) this.go(this.#active + 1);
      else if (dx >= BestSellersCarousel.SWIPE_THRESHOLD) this.go(this.#active - 1);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  };
}

if (!customElements.get('best-sellers-carousel')) {
  customElements.define('best-sellers-carousel', BestSellersCarousel);
}
