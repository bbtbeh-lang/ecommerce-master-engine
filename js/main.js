/* ==========================================================================
   main.js — E-commerce Master Engine
   Pixflow Agency — Vanilla JS, no dependencies
   Handles: hero slider, cart (add/remove/qty/persist), floating cart panel,
            mobile nav toggle
   ========================================================================== */

(function () {
  "use strict";

  /* ------------------------------------------------------------------ */
  /* Mobile Nav Toggle                                                   */
  /* ------------------------------------------------------------------ */
  const navToggle = document.getElementById("navToggle");
  const navList = document.querySelector(".pf-nav__list");

  if (navToggle && navList) {
    navToggle.addEventListener("click", function () {
      const isOpen = navToggle.getAttribute("aria-expanded") === "true";
      navToggle.setAttribute("aria-expanded", String(!isOpen));
      navToggle.setAttribute("aria-label", isOpen ? "باز کردن منو" : "بستن منو");
      navList.classList.toggle("is-open");
    });

    navList.querySelectorAll(".pf-nav__link").forEach(function (link) {
      link.addEventListener("click", function () {
        navToggle.setAttribute("aria-expanded", "false");
        navToggle.setAttribute("aria-label", "باز کردن منو");
        navList.classList.remove("is-open");
      });
    });
  }

  /* ------------------------------------------------------------------ */
  /* Hero Slider                                                         */
  /* ------------------------------------------------------------------ */
  (function initSlider() {
    const track = document.getElementById("sliderTrack");
    if (!track) return;

    const slides = Array.from(track.querySelectorAll(".pf-slide"));
    const dots = Array.from(document.querySelectorAll(".pf-slider__dot"));
    const prevBtn = document.getElementById("sliderPrev");
    const nextBtn = document.getElementById("sliderNext");

    if (slides.length === 0) return;

    let currentIndex = Math.max(
      0,
      slides.findIndex(function (s) { return s.classList.contains("is-active"); })
    );
    const AUTOPLAY_DELAY = 6000;
    let autoplayTimer = null;

    function goToSlide(index) {
      const nextIndex = (index + slides.length) % slides.length;

      slides[currentIndex].classList.remove("is-active");
      dots[currentIndex] && dots[currentIndex].classList.remove("is-active");
      dots[currentIndex] && dots[currentIndex].setAttribute("aria-selected", "false");

      slides[nextIndex].classList.add("is-active");
      dots[nextIndex] && dots[nextIndex].classList.add("is-active");
      dots[nextIndex] && dots[nextIndex].setAttribute("aria-selected", "true");

      currentIndex = nextIndex;
    }

    function nextSlide() { goToSlide(currentIndex + 1); }
    function prevSlide() { goToSlide(currentIndex - 1); }

    function startAutoplay() {
      stopAutoplay();
      autoplayTimer = setInterval(nextSlide, AUTOPLAY_DELAY);
    }
    function stopAutoplay() {
      if (autoplayTimer) clearInterval(autoplayTimer);
    }

    if (nextBtn) nextBtn.addEventListener("click", function () { nextSlide(); startAutoplay(); });
    if (prevBtn) prevBtn.addEventListener("click", function () { prevSlide(); startAutoplay(); });

    dots.forEach(function (dot) {
      dot.addEventListener("click", function () {
        const target = parseInt(dot.getAttribute("data-slide-target"), 10);
        goToSlide(target);
        startAutoplay();
      });
    });

    // Pause on hover/focus, resume on leave
    const sliderSection = document.querySelector(".pf-slider");
    if (sliderSection) {
      sliderSection.addEventListener("mouseenter", stopAutoplay);
      sliderSection.addEventListener("mouseleave", startAutoplay);
      sliderSection.addEventListener("focusin", stopAutoplay);
      sliderSection.addEventListener("focusout", startAutoplay);
    }

    // Basic swipe support for touch devices
    let touchStartX = 0;
    track.addEventListener("touchstart", function (e) {
      touchStartX = e.touches[0].clientX;
    }, { passive: true });
    track.addEventListener("touchend", function (e) {
      const diff = e.changedTouches[0].clientX - touchStartX;
      if (Math.abs(diff) < 40) return;
      // RTL: swipe right (positive diff) goes to next visually-previous slide
      if (diff > 0) prevSlide(); else nextSlide();
      startAutoplay();
    }, { passive: true });

    startAutoplay();
  })();

  /* ------------------------------------------------------------------ */
  /* Cart State                                                          */
  /* ------------------------------------------------------------------ */
  const CART_STORAGE_KEY = "pf_cart_v1";
  // [CLIENT INPUT REQUIRED]: set the store's currency label
  const CURRENCY_LABEL = "تومان";

  function loadCart() {
    try {
      const raw = localStorage.getItem(CART_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (err) {
      return [];
    }
  }

  function saveCart(cart) {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch (err) {
      /* storage unavailable — cart still works for the current session */
    }
  }

  function formatPrice(amount) {
    const num = Number(amount) || 0;
    return num.toLocaleString("fa-IR") + " " + CURRENCY_LABEL;
  }

  let cart = loadCart();

  /* ------------------------------------------------------------------ */
  /* Cart DOM Refs                                                       */
  /* ------------------------------------------------------------------ */
  const cartToggle = document.getElementById("cartToggle");
  const cartClose = document.getElementById("cartClose");
  const cartBackdrop = document.getElementById("cartBackdrop");
  const floatingCart = document.getElementById("floatingCart");
  const cartItemsEl = document.getElementById("cartItems");
  const cartEmptyMsg = document.getElementById("cartEmptyMsg");
  const cartCountEl = document.getElementById("cartCount");
  const cartTotalEl = document.getElementById("cartTotal");

  function openCart() {
    if (!floatingCart) return;
    floatingCart.classList.add("is-open");
    floatingCart.setAttribute("aria-hidden", "false");
    cartBackdrop && cartBackdrop.classList.add("is-open");
    cartToggle && cartToggle.setAttribute("aria-expanded", "true");
  }

  function closeCart() {
    if (!floatingCart) return;
    floatingCart.classList.remove("is-open");
    floatingCart.setAttribute("aria-hidden", "true");
    cartBackdrop && cartBackdrop.classList.remove("is-open");
    cartToggle && cartToggle.setAttribute("aria-expanded", "false");
  }

  if (cartToggle) cartToggle.addEventListener("click", openCart);
  if (cartClose) cartClose.addEventListener("click", closeCart);
  if (cartBackdrop) cartBackdrop.addEventListener("click", closeCart);
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeCart();
  });

  /* ------------------------------------------------------------------ */
  /* Cart Rendering                                                      */
  /* ------------------------------------------------------------------ */
  function renderCart() {
    if (!cartItemsEl) return;

    // Clear existing line items (keep the empty-state message node)
    Array.from(cartItemsEl.querySelectorAll(".pf-cart-item")).forEach(function (el) {
      el.remove();
    });

    if (cart.length === 0) {
      if (cartEmptyMsg) cartEmptyMsg.style.display = "block";
    } else {
      if (cartEmptyMsg) cartEmptyMsg.style.display = "none";

      cart.forEach(function (item) {
        const row = document.createElement("div");
        row.className = "pf-cart-item";
        row.setAttribute("data-product-id", item.id);
        row.innerHTML =
          '<img src="' + (item.image || "assets/placeholder.jpg") + '" alt="" class="pf-cart-item__img">' +
          '<div>' +
            '<p class="pf-cart-item__name">' + item.name + '</p>' +
            '<p class="pf-cart-item__price">' + formatPrice(item.price * item.qty) + '</p>' +
            '<div class="pf-cart-item__qty">' +
              '<button type="button" class="pf-cart-item__qty-btn" data-action="decrease" aria-label="کاهش تعداد">−</button>' +
              '<span aria-live="polite">' + item.qty + '</span>' +
              '<button type="button" class="pf-cart-item__qty-btn" data-action="increase" aria-label="افزایش تعداد">+</button>' +
            '</div>' +
          '</div>' +
          '<button type="button" class="pf-cart-item__remove" data-action="remove" aria-label="حذف از سبد خرید">&times;</button>';
        cartItemsEl.appendChild(row);
      });
    }

    const totalCount = cart.reduce(function (sum, item) { return sum + item.qty; }, 0);
    const totalPrice = cart.reduce(function (sum, item) { return sum + item.qty * item.price; }, 0);

    if (cartCountEl) cartCountEl.textContent = totalCount;
    if (cartTotalEl) cartTotalEl.textContent = formatPrice(totalPrice);

    saveCart(cart);
  }

  /* ------------------------------------------------------------------ */
  /* Cart Actions                                                        */
  /* ------------------------------------------------------------------ */
  function addToCart(product) {
    const existing = cart.find(function (item) { return item.id === product.id; });
    if (existing) {
      existing.qty += 1;
    } else {
      cart.push({
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.image,
        qty: 1,
      });
    }
    renderCart();
    openCart();
  }

  function changeQty(productId, delta) {
    const item = cart.find(function (i) { return i.id === productId; });
    if (!item) return;
    item.qty += delta;
    if (item.qty <= 0) {
      cart = cart.filter(function (i) { return i.id !== productId; });
    }
    renderCart();
  }

  function removeFromCart(productId) {
    cart = cart.filter(function (i) { return i.id !== productId; });
    renderCart();
  }

  // Add-to-cart buttons on product grid
  document.querySelectorAll(".pf-add-to-cart").forEach(function (btn) {
    btn.addEventListener("click", function () {
      const card = btn.closest(".pf-product-card");
      const img = card ? card.querySelector(".pf-product-card__img") : null;

      addToCart({
        id: btn.getAttribute("data-product-id"),
        name: btn.getAttribute("data-product-name"),
        price: parseFloat(btn.getAttribute("data-product-price")) || 0,
        image: img ? img.getAttribute("src") : "",
      });
    });
  });

  // Delegated events for qty +/- and remove inside the cart panel
  if (cartItemsEl) {
    cartItemsEl.addEventListener("click", function (e) {
      const actionBtn = e.target.closest("[data-action]");
      if (!actionBtn) return;
      const row = actionBtn.closest(".pf-cart-item");
      const productId = row ? row.getAttribute("data-product-id") : null;
      if (!productId) return;

      const action = actionBtn.getAttribute("data-action");
      if (action === "increase") changeQty(productId, 1);
      if (action === "decrease") changeQty(productId, -1);
      if (action === "remove") removeFromCart(productId);
    });
  }

  // Initial paint from persisted cart
  renderCart();
})();
