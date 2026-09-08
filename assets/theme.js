/* MetaliQ storefront behaviour.
 *
 * Three independent enhancements, each a no-op when its markup is absent:
 *   1. the mobile navigation toggle
 *   2. the collection sort control
 *   3. the product purchase form and cart drawer handoff
 */
(() => {
  'use strict';

  const routes = (window.MetaliQ && window.MetaliQ.routes) || {};
  const cartAddUrl = routes.cartAdd || '/cart/add';
  const cartChangeUrl = routes.cartChange || '/cart/change';
  const cartUpdateUrl = routes.cartUpdate || '/cart/update';
  const cartUrl = routes.cart || '/cart';

  const customDesignWhatsAppUrl = document.body.dataset.customDesignUrl || '';

  const routeCustomDesignLinksToWhatsApp = (root = document) => {
    if (!customDesignWhatsAppUrl) return;

    root.querySelectorAll('[data-whatsapp-cta], a[href*="/pages/custom-design"]').forEach((link) => {
      const href = link.getAttribute('href') || '';
      if (href.includes('wa.me/')) return;

      link.href = customDesignWhatsAppUrl;
      link.target = '_blank';
      link.rel = 'noopener';
    });
  };

  routeCustomDesignLinksToWhatsApp();

  /* ----------------------------------------------------------------------
     Cart drawer
     ---------------------------------------------------------------------- */

  let cartDrawerTrigger = null;

  const getCartDrawer = () => document.querySelector('[data-cart-drawer]');

  const renderCartDrawer = (html) => {
    const section = document.querySelector('#shopify-section-cart-drawer');
    if (!section || !html) return false;

    section.innerHTML = html;
    routeCustomDesignLinksToWhatsApp(section);
    syncCartCount();
    return true;
  };

  const cartSectionRequest = () => ({
    sections: ['cart-drawer'],
    sections_url: window.location.pathname,
  });

  const syncCartCount = () => {
    const drawer = getCartDrawer();
    const count = Math.max(0, Number(drawer && drawer.dataset.cartCount) || 0);

    document.querySelectorAll('[data-cart-drawer-trigger]').forEach((trigger) => {
      const label = trigger.dataset.cartLabel;
      if (label) trigger.setAttribute('aria-label', label.replace('__COUNT__', String(count)));

      let badge = trigger.querySelector('[data-cart-count]');
      if (count > 0) {
        if (!badge) {
          badge = document.createElement('span');
          badge.className = 'cart-count';
          badge.dataset.cartCount = '';
          trigger.appendChild(badge);
        }
        badge.textContent = String(count);
      } else if (badge) {
        badge.remove();
      }
    });
  };

  const refreshCartDrawer = () => {
    const section = document.querySelector('#shopify-section-cart-drawer');
    if (!section) return Promise.reject(new Error('Cart drawer section is unavailable'));

    const separator = cartUrl.includes('?') ? '&' : '?';
    return fetch(`${cartUrl}${separator}section_id=cart-drawer`, {
      headers: { Accept: 'text/html' },
    })
      .then((response) => {
        if (!response.ok) throw new Error('Cart drawer refresh failed');
        return response.text();
      })
      .then((html) => {
        if (!renderCartDrawer(html)) throw new Error('Cart drawer render failed');
      });
  };

  const revealCartDrawer = ({ focus = true } = {}) => {
    const drawer = getCartDrawer();
    if (!drawer) return false;

    drawer.setAttribute('aria-hidden', 'false');
    document.body.classList.add('cart-drawer-open');
    document.querySelectorAll('[data-cart-drawer-trigger]').forEach((trigger) => {
      trigger.setAttribute('aria-expanded', 'true');
    });

    if (focus) {
      window.requestAnimationFrame(() => {
        const panel = drawer.querySelector('.cart-drawer__panel');
        const close = drawer.querySelector('[data-cart-drawer-close]');
        (close || panel)?.focus();
      });
    }
    return true;
  };

  const openCartDrawer = ({ refresh = false, focus = true } = {}) => {
    if (!cartDrawerTrigger) cartDrawerTrigger = document.activeElement;
    if (!revealCartDrawer({ focus })) {
      window.location.assign(cartUrl);
      return Promise.resolve();
    }

    if (!refresh) return Promise.resolve();
    return refreshCartDrawer()
      .then(() => revealCartDrawer({ focus: false }))
      .catch(() => {
        // Keep the already-rendered drawer usable if a background refresh fails.
      });
  };

  const closeCartDrawer = () => {
    const drawer = getCartDrawer();
    if (!drawer) return;

    drawer.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('cart-drawer-open');
    document.querySelectorAll('[data-cart-drawer-trigger]').forEach((trigger) => {
      trigger.setAttribute('aria-expanded', 'false');
    });

    if (cartDrawerTrigger instanceof HTMLElement) cartDrawerTrigger.focus();
    cartDrawerTrigger = null;
  };

  const updateCartDrawerQuantity = (button) => {
    const drawer = getCartDrawer();
    const key = button.dataset.key;
    const requestedQuantity = Number(button.dataset.quantity) || 0;
    const quantity = button.hasAttribute('data-cart-drawer-remove') ? 0 : Math.max(1, requestedQuantity);
    if (!drawer || !key || drawer.getAttribute('aria-busy') === 'true') return;

    const updates = { [key]: quantity };
    const linkedKey = button.dataset.linkedKey;
    const linkedRatio = Math.max(0, Number(button.dataset.linkedRatio) || 0);
    if (linkedKey) updates[linkedKey] = quantity * linkedRatio;

    drawer.setAttribute('aria-busy', 'true');
    const item = button.closest('[data-cart-drawer-item]');
    const quantityOutput = item && item.querySelector('.cart-drawer__quantity span');
    const previousQuantity = Math.max(0, Number(quantityOutput && quantityOutput.textContent) || 0);
    drawer.dataset.cartCount = String(Math.max(0, Number(drawer.dataset.cartCount) + quantity - previousQuantity));
    if (quantityOutput && quantity > 0) quantityOutput.textContent = String(quantity);
    if (item && quantity === 0) item.classList.add('is-removing');
    syncCartCount();

    fetch(cartUpdateUrl + '.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ updates, ...cartSectionRequest() }),
    })
      .then((response) => {
        if (!response.ok) throw new Error('Cart update failed');
        return response.json();
      })
      .then((cart) => {
        const html = cart.sections && cart.sections['cart-drawer'];
        if (renderCartDrawer(html)) return undefined;
        return refreshCartDrawer();
      })
      .then(() => revealCartDrawer({ focus: false }))
      .catch(() => window.location.assign(cartUrl));
  };

  window.MetaliQCartDrawer = {
    open: openCartDrawer,
    refresh: refreshCartDrawer,
  };

  document.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-cart-drawer-trigger]');
    if (trigger) {
      event.preventDefault();
      cartDrawerTrigger = trigger;
      openCartDrawer();
      return;
    }

    if (event.target.closest('[data-cart-drawer-close]')) {
      closeCartDrawer();
      return;
    }

    const quantityButton = event.target.closest('[data-cart-drawer-quantity]');
    if (quantityButton) {
      event.preventDefault();
      updateCartDrawerQuantity(quantityButton);
    }
  });

  document.addEventListener('keydown', (event) => {
    const drawer = getCartDrawer();
    if (!drawer || drawer.getAttribute('aria-hidden') !== 'false') return;

    if (event.key === 'Escape') {
      event.preventDefault();
      closeCartDrawer();
      return;
    }

    if (event.key !== 'Tab') return;
    const panel = drawer.querySelector('.cart-drawer__panel');
    const focusable = Array.from(
      panel.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')
    ).filter((element) => element.getClientRects().length > 0);
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

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

  document.querySelectorAll('[data-whatsapp-widget]').forEach((widget) => {
    const prompt = widget.querySelector('[data-whatsapp-prompt]');
    const close = widget.querySelector('[data-whatsapp-close]');
    const storageKey = 'metaliq-whatsapp-prompt-hidden';
    if (!prompt) return;

    try {
      if (window.sessionStorage.getItem(storageKey) === 'true') prompt.hidden = true;
    } catch (error) {
      // Storage can be unavailable in privacy-restricted browsing contexts.
    }

    window.requestAnimationFrame(() => {
      widget.classList.add('is-ready');
      widget.classList.toggle('has-open-prompt', !prompt.hidden);
    });

    if (close) {
      close.addEventListener('click', () => {
        prompt.hidden = true;
        widget.classList.remove('has-open-prompt');
        try {
          window.sessionStorage.setItem(storageKey, 'true');
        } catch (error) {
          // The prompt still closes for this render when storage is unavailable.
        }
      });
    }
  });

  document.querySelectorAll('[data-hero-reel]').forEach((reel) => {
    const track = reel.querySelector('.home-hero__track');
    const firstGroup = track && track.querySelector('.home-hero__group');
    const mobileLayout = window.matchMedia('(max-width: 980px)');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (!track || !firstGroup) return;

    let frame;
    let previousTime;
    let paused = false;
    let resumeTimer;
    const speed = 32;

    const loop = (time) => {
      if (!mobileLayout.matches || reducedMotion.matches || paused) {
        previousTime = time;
        frame = window.requestAnimationFrame(loop);
        return;
      }

      const elapsed = Math.min(40, time - (previousTime || time));
      previousTime = time;
      reel.scrollLeft += speed * (elapsed / 1000);

      const gap = parseFloat(window.getComputedStyle(track).columnGap) || 0;
      const cycleWidth = firstGroup.getBoundingClientRect().width + gap;
      if (cycleWidth > 0 && reel.scrollLeft >= cycleWidth) reel.scrollLeft -= cycleWidth;
      frame = window.requestAnimationFrame(loop);
    };

    const pause = () => {
      paused = true;
      window.clearTimeout(resumeTimer);
    };
    const resume = (delay = 700) => {
      window.clearTimeout(resumeTimer);
      resumeTimer = window.setTimeout(() => {
        paused = false;
        previousTime = undefined;
      }, delay);
    };

    reel.addEventListener('pointerdown', pause);
    reel.addEventListener('pointerup', () => resume());
    reel.addEventListener('pointercancel', () => resume());
    reel.addEventListener('mouseenter', pause);
    reel.addEventListener('mouseleave', () => resume(0));
    reel.addEventListener('wheel', () => {
      pause();
      resume();
    }, { passive: true });
    reel.addEventListener('focusin', pause);
    reel.addEventListener('focusout', () => resume());
    mobileLayout.addEventListener('change', () => {
      reel.scrollLeft = 0;
      previousTime = undefined;
    });

    frame = window.requestAnimationFrame(loop);
    window.addEventListener('pagehide', () => window.cancelAnimationFrame(frame), { once: true });
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
    const sizeMobileMenu = () => {
      const siteHeader = navigation.closest('[data-site-header]');
      if (!siteHeader) return;
      const availableHeight = Math.max(240, window.innerHeight - siteHeader.getBoundingClientRect().bottom);
      navigation.style.setProperty('--mobile-menu-height', `${availableHeight}px`);
    };

    const setMenu = (open) => {
      if (open) sizeMobileMenu();
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

    window.addEventListener('resize', () => {
      if (menuButton.getAttribute('aria-expanded') === 'true') sizeMobileMenu();
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
     3. Product purchase form
     ---------------------------------------------------------------------- */

  document.querySelectorAll('[data-product-purchase]').forEach((root) => {
    const form = root.querySelector('.product-form');
    const priceOutput = root.querySelector('[data-product-price]');
    if (!form || !priceOutput) return;

    const variantSelect = root.querySelector('[data-variant-select]');
    const variantIdInput = root.querySelector('[data-variant-id]');
    const currentPriceOutput = priceOutput.querySelector('[data-current-price]');
    const comparePriceOutput = priceOutput.querySelector('[data-compare-price]');
    const addButton = root.querySelector('[data-add-button]');
    const addError = root.querySelector('[data-add-error]');
    const quantityInput = form.querySelector('input[name="quantity"]');

    const variantId = () => (variantSelect ? variantSelect.value : variantIdInput && variantIdInput.value);
    const variantPrice = () => {
      if (variantSelect && variantSelect.selectedOptions[0]) {
        return Number(variantSelect.selectedOptions[0].dataset.price);
      }
      return Number(priceOutput.dataset.basePrice) || 0;
    };
    const variantComparePrice = () => {
      if (variantSelect && variantSelect.selectedOptions[0]) {
        return Number(variantSelect.selectedOptions[0].dataset.comparePrice) || 0;
      }
      return Number(priceOutput.dataset.baseComparePrice) || 0;
    };

    const update = () => {
      const price = variantPrice();
      const comparePrice = variantComparePrice();
      if (currentPriceOutput) currentPriceOutput.textContent = formatMoney(price, root.dataset.moneyFormat);
      if (comparePriceOutput) {
        comparePriceOutput.textContent = formatMoney(comparePrice, root.dataset.moneyFormat);
        comparePriceOutput.hidden = comparePrice <= price;
      }
      if (addError) addError.hidden = true;
    };

    if (variantSelect && variantIdInput) {
      variantSelect.addEventListener('change', () => {
        variantIdInput.value = variantSelect.value;
        const url = new URL(root.dataset.productUrl || window.location.pathname, window.location.origin);
        url.searchParams.set('variant', variantSelect.value);
        window.history.replaceState({}, '', `${url.pathname}${url.search}`);
      });
    }

    if (variantSelect) variantSelect.addEventListener('change', update);

    /* Add through the AJAX API so the customer stays on the product page. */
    form.addEventListener('submit', (event) => {
      event.preventDefault();

      const quantity = Math.max(1, Number(quantityInput && quantityInput.value) || 1);
      const items = [
        {
          id: variantId(),
          quantity,
        },
      ];

      const label = addButton ? addButton.textContent : '';
      if (addButton) {
        addButton.disabled = true;
        addButton.textContent = addButton.dataset.adding || label;
      }

      fetch(cartAddUrl + '.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ items, ...cartSectionRequest() }),
      })
        .then((response) => {
          if (!response.ok) throw new Error('Add to cart failed');
          return response.json();
        })
        .then((cart) => {
          if (addButton) {
            addButton.disabled = false;
            addButton.textContent = label;
          }
          const html = cart.sections && cart.sections['cart-drawer'];
          if (renderCartDrawer(html)) return openCartDrawer();
          return refreshCartDrawer().then(() => openCartDrawer());
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
