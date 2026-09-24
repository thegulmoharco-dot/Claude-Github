/**
 * <best-sellers-carousel> — the Best Sellers section's own coverflow-style
 * carousel. A dominant center card with recessed, scaled, rotated side
 * neighbors; advanced by the section's arrows/dots (desktop) or a
 * horizontal drag (touch). Scoped entirely to this section: it defines and
 * consumes only its own data-bs-* hooks and touches no shared carousel,
 * header, or footer logic anywhere else in the theme.
 *
 * Vertical touch scrolling is left untouched throughout — the track never
 * calls preventDefault() until a drag has already proven itself more
 * horizontal than vertical, and CSS touch-action: pan-y backs that up so
 * the page always scrolls normally.
 */
class BestSellersCarousel extends HTMLElement {
  static SIDE_SCALE = 0.9;
  static SIDE_ROTATE_DEG = 4;
  static SIDE_OPACITY = 0.68;
  // Desktop: distance from center to a side card's own center, as a multiple
  // of card width. At SIDE_SCALE = 0.9 a ratio below ~0.95 makes the side
  // card's inner edge cross under the center card (content collision) — 1.02
  // keeps a small, deliberate gap instead, matching the approved [SIDE] gap
  // [CENTER] gap [SIDE] composition rather than an overlapping coverflow.
  static SIDE_OFFSET_RATIO = 1.02;
  static MOBILE_OFF_RATIO = 1.2; // > 1 so a hidden neighbor never leaves a sliver visible
  static SIDE_RECESS_PX = 30; // desktop: subtle translateZ recession for side cards
  static DRAG_THRESHOLD = 6; // px, before a gesture commits to horizontal or vertical
  static SWIPE_COMPLETE_RATIO = 0.18; // fraction of card width that counts as "swiped through"

  #active = 0;
  #mqlDesktop = window.matchMedia('(min-width: 750px)');
  #mqlReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  #resizeRaf = 0;

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

