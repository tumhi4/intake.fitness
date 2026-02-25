(function () {
  const $ = (s, r = document) => r.querySelector(s);

  // Mobile nav
  const toggle = $(".nav-toggle");
  const nav = document.querySelector("[data-nav]");
  if (toggle && nav) {
    toggle.addEventListener("click", () => {
      const open = nav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }

  // Tiny toast
  function toast(msg) {
    let el = $("#toast");
    if (!el) {
      el = document.createElement("div");
      el.id = "toast";
      el.style.position = "fixed";
      el.style.left = "50%";
      el.style.bottom = "18px";
      el.style.transform = "translateX(-50%)";
      el.style.padding = "10px 12px";
      el.style.borderRadius = "14px";
      el.style.background = "rgba(15,23,48,.95)";
      el.style.border = "1px solid rgba(234,240,255,.14)";
      el.style.color = "rgba(234,240,255,.9)";
      el.style.fontWeight = "700";
      el.style.boxShadow = "0 12px 30px rgba(0,0,0,.35)";
      el.style.zIndex = "9999";
      el.style.opacity = "0";
      el.style.transition = "opacity .15s ease";
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.style.opacity = "1";
    clearTimeout(el._t);
    el._t = setTimeout(() => (el.style.opacity = "0"), 1200);
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      toast("Copied");
      return true;
    } catch (e) {
      // fallback
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
      toast("Copied");
      return true;
    }
  }

  window.__intake = { toast, copyText };
})();
