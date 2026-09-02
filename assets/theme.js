/* MetaliQ storefront behaviour.
 *
 * Three independent enhancements, each a no-op when its markup is absent:
 *   1. the mobile navigation toggle
 *   2. the collection sort control
 *   3. the made-to-order size calculator on the product page
 *
 * The calculator is the delicate one. A displayed price must always equal the
 * price Shopify will charge, so the scaled figure is only ever shown when the
 * store has a surcharge product configured that lets us add the difference as a
 * real line item. Without one we show the standard price plus a clearly
 * labelled estimate, and send the customer to a quote request instead.
 */
(() => {
  'use strict';

  const routes = (window.MetaliQ && window.MetaliQ.routes) || {};
  const cartAddUrl = routes.cartAdd || '/cart/add';
  const cartChangeUrl = routes.cartChange || '/cart/change';
  const cartUrl = routes.cart || '/cart';

  document.querySelectorAll('[data-announcement-slider]').forEach((slider) => {
    const slides = Array.from(slider.querySelectorAll('[data-announcement-slide]'));
    const previous = slider.querySelector('[data-announcement-previous]');
    const next = slider.querySelector('[data-announcement-next]');
    if (slides.length < 2 || !previous || !next) return;

    let activeIndex = Math.max(0, slides.findIndex((slide) => slide.classList.contains('is-active')));
    let rotationTimer;

    const showSlide = (index) => {
      const current = slides[activeIndex];
      const targetIndex = (index + slides.length) % slides.length;
      if (targetIndex === activeIndex) return;

      current.classList.remove('is-active');
      current.classList.add('is-leaving');
      current.setAttribute('aria-hidden', 'true');
      activeIndex = targetIndex;
      slides[activeIndex].classList.add('is-active');
      slides[activeIndex].setAttribute('aria-hidden', 'false');
      window.setTimeout(() => current.classList.remove('is-leaving'), 350);
    };

    const stopRotation = () => window.clearInterval(rotationTimer);
    const startRotation = () => {
      stopRotation();
      if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        rotationTimer = window.setInterval(() => showSlide(activeIndex + 1), 5000);
      }
    };

    previous.addEventListener('click', () => {
      showSlide(activeIndex - 1);
      startRotation();
    });
    next.addEventListener('click', () => {
      showSlide(activeIndex + 1);
      startRotation();
    });
    slider.addEventListener('mouseenter', stopRotation);
    slider.addEventListener('mouseleave', startRotation);
    slider.addEventListener('focusin', stopRotation);
    slider.addEventListener('focusout', startRotation);
    startRotation();
  });

  document.querySelectorAll('[data-testimonial-slider]').forEach((slider) => {
    const slides = Array.from(slider.querySelectorAll('[data-testimonial-slide]'));
    const previous = slider.querySelector('[data-testimonial-previous]');
    const next = slider.querySelector('[data-testimonial-next]');
    const currentLabel = slider.querySelector('[data-testimonial-current]');
    if (slides.length < 2 || !previous || !next) return;

    let activeIndex = Math.max(0, slides.findIndex((slide) => slide.classList.contains('is-active')));

    const fitQuotes = () => {
      slides.forEach((slide) => {
        const quote = slide.querySelector('blockquote');
        if (!quote) return;

        quote.style.removeProperty('--quote-fit-size');
        let fontSize = parseFloat(window.getComputedStyle(quote).fontSize);
        const minimumSize = 17;

        while (slide.scrollHeight > slide.clientHeight && fontSize > minimumSize) {
          fontSize -= 1;
          quote.style.setProperty('--quote-fit-size', `${fontSize}px`);
        }
      });
    };

    const showTestimonial = (index) => {
      const current = slides[activeIndex];
      const targetIndex = (index + slides.length) % slides.length;
      if (targetIndex === activeIndex) return;

      current.classList.remove('is-active');
      current.classList.add('is-leaving');
      current.setAttribute('aria-hidden', 'true');
      activeIndex = targetIndex;
      slides[activeIndex].classList.add('is-active');
      slides[activeIndex].setAttribute('aria-hidden', 'false');
      if (currentLabel) currentLabel.textContent = String(activeIndex + 1).padStart(2, '0');
      window.setTimeout(() => current.classList.remove('is-leaving'), 400);
    };

    previous.addEventListener('click', () => showTestimonial(activeIndex - 1));
    next.addEventListener('click', () => showTestimonial(activeIndex + 1));

    let fitTimer;
    const scheduleFit = () => {
      window.clearTimeout(fitTimer);
      fitTimer = window.setTimeout(fitQuotes, 100);
    };
    window.addEventListener('resize', scheduleFit, { passive: true });
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(fitQuotes);
    } else {
      fitQuotes();
    }
  });

  document.querySelectorAll('[data-faq-accordion]').forEach((accordion) => {
    const items = Array.from(accordion.querySelectorAll('details'));

    items.forEach((item) => {
      item.addEventListener('toggle', () => {
        if (!item.open) return;
        items.forEach((otherItem) => {
          if (otherItem !== item) otherItem.open = false;
        });
      });
    });
  });

  /* ----------------------------------------------------------------------
     Money
     ---------------------------------------------------------------------- */

  /** Format an amount in minor units using the store's Liquid money format. */
  const formatMoney = (cents, format) => {
    const amount = Number(cents) || 0;
    const template = format || '${{amount}}';
    const match = template.match(/\{\{\s*(\w+)\s*\}\}/);
    if (!match) return template;

    const withDelimiters = (value, precision, thousands, decimal) => {
      const fixed = (value / 100).toFixed(precision);
      const [whole, fraction] = fixed.split('.');
      const grouped = whole.replace(/(\d)(?=(\d\d\d)+(?!\d))/g, `$1${thousands}`);
      return fraction ? grouped + decimal + fraction : grouped;
    };

    let value;
    switch (match[1]) {
      case 'amount_no_decimals':
        value = withDelimiters(amount, 0, ',', '.');
        break;
      case 'amount_with_comma_separator':
        value = withDelimiters(amount, 2, '.', ',');
        break;
      case 'amount_no_decimals_with_comma_separator':
        value = withDelimiters(amount, 0, '.', ',');
        break;
      case 'amount_with_apostrophe_separator':
        value = withDelimiters(amount, 2, "'", '.');
        break;
      default:
        value = withDelimiters(amount, 2, ',', '.');
    }

    return template.replace(match[0], value);
  };

  /* ----------------------------------------------------------------------
     1. Mobile navigation
     ---------------------------------------------------------------------- */

  const menuButton = document.querySelector('[data-nav-toggle]');
  const navigation = document.querySelector('[data-nav]');

  if (menuButton && navigation) {
    const setMenu = (open) => {
      menuButton.setAttribute('aria-expanded', String(open));
      navigation.classList.toggle('is-open', open);
      document.body.classList.toggle('menu-open', open);
      if (!open) {
        navigation.querySelectorAll('details[open]').forEach((details) => details.removeAttribute('open'));
      }
    };

    menuButton.addEventListener('click', () => {
      setMenu(menuButton.getAttribute('aria-expanded') !== 'true');
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && menuButton.getAttribute('aria-expanded') === 'true') {
        setMenu(false);
        menuButton.focus();
      }
    });

    navigation.addEventListener('click', (event) => {
      if (event.target.closest('a')) setMenu(false);
    });

    // The nav returns to its horizontal desktop layout above 860px, where
    // `is-open` means nothing — without this the body stays scroll-locked.
    const desktop = window.matchMedia('(min-width: 861px)');
    const syncToViewport = (event) => {
      if (event.matches) setMenu(false);
    };
    if (desktop.addEventListener) {
      desktop.addEventListener('change', syncToViewport);
    } else {
      desktop.addListener(syncToViewport);
    }
  }

  document.querySelectorAll('.nav-dropdown').forEach((dropdown) => {
    const isDesktopNavigation = () => window.innerWidth >= 861;
    let closeTimer;

    dropdown.addEventListener('mouseenter', () => {
      window.clearTimeout(closeTimer);
      if (isDesktopNavigation()) dropdown.setAttribute('open', '');
    });
    dropdown.addEventListener('mouseleave', () => {
      if (isDesktopNavigation()) {
        window.clearTimeout(closeTimer);
        closeTimer = window.setTimeout(() => dropdown.removeAttribute('open'), 220);
      }
    });
    dropdown.addEventListener('focusin', () => {
      window.clearTimeout(closeTimer);
      if (isDesktopNavigation()) dropdown.setAttribute('open', '');
    });
    dropdown.addEventListener('focusout', (event) => {
      if (isDesktopNavigation() && !dropdown.contains(event.relatedTarget)) {
        dropdown.removeAttribute('open');
      }
    });
    document.addEventListener('click', (event) => {
      if (!dropdown.contains(event.target)) dropdown.removeAttribute('open');
    });
    dropdown.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        dropdown.removeAttribute('open');
        dropdown.querySelector('summary')?.focus();
      }
    });
  });

  /* ----------------------------------------------------------------------
     2. Collection sorting
     ---------------------------------------------------------------------- */

  const sortControl = document.querySelector('[data-sort-by]');
  if (sortControl) {
    sortControl.addEventListener('change', (event) => {
      const url = new URL(window.location.href);
      url.searchParams.set('sort_by', event.target.value);
      url.searchParams.delete('page');
      window.location.assign(url.toString());
    });
  }

  document.querySelectorAll('[data-product-gallery]').forEach((gallery) => {
    const thumbnails = Array.from(gallery.querySelectorAll('[data-gallery-thumbnail]'));
    const mediaItems = Array.from(gallery.querySelectorAll('[data-gallery-media]'));

    thumbnails.forEach((thumbnail) => {
      thumbnail.addEventListener('click', () => {
        const targetId = thumbnail.dataset.galleryThumbnail;
        thumbnails.forEach((item) => {
          const active = item === thumbnail;
          item.classList.toggle('is-active', active);
          item.setAttribute('aria-pressed', String(active));
        });
        mediaItems.forEach((item) => {
          const active = item.dataset.galleryMedia === targetId;
          item.hidden = !active;
          if (!active) item.querySelector('video')?.pause();
        });
      });
    });
  });

  document.querySelectorAll('[data-product-tabs]').forEach((tabsRoot) => {
    const tabs = Array.from(tabsRoot.querySelectorAll('[data-product-tab]'));
    const panels = Array.from(tabsRoot.querySelectorAll('[data-product-panel]'));

    const activate = (tab) => {
      const target = tab.dataset.productTab;
      tabs.forEach((item) => {
        const active = item === tab;
        item.classList.toggle('is-active', active);
        item.setAttribute('aria-selected', String(active));
        item.tabIndex = active ? 0 : -1;
      });
      panels.forEach((panel) => {
        panel.hidden = panel.dataset.productPanel !== target;
      });
    };

    tabs.forEach((tab, index) => {
      tab.addEventListener('click', () => activate(tab));
      tab.addEventListener('keydown', (event) => {
        if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
        event.preventDefault();
        const direction = event.key === 'ArrowRight' ? 1 : -1;
        const next = tabs[(index + direction + tabs.length) % tabs.length];
        activate(next);
        next.focus();
      });
    });
  });

  /* ----------------------------------------------------------------------
     3. Made-to-order size calculator
     ---------------------------------------------------------------------- */

  document.querySelectorAll('[data-product-calculator]').forEach((root) => {
    const form = root.querySelector('.product-form');
    const priceOutput = root.querySelector('[data-product-price]');
    if (!form || !priceOutput) return;

    const modes = root.querySelectorAll('[data-size-mode]');
    const customPanel = root.querySelector('[data-custom-size]');
    const heightInput = root.querySelector('[data-custom-height]');
    const widthOutput = root.querySelector('[data-calculated-width]');
    const variantSelect = root.querySelector('[data-variant-select]');
    const variantIdInput = root.querySelector('[data-variant-id]');
    const dimensionsProperty = root.querySelector('[data-dimensions-property]');
    const groupProperty = root.querySelector('[data-group-property]');
    const pricingNote = root.querySelector('[data-pricing-note]');
    const estimateLine = root.querySelector('[data-estimate]');
    const estimateValue = root.querySelector('[data-estimate-value]');
    const sizeError = root.querySelector('[data-size-error]');
    const addButton = root.querySelector('[data-add-button]');
    const quoteButton = root.querySelector('[data-quote-button]');
    const addError = root.querySelector('[data-add-error]');
    const quantityInput = form.querySelector('input[name="quantity"]');

    const data = root.dataset;
    const moneyFormat = data.moneyFormat;
    const baseWidth = Number(data.baseWidth) || 2;
    const baseHeight = Number(data.baseHeight) || 2;
    const minHeight = Number(data.minHeight) || baseHeight;
    const maxHeight = Number(data.maxHeight) || 12;
    const byArea = data.pricingBasis !== 'height';
    const canCharge = data.canCharge === 'true';
    const surchargeId = data.surchargeId;
    const surchargeUnit = Number(data.surchargeUnit) || 0;

    const round1 = (n) => Number(n.toFixed(1));
    const trim = (n) => String(round1(n)).replace(/\.0$/, '');

    const variantId = () => (variantSelect ? variantSelect.value : variantIdInput && variantIdInput.value);
    const variantPrice = () => {
      if (variantSelect && variantSelect.selectedOptions[0]) {
        return Number(variantSelect.selectedOptions[0].dataset.price);
      }
      return Number(priceOutput.dataset.basePrice) || 0;
    };
    const isCustom = () => {
      const checked = root.querySelector('[data-size-mode]:checked');
      return Boolean(checked) && checked.value === 'Custom';
    };

    /** Current state of the size controls, priced two ways. */
    const measure = () => {
      const raw = Number(heightInput && heightInput.value);
      const height = Number.isFinite(raw) && raw > 0 ? raw : baseHeight;
      const valid = height >= minHeight && height <= maxHeight;
      const clamped = Math.min(Math.max(height, minHeight), maxHeight);
      const ratio = clamped / baseHeight;
      const scale = byArea ? ratio * ratio : ratio;
      const base = variantPrice();

      // What the piece is worth at this size...
      const scaled = Math.round(base * scale);
      // ...and what we can actually charge, in whole units of the surcharge
      // product. Never less than the variant price: a line item can add money
      // to a cart but cannot take it away.
      const units = canCharge && surchargeUnit > 0 ? Math.max(0, Math.round((scaled - base) / surchargeUnit)) : 0;

      return {
        height: clamped,
        width: baseWidth * ratio,
        valid,
        base,
        scaled,
        units,
        charged: base + units * surchargeUnit,
      };
    };

    const dimensionLabel = (state) => `${trim(state.width)} × ${trim(state.height)} ft`;

    const update = () => {
      const custom = isCustom();
      const state = measure();

      if (customPanel) customPanel.hidden = !custom;
      if (pricingNote) pricingNote.hidden = !custom;
      if (widthOutput) widthOutput.textContent = trim(state.width);

      if (sizeError) {
        sizeError.hidden = !custom || state.valid;
        if (custom && !state.valid) sizeError.textContent = sizeError.dataset.message || '';
      }

      // The headline price only ever shows money we will actually take.
      priceOutput.textContent = formatMoney(custom && canCharge ? state.charged : state.base, moneyFormat);

      if (estimateLine) {
        const showEstimate = custom && !canCharge;
        estimateLine.hidden = !showEstimate;
        if (showEstimate && estimateValue) {
          estimateValue.textContent = formatMoney(state.scaled, moneyFormat);
        }
      }

      if (quoteButton && addButton) {
        const quoteOnly = custom && !canCharge;
        quoteButton.hidden = !quoteOnly;
        addButton.hidden = quoteOnly;
        if (quoteOnly) {
          const url = new URL(quoteButton.dataset.baseHref || quoteButton.href, window.location.origin);
          if (!quoteButton.dataset.baseHref) quoteButton.dataset.baseHref = quoteButton.href;
          url.searchParams.set('piece', document.title);
          url.searchParams.set('size', dimensionLabel(state));
          quoteButton.href = url.toString();
        }
      }

      // Only submit sizing properties when a custom size is actually chosen.
      if (dimensionsProperty) {
        dimensionsProperty.disabled = !custom;
        dimensionsProperty.value = dimensionLabel(state);
      }
      if (groupProperty) {
        groupProperty.disabled = true; // set explicitly by the AJAX path below
        groupProperty.value = `${variantId()}-${dimensionLabel(state)}`;
      }

      if (addError) addError.hidden = true;
    };

    if (variantSelect && variantIdInput) {
      variantSelect.addEventListener('change', () => {
        variantIdInput.value = variantSelect.value;
      });
    }

    modes.forEach((mode) => mode.addEventListener('change', update));
    if (heightInput) {
      heightInput.addEventListener('input', update);
      heightInput.addEventListener('change', update);
    }
    if (variantSelect) variantSelect.addEventListener('change', update);

    /* A custom size is two linked line items: the piece, plus the surcharge
       units that make up the difference. That needs the AJAX API — a plain form
       post can only ever add one. Standard sizes fall through to the native
       submit. */
    form.addEventListener('submit', (event) => {
      if (!isCustom() || !canCharge) return;

      const state = measure();
      if (!state.valid) {
        event.preventDefault();
        if (heightInput) heightInput.focus();
        update();
        return;
      }

      event.preventDefault();

      const quantity = Math.max(1, Number(quantityInput && quantityInput.value) || 1);
      const group = `${variantId()}-${dimensionLabel(state)}`;
      const items = [
        {
          id: variantId(),
          quantity,
          properties: {
            '_Size type': 'Custom',
            Dimensions: dimensionLabel(state),
            _size_group: group,
          },
        },
      ];

      if (state.units > 0 && surchargeId) {
        items.push({
          id: surchargeId,
          quantity: state.units * quantity,
          properties: { _surcharge_for: group },
        });
      }

      const label = addButton ? addButton.textContent : '';
      if (addButton) {
        addButton.disabled = true;
        addButton.textContent = addButton.dataset.adding || label;
      }

      fetch(cartAddUrl + '.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ items }),
      })
        .then((response) => {
          if (!response.ok) throw new Error('Add to cart failed');
          window.location.assign(cartUrl);
        })
        .catch(() => {
          if (addButton) {
            addButton.disabled = false;
            addButton.textContent = label;
          }
          if (addError) addError.hidden = false;
        });
    });

    update();
  });

  /* ----------------------------------------------------------------------
     4. Cart — removing a custom-size piece also removes its surcharge line
     ---------------------------------------------------------------------- */

  document.querySelectorAll('[data-remove-group]').forEach((link) => {
    link.addEventListener('click', (event) => {
      const keys = (link.dataset.removeGroup || '').split(',').filter(Boolean);
      if (keys.length < 2) return; // nothing linked; let the href do its job

      event.preventDefault();
      link.setAttribute('aria-busy', 'true');

      keys
        .reduce(
          (chain, key) =>
            chain.then(() =>
              fetch(cartChangeUrl + '.js', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                body: JSON.stringify({ id: key, quantity: 0 }),
              })
            ),
          Promise.resolve()
        )
        .then(() => window.location.assign(cartUrl))
        .catch(() => window.location.assign(link.href));
    });
  });

  /* ----------------------------------------------------------------------
     5. Header — mark as scrolled so it can grow a hairline
     ---------------------------------------------------------------------- */

  const header = document.querySelector('[data-site-header]');
  if (header) {
    const setScrolled = () => {
      if (window.scrollY > 4) {
        header.setAttribute('data-scrolled', '');
      } else {
        header.removeAttribute('data-scrolled');
      }
    };
    setScrolled();
    window.addEventListener('scroll', setScrolled, { passive: true });
  }

  /* ----------------------------------------------------------------------
     6. Scroll reveal — armed via a class so content is visible without JS
     ---------------------------------------------------------------------- */

  document.querySelectorAll('[data-product-carousel]').forEach((carousel) => {
    const track = carousel.querySelector('[data-carousel-track]');
    const previous = carousel.querySelector('[data-carousel-previous]');
    const next = carousel.querySelector('[data-carousel-next]');
    if (!track || !previous || !next) return;

    const updateControls = () => {
      const maxScroll = Math.max(0, track.scrollWidth - track.clientWidth);
      previous.disabled = track.scrollLeft <= 2;
      next.disabled = track.scrollLeft >= maxScroll - 2;
    };

    const move = (direction) => {
      const card = track.querySelector('.product-card');
      const gap = parseFloat(window.getComputedStyle(track).columnGap) || 0;
      const distance = card ? card.getBoundingClientRect().width + gap : track.clientWidth * 0.8;
      track.scrollBy({ left: distance * direction, behavior: 'smooth' });
    };

    previous.addEventListener('click', () => move(-1));
    next.addEventListener('click', () => move(1));
    track.addEventListener('scroll', updateControls, { passive: true });
    window.addEventListener('resize', updateControls, { passive: true });
    updateControls();
  });

  const reveals = document.querySelectorAll('.reveal');
  const motionOk = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (reveals.length && motionOk && 'IntersectionObserver' in window) {
    document.documentElement.classList.add('reveal-on');
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-in');
            observer.unobserve(entry.target);
          }
        });
      },
      { rootMargin: '0px 0px -12% 0px' }
    );
    reveals.forEach((el) => observer.observe(el));
  }
})();