    this.slides.forEach((slide, index) => {
      slide.addEventListener('click', (event) => {
        if (index === this.#active) return;
        // A neighboring card is a preview, not a link: clicking it brings it
        // to center. Real controls inside it (quick-add, quick-view) still
        // work untouched since those are excluded here.
        if (event.target.closest('a, button, input, label')) return;
        event.preventDefault();
        this.go(index);
      });
    });

    this.track.style.touchAction = 'pan-y';
    this.track.addEventListener('pointerdown', this.#onPointerDown);

    this.addEventListener('keydown', this.#onKeydown);
    if (!this.hasAttribute('tabindex')) this.setAttribute('tabindex', '0');

    window.addEventListener('resize', this.#onResize, { passive: true });

    this.render({ instant: true });
  }

  disconnectedCallback() {
    window.removeEventListener('resize', this.#onResize);
  }

  #onResize = () => {
    cancelAnimationFrame(this.#resizeRaf);
    this.#resizeRaf = requestAnimationFrame(() => this.render({ instant: true }));
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

  go(index) {
    const clamped = Math.max(0, Math.min(this.slides.length - 1, index));
    if (clamped === this.#active) return;
    this.#active = clamped;
    this.render();
  }

  /**
   * @param {{ instant?: boolean, dragDx?: number }} [options]
   */
  render({ instant = false, dragDx = 0 } = {}) {
    const isDesktop = this.#mqlDesktop.matches;
    const activeSlide = this.slides[this.#active];
    const cardWidth = activeSlide ? activeSlide.getBoundingClientRect().width : 0;
    const sideOffset = cardWidth * (isDesktop ? BestSellersCarousel.SIDE_OFFSET_RATIO : BestSellersCarousel.MOBILE_OFF_RATIO);
    const instantNow = instant || this.#mqlReducedMotion.matches;

    // While actively dragging, the outgoing center card and the incoming
    // neighbor cross-fade in step with the finger — "the current product
    // physically moves out of focus and the next physically moves into
    // focus" — rather than the neighbor staying hidden until release.
    const dragProgress = cardWidth ? Math.min(Math.abs(dragDx) / cardWidth, 1) : 0;
    const dragDir = dragDx === 0 ? 0 : dragDx < 0 ? 1 : -1; // dragging left reveals the next (distance +1) card

    this.slides.forEach((slide, index) => {
      const distance = index - this.#active;
      const abs = Math.abs(distance);
      const dir = distance === 0 ? 0 : distance > 0 ? 1 : -1;

      let x = dir * sideOffset;
      let z = 0;
      let scale = 1;
      let rotate = 0;
      let opacity = 1;
      let zIndex = 3;
      let pointerEvents = 'auto';

      if (abs === 1 && isDesktop) {
        scale = BestSellersCarousel.SIDE_SCALE;
        rotate = -dir * BestSellersCarousel.SIDE_ROTATE_DEG;
        z = -BestSellersCarousel.SIDE_RECESS_PX;
        opacity = BestSellersCarousel.SIDE_OPACITY;
        zIndex = 2;
      } else if (abs >= 1) {
        // Mobile side/far cards, and desktop cards beyond the immediate
        // neighbors: fully clipped by .gh-bestsellers__stage and inert.
        x = dir * sideOffset * (isDesktop ? abs + 0.5 : 1);
        z = -BestSellersCarousel.SIDE_RECESS_PX * 2;
        scale = BestSellersCarousel.SIDE_SCALE;
        opacity = 0;
        zIndex = 1;
        pointerEvents = 'none';
      }

      if (distance === 0) {
        x += dragDx;
        if (dragDir !== 0) opacity = 1 - dragProgress * (1 - BestSellersCarousel.SIDE_OPACITY);
      } else if (abs === 1) {
        x += dragDx * 0.6; // neighbors trail the drag slightly, reinforcing the physical feel
        if (dir === dragDir) {
          opacity = opacity + (1 - opacity) * dragProgress;
          zIndex = 4; // the incoming card should cross over the outgoing one as it arrives
        }
      }

      slide.style.transitionDuration = instantNow || dragDx !== 0 ? '0s' : '';
      slide.style.transform = `translate3d(${x}px, 0, ${z}px) scale(${scale}) rotateY(${rotate}deg)`;
      slide.style.opacity = String(opacity);
      slide.style.zIndex = String(zIndex);
      slide.style.pointerEvents = pointerEvents;
      slide.setAttribute('aria-hidden', String(index !== this.#active));

      slide.querySelectorAll('a, button, input').forEach((control) => {
        if (index === this.#active) control.removeAttribute('tabindex');
        else control.setAttribute('tabindex', '-1');
      });
    });

    this.dots.forEach((dot, index) => dot.classList.toggle('is-active', index === this.#active));
    if (this.prevButton) this.prevButton.disabled = this.#active === 0;
    if (this.nextButton) this.nextButton.disabled = this.#active === this.slides.length - 1;

    if (instantNow) {
      requestAnimationFrame(() => {
        this.slides.forEach((slide) => {
          slide.style.transitionDuration = '';
        });
      });
    }
  }

  #onPointerDown = (event) => {
    if (this.#mqlDesktop.matches) return; // desktop's primary control is the arrows, per spec
    if (event.button !== undefined && event.button !== 0) return;

    const startX = event.clientX;
    const startY = event.clientY;
    const cardWidth = this.slides[this.#active]?.getBoundingClientRect().width || 1;
    let horizontal = null;

    const onMove = (moveEvent) => {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;

      if (horizontal === null) {
        if (Math.abs(dx) < BestSellersCarousel.DRAG_THRESHOLD && Math.abs(dy) < BestSellersCarousel.DRAG_THRESHOLD) return;
        horizontal = Math.abs(dx) > Math.abs(dy);
        if (!horizontal) return; // vertical intent: leave it to the page's native scroll
      }

      if (!horizontal) return;
      this.render({ dragDx: dx });
    };

    const onUp = (upEvent) => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);

      if (!horizontal) return;

      const dx = upEvent.clientX - startX;
      if (Math.abs(dx) > cardWidth * BestSellersCarousel.SWIPE_COMPLETE_RATIO) {
        this.go(this.#active - Math.sign(dx));
      } else {
        this.render();
      }
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  };
}

if (!customElements.get('best-sellers-carousel')) {
  customElements.define('best-sellers-carousel', BestSellersCarousel);
}
