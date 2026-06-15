/* =================================================================
   FF Consórcios — script principal
   - Scroll suave (Lenis) integrado ao ScrollTrigger (GSAP)
   - Animações de entrada ao rolar (reveal / stagger)
   - Header dinâmico, menu mobile, acordeão FAQ, modal de currículo
   - Contadores animados e microinterações
   ================================================================= */

(function () {
  "use strict";

  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Marca que o JS está ativo (CSS usa para esconder elementos antes do reveal)
  document.documentElement.classList.add("js-ready");

  /* ===============================================================
     1. SCROLL SUAVE (Lenis) + sincronização com GSAP/ScrollTrigger
     =============================================================== */
  let lenis = null;

  function initSmoothScroll() {
    if (prefersReduced || typeof Lenis === "undefined") return;

    lenis = new Lenis({
      duration: 1.1,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });

    // Conecta o loop do Lenis ao ticker do GSAP (fonte única de tempo)
    if (typeof gsap !== "undefined") {
      lenis.on("scroll", () => {
        if (window.ScrollTrigger) ScrollTrigger.update();
      });
      gsap.ticker.add((time) => lenis.raf(time * 1000));
      gsap.ticker.lagSmoothing(0);
    } else {
      function raf(time) { lenis.raf(time); requestAnimationFrame(raf); }
      requestAnimationFrame(raf);
    }
  }

  /* ===============================================================
     2. NAVEGAÇÃO POR ÂNCORAS (usa Lenis quando disponível)
     =============================================================== */
  function initAnchorNav() {
    const headerOffset = 90;
    document.querySelectorAll('a[href^="#"]').forEach((link) => {
      link.addEventListener("click", (e) => {
        const id = link.getAttribute("href");
        if (id === "#" || id.length < 2) return;
        const target = document.querySelector(id);
        if (!target) return;
        e.preventDefault();
        closeMobileMenu();

        if (lenis) {
          lenis.scrollTo(target, { offset: -headerOffset, duration: 1.2 });
        } else {
          const top = target.getBoundingClientRect().top + window.scrollY - headerOffset;
          window.scrollTo({ top, behavior: "smooth" });
        }
      });
    });
  }

  /* ===============================================================
     3. HEADER: muda de estilo ao rolar
     =============================================================== */
  function initHeader() {
    const header = document.getElementById("site-header");
    const onScroll = () => {
      if (window.scrollY > 30) header.classList.add("scrolled");
      else header.classList.remove("scrolled");
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* ===============================================================
     4. MENU MOBILE (off-canvas)
     =============================================================== */
  const mobileMenu = document.getElementById("mobile-menu");

  function openMobileMenu() {
    mobileMenu.classList.add("open");
    document.body.classList.add("menu-open");
    document.getElementById("menu-toggle").setAttribute("aria-expanded", "true");
    if (lenis) lenis.stop();
  }
  function closeMobileMenu() {
    if (!mobileMenu.classList.contains("open")) return;
    mobileMenu.classList.remove("open");
    document.body.classList.remove("menu-open");
    document.getElementById("menu-toggle").setAttribute("aria-expanded", "false");
    if (lenis) lenis.start();
  }
  function initMobileMenu() {
    document.getElementById("menu-toggle").addEventListener("click", openMobileMenu);
    document.getElementById("menu-close").addEventListener("click", closeMobileMenu);
    mobileMenu.querySelector(".mobile-overlay").addEventListener("click", closeMobileMenu);
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeMobileMenu(); });
  }

  /* ===============================================================
     5. ANIMAÇÕES DE SCROLL (GSAP + ScrollTrigger)
     =============================================================== */
  function initScrollAnimations() {
    if (typeof gsap === "undefined") return;

    if (prefersReduced) {
      // Sem movimento: apenas garante visibilidade
      gsap.set(".reveal, [data-stagger]", { opacity: 1, y: 0 });
      return;
    }

    if (window.ScrollTrigger) gsap.registerPlugin(ScrollTrigger);

    // Reveal individual
    gsap.utils.toArray(".reveal").forEach((el) => {
      gsap.to(el, {
        opacity: 1, y: 0, duration: 0.9, ease: "power3.out",
        scrollTrigger: { trigger: el, start: "top 85%", toggleActions: "play none none none" },
      });
    });

    // Stagger por grupos (cards irmãos animam em sequência)
    const groups = new Map();
    gsap.utils.toArray("[data-stagger]").forEach((el) => {
      const parent = el.parentElement;
      if (!groups.has(parent)) groups.set(parent, []);
      groups.get(parent).push(el);
    });
    groups.forEach((items, parent) => {
      gsap.to(items, {
        opacity: 1, y: 0, duration: 0.8, ease: "power3.out", stagger: 0.12,
        scrollTrigger: { trigger: parent, start: "top 82%", toggleActions: "play none none none" },
      });
    });

    // Hero: timeline de entrada
    const heroTl = gsap.timeline({ defaults: { ease: "power3.out" } });
    heroTl
      .from(".hero-anim", { opacity: 0, y: 30, duration: 0.9, stagger: 0.12 })
      .from(".hero-visual", { opacity: 0, x: 40, duration: 1 }, "-=0.6")
      .to(".hero-progress", { width: "72%", duration: 1.4, ease: "power2.inOut" }, "-=0.5");

    // Parallax leve no grid do hero
    gsap.to(".hero-grid", {
      yPercent: 18, ease: "none",
      scrollTrigger: { trigger: "#hero", start: "top top", end: "bottom top", scrub: true },
    });

    // Parallax genérico das formas decorativas (data-parallax="velocidade")
    gsap.utils.toArray("[data-parallax]").forEach((el) => {
      const speed = parseFloat(el.dataset.parallax) || 0.15;
      const section = el.closest("section") || el.parentElement;
      gsap.to(el, {
        yPercent: speed * 100, ease: "none",
        scrollTrigger: { trigger: section, start: "top bottom", end: "bottom top", scrub: true },
      });
    });

    // Rotação contínua de anéis/formas (data-spin="duração em s")
    gsap.utils.toArray("[data-spin]").forEach((el) => {
      const dur = parseFloat(el.dataset.spin) || 50;
      gsap.to(el, { rotation: 360, duration: dur, ease: "none", repeat: -1 });
    });
  }

  /* ===============================================================
     6. CONTADORES ANIMADOS (seção Sobre)
     =============================================================== */
  function initCounters() {
    if (typeof gsap === "undefined") return;
    gsap.utils.toArray(".about-stat .num").forEach((el) => {
      const end = parseInt(el.dataset.count, 10) || 0;
      const obj = { val: 0 };
      const animate = () => {
        if (prefersReduced) { el.textContent = end; return; }
        gsap.to(obj, {
          val: end, duration: 1.6, ease: "power2.out",
          onUpdate: () => { el.textContent = Math.round(obj.val); },
        });
      };
      if (window.ScrollTrigger) {
        ScrollTrigger.create({ trigger: el, start: "top 90%", once: true, onEnter: animate });
      } else { animate(); }
    });
  }

  /* ===============================================================
     7. ACORDEÃO FAQ (animado)
     =============================================================== */
  function initFaq() {
    const items = document.querySelectorAll(".faq-item");
    items.forEach((item) => {
      const trigger = item.querySelector(".faq-trigger");
      const panel = item.querySelector(".faq-panel");
      const inner = item.querySelector(".faq-panel-inner");

      trigger.addEventListener("click", () => {
        const isOpen = item.classList.contains("active");

        // Fecha os demais (comportamento de acordeão)
        items.forEach((other) => {
          if (other !== item && other.classList.contains("active")) {
            other.classList.remove("active");
            other.querySelector(".faq-trigger").setAttribute("aria-expanded", "false");
            animatePanel(other.querySelector(".faq-panel"), 0);
          }
        });

        if (isOpen) {
          item.classList.remove("active");
          trigger.setAttribute("aria-expanded", "false");
          animatePanel(panel, 0);
        } else {
          item.classList.add("active");
          trigger.setAttribute("aria-expanded", "true");
          animatePanel(panel, inner.offsetHeight);
        }
      });
    });

    function animatePanel(panel, height) {
      if (typeof gsap !== "undefined" && !prefersReduced) {
        gsap.to(panel, { height, duration: 0.4, ease: "power2.inOut" });
      } else {
        panel.style.height = height ? "auto" : "0px";
      }
    }
  }

  /* ===============================================================
     8. MODAL DE CURRÍCULO + validação
     =============================================================== */
  function initCvModal() {
    const modal = document.getElementById("cv-modal");
    const openBtn = document.getElementById("open-cv-modal");
    const closeBtn = document.getElementById("cv-modal-close");
    const overlay = modal.querySelector(".modal-overlay");
    const form = document.getElementById("cv-form");
    const fileInput = document.getElementById("cv-arquivo");
    const fileNameEl = document.getElementById("cv-file-name");
    const successEl = document.getElementById("cv-success");
    const MAX_SIZE = 5 * 1024 * 1024; // 5MB
    let lastFocused = null;

    function open() {
      lastFocused = document.activeElement;
      modal.classList.add("open");
      modal.setAttribute("aria-hidden", "false");
      if (lenis) lenis.stop();
      setTimeout(() => modal.querySelector("input")?.focus(), 200);
    }
    function close() {
      modal.classList.remove("open");
      modal.setAttribute("aria-hidden", "true");
      if (lenis) lenis.start();
      lastFocused?.focus();
    }

    openBtn.addEventListener("click", open);
    closeBtn.addEventListener("click", close);
    overlay.addEventListener("click", close);
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && modal.classList.contains("open")) close();
    });

    // Nome do arquivo selecionado
    fileInput.addEventListener("change", () => {
      fileNameEl.textContent = fileInput.files.length ? fileInput.files[0].name : "";
    });

    // Helpers de validação
    const setError = (id, msg) => {
      const group = document.getElementById(id).closest(".form-group");
      group.classList.add("invalid");
      const errEl = form.querySelector(`.form-error[data-for="${id}"]`);
      if (errEl) errEl.textContent = msg;
    };
    const clearError = (id) => {
      document.getElementById(id).closest(".form-group").classList.remove("invalid");
    };

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      let valid = true;

      const nome = document.getElementById("cv-nome");
      const email = document.getElementById("cv-email");
      const tel = document.getElementById("cv-telefone");

      ["cv-nome", "cv-email", "cv-telefone", "cv-arquivo"].forEach(clearError);

      if (nome.value.trim().length < 3) { setError("cv-nome", "Informe seu nome completo."); valid = false; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) { setError("cv-email", "Informe um e-mail válido."); valid = false; }
      if (tel.value.replace(/\D/g, "").length < 10) { setError("cv-telefone", "Informe um telefone válido."); valid = false; }

      const file = fileInput.files[0];
      if (!file) {
        setError("cv-arquivo", "Selecione um arquivo."); valid = false;
      } else {
        const ext = file.name.split(".").pop().toLowerCase();
        if (!["pdf", "doc", "docx"].includes(ext)) { setError("cv-arquivo", "Formato inválido. Use PDF, DOC ou DOCX."); valid = false; }
        else if (file.size > MAX_SIZE) { setError("cv-arquivo", "Arquivo maior que 5MB."); valid = false; }
      }

      if (!valid) return;

      // Simulação de envio (front-end). Integrar com backend/serviço de e-mail conforme necessário.
      successEl.hidden = false;
      form.querySelector('button[type="submit"]').disabled = true;
      setTimeout(() => {
        form.reset();
        fileNameEl.textContent = "";
        successEl.hidden = true;
        form.querySelector('button[type="submit"]').disabled = false;
        close();
      }, 2200);
    });
  }

  /* ===============================================================
     9. BOTÃO FLUTUANTE: aparece após sair do hero
     =============================================================== */
  function initFloatCta() {
    const cta = document.getElementById("float-cta");
    const hero = document.getElementById("hero");
    if (!cta || !hero) return;
    const onScroll = () => {
      const past = window.scrollY > hero.offsetHeight - 200;
      cta.classList.toggle("show", past);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* ===============================================================
     INICIALIZAÇÃO
     =============================================================== */
  document.addEventListener("DOMContentLoaded", () => {
    initSmoothScroll();
    initAnchorNav();
    initHeader();
    initMobileMenu();
    initScrollAnimations();
    initCounters();
    initFaq();
    initCvModal();
    initFloatCta();

    // Recalcula triggers após carregamento total (fontes/imagens)
    window.addEventListener("load", () => {
      if (window.ScrollTrigger) ScrollTrigger.refresh();
    });
  });
})();
