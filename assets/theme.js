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
