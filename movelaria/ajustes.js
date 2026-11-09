/* Ajustes pos-auditoria: metadados sociais, dimensoes de imagem,
   validacao do formulario, aviso LGPD e link de privacidade. */
(function () {
  "use strict";

  var DIMS = window.__DIMS || {};
  var META = window.__META || {};

  /* ---------- 1. metadados (o React remove tags que nao conhece) ---------- */
  function setMeta(attr, key, value) {
    if (!value) return;
    var el = document.head.querySelector("meta[" + attr + '="' + key + '"]');
    if (!el) {
      el = document.createElement("meta");
      el.setAttribute(attr, key);
      document.head.appendChild(el);
    }
    if (el.getAttribute("content") !== value) el.setAttribute("content", value);
  }
  function ensureMeta() {
    setMeta("property", "og:image", META.ogImage);
    setMeta("property", "og:image:width", "1200");
    setMeta("property", "og:image:height", "630");
    setMeta("property", "og:url", META.ogUrl);
    setMeta("name", "twitter:image", META.ogImage);
    if (META.canonical) {
      var link = document.head.querySelector('link[rel="canonical"]');
      if (!link) {
        link = document.createElement("link");
        link.setAttribute("rel", "canonical");
        document.head.appendChild(link);
      }
      if (link.getAttribute("href") !== META.canonical) link.setAttribute("href", META.canonical);
    }
    /* favicon (o React pode remover links que nao conhece) */
    var favLinks = [
      ["icon", "/favicon-64.png", "image/png"],
      ["apple-touch-icon", "/apple-touch-icon.png", null]
    ];
    favLinks.forEach(function (f) {
      var sel = 'link[rel="' + f[0] + '"]';
      var el = document.head.querySelector(sel);
      if (!el) {
        el = document.createElement("link");
        el.setAttribute("rel", f[0]);
        document.head.appendChild(el);
      }
      el.setAttribute("href", f[1]);
      if (f[2]) el.setAttribute("type", f[2]);
    });
  }

  /* ---------- 2. width/height em todas as imagens ---------- */
  function keyOf(img) {
    var src = img.getAttribute("src") || "";
    try {
      return new URL(src, location.href).pathname;
    } catch (e) {
      return src;
    }
  }
  function applyDims(img) {
    if (img.getAttribute("width") && img.getAttribute("height")) return;
    var d = DIMS[keyOf(img)];
    if (!d && img.naturalWidth) d = [img.naturalWidth, img.naturalHeight];
    if (!d) {
      if (!img.__dimsHooked) {
        img.__dimsHooked = true;
        img.addEventListener("load", function () {
          if (img.naturalWidth) {
            img.setAttribute("width", img.naturalWidth);
            img.setAttribute("height", img.naturalHeight);
          }
        });
      }
      return;
    }
    img.setAttribute("width", d[0]);
    img.setAttribute("height", d[1]);
  }
  function sweepImages() {
    var imgs = document.querySelectorAll("img");
    for (var i = 0; i < imgs.length; i++) applyDims(imgs[i]);
  }

  /* ---------- 3. formulario de contato ---------- */
  var AMBIENTE_PLACEHOLDER = "Selecione o ambiente";

  function prepareSelect(sel) {
    if (!sel.__prepared) {
      sel.__prepared = true;
      sel.setAttribute("required", "");
      sel.addEventListener("change", function () {
        sel.__touched = true;
        clearError(sel);
      });
    }
    var first = sel.options[0];
    if (!first || first.value !== "") {
      var opt = document.createElement("option");
      opt.value = "";
      opt.textContent = AMBIENTE_PLACEHOLDER;
      sel.insertBefore(opt, sel.firstChild);
    }
    if (!sel.__touched && sel.value !== "") sel.value = "";
  }

  function setError(el, msg) {
    el.setAttribute("aria-invalid", "true");
    el.style.borderColor = "#b3261e";
    el.__msg = msg;
  }
  function clearError(el) {
    el.removeAttribute("aria-invalid");
    el.style.borderColor = "";
    el.__msg = "";
    var box = document.querySelector("[data-erros]");
    if (box) box.style.display = "none";
  }

  function errorBox(form) {
    var box = form.querySelector("[data-erros]");
    if (!box) {
      box = document.createElement("div");
      box.setAttribute("data-erros", "");
      box.setAttribute("role", "alert");
      box.style.cssText =
        "display:none;border:1px solid #b3261e;color:#b3261e;padding:0.75rem 1rem;font-size:0.85rem;line-height:1.5;border-radius:0.5rem";
      form.insertBefore(box, form.firstChild);
    }
    return box;
  }

  function lgpdNotice(form) {
    if (form.querySelector("[data-lgpd]")) return;
    var p = document.createElement("p");
    p.setAttribute("data-lgpd", "");
    p.style.cssText = "font-size:0.75rem;line-height:1.6;opacity:0.7";
    p.innerHTML =
      "Ao enviar, voc\u00ea concorda que seus dados (nome, ambiente de interesse e descri\u00e7\u00e3o do projeto) sejam utilizados apenas para o atendimento do seu pedido de or\u00e7amento, conforme a LGPD. Saiba mais na nossa " +
      '<a href="/privacidade/" style="text-decoration:underline">Pol\u00edtica de Privacidade</a>.';
    form.appendChild(p);
  }

  function validate(form) {
    var problems = [];
    var nome = form.querySelector("#nome");
    var ambiente = form.querySelector("#ambiente");
    var mensagem = form.querySelector("#mensagem");

    if (nome) {
      if (!nome.value.trim() || nome.value.trim().length < 2) {
        problems.push("Informe seu nome.");
        setError(nome, "Informe seu nome.");
      } else clearError(nome);
    }
    if (ambiente) {
      if (!ambiente.value) {
        problems.push("Escolha o ambiente do projeto.");
        setError(ambiente, "Escolha o ambiente do projeto.");
      } else clearError(ambiente);
    }
    if (mensagem) {
      mensagem.setAttribute("required", "");
      mensagem.setAttribute("minlength", "10");
      if (mensagem.value.trim().length < 10) {
        problems.push("Conte um pouco sobre o projeto (pelo menos 10 caracteres).");
        setError(mensagem, "Conte um pouco sobre o projeto (pelo menos 10 caracteres).");
      } else clearError(mensagem);
    }

    [nome, ambiente, mensagem].forEach(function (el) {
      if (el && el.setCustomValidity) el.setCustomValidity(el.__msg || "");
    });

    var box = errorBox(form);
    if (problems.length) {
      box.innerHTML = "Revise os campos:<br>\u2022 " + problems.join("<br>\u2022 ");
      box.style.display = "block";
      return false;
    }
    box.style.display = "none";
    return true;
  }

  function hookForm(form) {
    if (form.__hooked) return;
    form.__hooked = true;
    form.setAttribute("novalidate", "");
    form.addEventListener(
      "submit",
      function (ev) {
        if (!validate(form)) {
          ev.preventDefault();
          ev.stopImmediatePropagation();
          var bad = form.querySelector('[aria-invalid="true"]');
          if (bad) bad.focus();
        }
      },
      true
    );
    ["input", "change"].forEach(function (evt) {
      form.addEventListener(evt, function (e) {
        if (e.target && e.target.__msg) clearError(e.target);
      });
    });
  }

  function sweepForm() {
    var form = document.querySelector("form");
    if (!form || !form.querySelector("#mensagem")) return;
    hookForm(form);
    lgpdNotice(form);
    var nome = form.querySelector("#nome");
    if (nome) nome.setAttribute("required", "");
    var sel = form.querySelector("#ambiente");
    if (sel) prepareSelect(sel);
    var msg = form.querySelector("#mensagem");
    if (msg) {
      msg.setAttribute("required", "");
      msg.setAttribute("minlength", "10");
    }
  }

  /* ---------- 4. animacao do carrossel ---------- */
  function ensureCarouselMotion() {
    if (!document.getElementById("fullscreen-carousel-css")) {
      var link = document.createElement("link");
      link.id = "fullscreen-carousel-css";
      link.rel = "stylesheet";
      link.href = "/carrossel.css";
      document.head.appendChild(link);
    }
    var id = "carousel-ken-burns-in";
    if (document.getElementById(id)) return;
    var style = document.createElement("style");
    style.id = id;
    style.textContent =
      '@keyframes kenBurnsIn{from{transform:scale(1)}to{transform:scale(1.1)}}' +
      'section[class*="h-[78vh]"]>img{transition-property:opacity!important;transition-duration:500ms!important;transition-timing-function:ease-in-out!important;transform:scale(1);will-change:opacity,transform}' +
      'section[class*="h-[78vh]"]>img.opacity-100{animation:kenBurnsIn 6000ms ease-out forwards}' +
      '@media (prefers-reduced-motion:reduce){section[class*="h-[78vh]"]>img{animation:none!important;transition-duration:1ms!important;transform:none!important}}';
    document.head.appendChild(style);
  }

  /* ---------- 5. galeria com distribuicao alinhada ---------- */
  function sweepGallery() {
    var grids = document.querySelectorAll('div[class*="columns-1"]');
    for (var i = 0; i < grids.length; i++) {
      var grid = grids[i];
      if (grid.querySelectorAll("figure img").length >= 8) grid.classList.add("gallery-bento");
    }
  }

  /* ---------- 5. link de privacidade no rodape ---------- */
  function sweepFooter() {
    var footer = document.querySelector("footer");
    if (!footer || footer.querySelector("[data-privacidade]")) return;
    var a = document.createElement("a");
    a.setAttribute("data-privacidade", "");
    a.href = "/privacidade/";
    a.textContent = "Privacidade";
    a.style.cssText = "text-decoration:underline;opacity:0.75;font-size:0.72rem;letter-spacing:0.08em";
    var last = footer.querySelector("div:last-child p:last-child") || footer.lastElementChild;
    var holder = document.createElement("p");
    holder.style.cssText = "margin-top:0.75rem";
    holder.appendChild(a);
    var cnpj = document.createElement("span");
    cnpj.setAttribute("data-cnpj", "");
    cnpj.textContent = "Movelaria R&T \u00b7 CNPJ 54.547.700/0001-20 \u00b7 ";
    cnpj.style.cssText = "opacity:0.75;font-size:0.72rem;letter-spacing:0.08em";
    holder.insertBefore(cnpj, a);
    (last && last.parentNode ? last.parentNode : footer).appendChild(holder);
    if (!footer.querySelector("[data-allhub]")) {
      var dev = document.createElement("p");
      dev.setAttribute("data-allhub", "");
      dev.textContent = "Desenvolvido por All Hub";
      dev.style.cssText = "text-align:center;opacity:0.45;font-size:0.68rem;letter-spacing:0.12em;padding:0 1.25rem 1.5rem;margin:0";
      footer.appendChild(dev);
    }
  }

  /* ---------- 6. imagens responsivas ---------- */
  function ensureResponsiveCss() {
    if (document.getElementById("responsive-img-css")) return;
    var st = document.createElement("style");
    st.id = "responsive-img-css";
    st.textContent =
      'main img{max-width:100%}' +
      'main img:not([class*="absolute"]):not([class*="size-full"]):not([class*="aspect-"]){height:auto}' +
      'html,body{overflow-x:hidden}.whitespace-pre-line{white-space:pre-line}' +
      '@media(max-width:767px){main img[class*="aspect-[4/5]"],main img[class*="aspect-square"]{aspect-ratio:4/3}' +
      '.gallery-bento>figure{aspect-ratio:1}main [class*="columns-"] img{max-height:70vh;object-fit:cover}}';
    document.head.appendChild(st);
  }

  function sweep() {
    ensureMeta();
    sweepImages();
    sweepForm();
    ensureCarouselMotion();
    sweepGallery();
    sweepFooter();
    ensureResponsiveCss();
  }

  sweep();
  document.addEventListener("DOMContentLoaded", sweep);
  window.addEventListener("load", sweep);
  var obs = new MutationObserver(function () {
    sweep();
  });
  obs.observe(document.documentElement, { childList: true, subtree: true });
  var ticks = 0;
  var timer = setInterval(function () {
    sweep();
    if (++ticks > 40) clearInterval(timer);
  }, 250);
})();
