(() => {
  const menuButton = document.querySelector('[data-menu-toggle]');
  const navigation = document.querySelector('[data-navigation]');
  if (menuButton && navigation) {
    menuButton.addEventListener('click', () => {
      const isOpen = menuButton.getAttribute('aria-expanded') === 'true';
      menuButton.setAttribute('aria-expanded', String(!isOpen));
      navigation.classList.toggle('is-open', !isOpen);
      document.body.classList.toggle('menu-open', !isOpen);
    });
  }

  document.querySelector('[data-sort-by]')?.addEventListener('change', (event) => {
    const url = new URL(window.location.href);
    url.searchParams.set('sort_by', event.target.value);
    window.location.assign(url.toString());
  });

  document.querySelectorAll('[data-product-calculator]').forEach((calculator) => {
    const form = calculator.querySelector('.product-form');
    const modes = calculator.querySelectorAll('[data-size-mode]');
    const customPanel = calculator.querySelector('[data-custom-size]');
    const heightInput = calculator.querySelector('[data-custom-height]');
    const widthOutput = calculator.querySelector('[data-calculated-width]');
    const priceOutput = calculator.querySelector('[data-product-price]');
    const variantSelect = calculator.querySelector('[data-variant-select]');
    const dimensionsProperty = calculator.querySelector('[data-dimensions-property]');
    const priceProperty = calculator.querySelector('[data-price-property]');
    const pricingNote = calculator.querySelector('[data-pricing-note]');
    const baseWidth = Number(calculator.dataset.baseWidth) || 2;
    const baseHeight = Number(calculator.dataset.baseHeight) || 2;
    const formatter = new Intl.NumberFormat(calculator.dataset.locale || 'en-PK', { style: 'currency', currency: calculator.dataset.currency || 'PKR', maximumFractionDigits: 0 });

    const variantPrice = () => Number(variantSelect?.selectedOptions[0]?.dataset.price || priceOutput.dataset.basePrice);
    const isCustom = () => calculator.querySelector('[data-size-mode]:checked')?.value === 'Custom';
    const update = () => {
      const requestedHeight = Math.max(Number(heightInput?.value) || baseHeight, 0.1);
      const scale = isCustom() ? requestedHeight / baseHeight : 1;
      const width = baseWidth * scale;
      const price = Math.round(variantPrice() * scale);
      const dimensions = `${width.toFixed(1).replace('.0', '')} × ${(baseHeight * scale).toFixed(1).replace('.0', '')} ft`;
      customPanel.hidden = !isCustom();
      pricingNote.hidden = !isCustom();
      widthOutput.textContent = width.toFixed(1).replace('.0', '');
      priceOutput.textContent = formatter.format(price / 100);
      dimensionsProperty.value = dimensions;
      priceProperty.value = formatter.format(price / 100);
    };
    modes.forEach((mode) => mode.addEventListener('change', update));
    heightInput?.addEventListener('input', update);
    variantSelect?.addEventListener('change', update);
    form?.addEventListener('submit', update);
    update();
  });
})();
