// Template: interações do site (menu, rolagem, efeitos 3D, formulário)
(function () {
  "use strict";

  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Ano atual no rodapé
  var year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();

  // Sombra no cabeçalho ao rolar
  var header = document.getElementById("header");
  function onScroll() {
    header.classList.toggle("is-scrolled", window.scrollY > 10);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // Menu mobile
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.getElementById("menu");
  function setMenu(open) {
    nav.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Fechar menu" : "Abrir menu");
  }
  toggle.addEventListener("click", function () {
    setMenu(!nav.classList.contains("is-open"));
  });
  nav.addEventListener("click", function (e) {
    if (e.target.tagName === "A") setMenu(false);
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") setMenu(false);
  });

  // Destaque do item de menu da seção visível
  var links = Array.prototype.slice.call(nav.querySelectorAll('a[href^="#"]:not(.btn)'));
  var sections = links
    .map(function (a) { return document.querySelector(a.getAttribute("href")); })
    .filter(Boolean);

  if ("IntersectionObserver" in window) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        links.forEach(function (a) {
          a.classList.toggle("is-active", a.getAttribute("href") === "#" + entry.target.id);
        });
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    sections.forEach(function (s) { spy.observe(s); });

    // Animação de entrada dos blocos: qualquer elemento com data-reveal (ou os seletores abaixo)
    var revealables = document.querySelectorAll(
      "[data-reveal], .card, .steps li, .faq details, .section__head, .feature"
    );
    var reveal = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        el.classList.add("is-visible");
        obs.unobserve(el);
        // depois da entrada, devolve o transform ao CSS (efeitos de hover e inclinação)
        setTimeout(function () {
          el.classList.remove("reveal", "is-visible");
          el.style.transitionDelay = "";
        }, 1000 + (parseFloat(el.style.transitionDelay) || 0) * 1000);
      });
    }, { threshold: 0.12 });
    revealables.forEach(function (el) {
      // blocos vizinhos entram em sequência
      var index = Array.prototype.indexOf.call(el.parentNode.children, el);
      if (!reduceMotion) el.style.transitionDelay = (index % 4) * 0.08 + "s";
      el.classList.add("reveal");
      reveal.observe(el);
    });
  }

  // Chamada do topo: inclina e se afasta em 3D conforme a página desce (e volta ao subir)
  var hero = document.querySelector(".hero");
  var heroContent = document.querySelector(".hero__content");
  if (hero && heroContent && !reduceMotion) {
    var heroQueued = false;
    var updateHero = function () {
      heroQueued = false;
      var k = Math.min(1, Math.max(0, window.scrollY / hero.offsetHeight));
      heroContent.style.transform =
        "perspective(1000px) translate3d(0," + (k * 70).toFixed(1) + "px," + (-k * 160).toFixed(1) + "px) rotateX(" + (k * 18).toFixed(2) + "deg)";
      heroContent.style.opacity = String(1 - k * 0.85);
    };
    window.addEventListener("scroll", function () {
      if (!heroQueued) { heroQueued = true; requestAnimationFrame(updateHero); }
    }, { passive: true });
    updateHero();
  }

  // Cartões inclinam em 3D acompanhando o mouse: qualquer elemento com data-tilt (ou .card)
  if (!reduceMotion && window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    Array.prototype.forEach.call(document.querySelectorAll("[data-tilt], .card"), function (el) {
      el.classList.add("tilt");
      var strength = 9;
      el.addEventListener("pointermove", function (e) {
        if (el.classList.contains("reveal")) return;
        var r = el.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width - 0.5;
        var py = (e.clientY - r.top) / r.height - 0.5;
        el.style.transition = "transform .08s linear, box-shadow .25s";
        el.style.transform =
          "perspective(800px) rotateX(" + (-py * strength).toFixed(2) + "deg) rotateY(" + (px * strength * 1.2).toFixed(2) + "deg) translateY(-6px)";
        el.style.setProperty("--gx", ((px + 0.5) * 100).toFixed(1) + "%");
        el.style.setProperty("--gy", ((py + 0.5) * 100).toFixed(1) + "%");
      });
      el.addEventListener("pointerleave", function () {
        el.style.transition = "transform .5s cubic-bezier(.2,.7,.2,1), box-shadow .25s";
        el.style.transform = "";
      });
    });
  }

  // Formulário de contato: monta a mensagem e abre o WhatsApp ou o e-mail.
  // Configure no <form>: data-whatsapp="5511999999999" (DDI+DDD+número) e data-email="contato@exemplo.com"
  var form = document.getElementById("contact-form");
  if (form) {
    var error = document.getElementById("form-error");
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var valid = true;
      Array.prototype.forEach.call(form.querySelectorAll("[required]"), function (field) {
        var ok = field.value.trim() !== "";
        field.classList.toggle("is-invalid", !ok);
        if (!ok) valid = false;
      });
      if (error) error.hidden = valid;
      if (!valid) return;

      var data = new FormData(form);
      var body = Array.from(data.entries()).map(function (p) { return p[0] + ": " + (p[1] || "-"); }).join("\n");
      var channel = e.submitter && e.submitter.dataset.channel;
      if (channel === "email") {
        window.location.href = "mailto:" + form.dataset.email +
          "?subject=" + encodeURIComponent("Contato pelo site") + "&body=" + encodeURIComponent(body);
      } else {
        window.open("https://wa.me/" + form.dataset.whatsapp + "?text=" + encodeURIComponent("Olá! Vim pelo site.\n\n" + body),
          "_blank", "noopener");
      }
    });
  }
})();
