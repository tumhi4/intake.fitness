(function () {
  const TOOL_ID = "tdee";

  const $ = (s, r = document) => r.querySelector(s);

  const form = $(`#${TOOL_ID}-form`);
  const fieldsWrap = $(`#${TOOL_ID}-fields`);
  const results = $(`#${TOOL_ID}-results`);
  const big = $(`#${TOOL_ID}-big`);
  const kvWrap = $(`#${TOOL_ID}-kv`);
  const badges = $(`#${TOOL_ID}-badges`);
  const resetBtn = $(`#${TOOL_ID}-reset`);

  const copyLinkBtn = $(`#${TOOL_ID}-copy-link`);
  const copySummaryBtn = $(`#${TOOL_ID}-copy-summary`);
  const downloadBtn = $(`#${TOOL_ID}-download-png`);
  const card = $(`#${TOOL_ID}-card`);

  let units = "us";

  // ---------- UI build ----------
  function renderFields() {
    fieldsWrap.innerHTML = `
      <div class="row2">
        <div class="field">
          <div class="label">Sex</div>
          <select class="input" name="sex" required>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
        </div>

        <div class="field">
          <div class="label">Age</div>
          <input class="input" name="age" type="number" min="13" max="90" required placeholder="e.g. 30">
        </div>
      </div>

      ${units === "us" ? `
      <div class="row2">
        <div class="field">
          <div class="label">Height (ft)</div>
          <input class="input" name="height_ft" type="number" min="3" max="8" required placeholder="e.g. 5">
        </div>
        <div class="field">
          <div class="label">Height (in)</div>
          <input class="input" name="height_in" type="number" min="0" max="11" required placeholder="e.g. 10">
        </div>
      </div>

      <div class="field">
        <div class="label">Weight (lb)</div>
        <input class="input" name="weight_lb" type="number" min="70" max="600" required placeholder="e.g. 180">
      </div>
      ` : `
      <div class="field">
        <div class="label">Height (cm)</div>
        <input class="input" name="height_cm" type="number" min="120" max="230" required placeholder="e.g. 178">
      </div>

      <div class="field">
        <div class="label">Weight (kg)</div>
        <input class="input" name="weight_kg" type="number" min="30" max="300" required placeholder="e.g. 82">
      </div>
      `}

      <div class="field">
        <div class="label">Activity level</div>
        <select class="input" name="activity" required>
          <option value="sedentary">Sedentary (little exercise)</option>
          <option value="light">Light (1–3 days/week)</option>
          <option value="moderate" selected>Moderate (3–5 days/week)</option>
          <option value="very">Very active (6–7 days/week)</option>
          <option value="extra">Extra active (physical job + training)</option>
        </select>
      </div>
    `;
  }

  function setUnits(next) {
    units = next;
    document.querySelectorAll(".chip[data-units]").forEach(btn => {
      btn.classList.toggle("is-active", btn.getAttribute("data-units") === units);
    });
    renderFields();
    // also try applying query params if present
    hydrateFromQuery();
  }

  document.querySelectorAll(".chip[data-units]").forEach(btn => {
    btn.addEventListener("click", () => setUnits(btn.getAttribute("data-units")));
  });

  // ---------- math ----------
  const ACT = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    very: 1.725,
    extra: 1.9
  };

  function lbToKg(lb) { return lb * 0.45359237; }
  function ftInToCm(ft, inch) { return (ft * 12 + inch) * 2.54; }

  // Mifflin-St Jeor
  function bmrMifflin(sex, kg, cm, age) {
    const base = (10 * kg) + (6.25 * cm) - (5 * age);
    return sex === "male" ? (base + 5) : (base - 161);
  }

  function round(n) { return Math.round(n); }

  function buildShareUrl(params) {
    const url = new URL(window.location.href);
    url.search = ""; // reset
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
    });
    url.searchParams.set("share", "1");
    return url.toString();
  }

  function summaryText(out) {
    return `TDEE: ${out.tdee} kcal/day | Cut: ${out.cut} | Bulk: ${out.bulk} (estimate)`;
  }

  // ---------- rendering ----------
  function renderResult(out) {
    results.hidden = false;

    big.textContent = `${out.tdee}`;
    badges.innerHTML = `
      <span class="badge good">Shareable</span>
      <span class="badge">Estimate</span>
    `;

    kvWrap.innerHTML = `
      <div class="kv"><div class="k">BMR</div><div class="v">${out.bmr}</div></div>
      <div class="kv"><div class="k">TDEE</div><div class="v">${out.tdee}</div></div>
      <div class="kv"><div class="k">Cut (−15%)</div><div class="v">${out.cut}</div></div>
      <div class="kv"><div class="k">Bulk (+10%)</div><div class="v">${out.bulk}</div></div>
    `;

    const shareUrl = buildShareUrl(out.shareParams);
    copyLinkBtn.onclick = () => window.__intake.copyText(shareUrl);
    copySummaryBtn.onclick = () => window.__intake.copyText(summaryText(out));

    downloadBtn.onclick = () => downloadCardPng(card, `tdee-${out.tdee}.png`);

    // Update address bar for shareability without reload
    window.history.replaceState({}, "", shareUrl);
  }

  // ---------- PNG download (no external libs) ----------
  async function downloadCardPng(node, filename) {
    // Simple DOM → SVG foreignObject → PNG
    const rect = node.getBoundingClientRect();
    const w = Math.ceil(rect.width);
    const h = Math.ceil(rect.height);

    const clone = node.cloneNode(true);
    // Inline computed styles to make it stable
    inlineAllStyles(node, clone);

    const data = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
        <foreignObject width="100%" height="100%">
          <div xmlns="http://www.w3.org/1999/xhtml">${clone.outerHTML}</div>
        </foreignObject>
      </svg>
    `;
    const svgBlob = new Blob([data], { type: "image/svg+xml;charset=utf-8" });
    const svgUrl = URL.createObjectURL(svgBlob);

    const img = new Image();
    img.crossOrigin = "anonymous";
    await new Promise((res, rej) => {
      img.onload = () => res();
      img.onerror = (e) => rej(e);
      img.src = svgUrl;
    });

    const canvas = document.createElement("canvas");
    canvas.width = w * 2;  // retina
    canvas.height = h * 2;
    const ctx = canvas.getContext("2d");
    ctx.scale(2, 2);
    ctx.drawImage(img, 0, 0, w, h);

    URL.revokeObjectURL(svgUrl);

    canvas.toBlob((blob) => {
      if (!blob) return window.__intake.toast("PNG failed");
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    }, "image/png");
  }

  function inlineAllStyles(srcNode, dstNode) {
    const srcEls = srcNode.querySelectorAll("*");
    const dstEls = dstNode.querySelectorAll("*");
    for (let i = 0; i < srcEls.length; i++) {
      const cs = window.getComputedStyle(srcEls[i]);
      let style = "";
      // minimal set to keep it stable
      const props = ["font", "fontSize", "fontWeight", "letterSpacing", "color",
                     "background", "backgroundColor", "border", "borderRadius",
                     "padding", "margin", "display", "gap", "alignItems",
                     "justifyContent", "lineHeight", "boxShadow"];
      props.forEach(p => style += `${kebab(p)}:${cs[p]};`);
      dstEls[i].setAttribute("style", style);
    }
    // also style root
    const root = window.getComputedStyle(srcNode);
    dstNode.setAttribute("style", `width:${root.width};height:${root.height};${dstNode.getAttribute("style")||""}`);
  }

  function kebab(s){ return s.replace(/[A-Z]/g, m => "-" + m.toLowerCase()); }

  // ---------- querystring hydration ----------
  function getNum(name) {
    const v = new URLSearchParams(location.search).get(name);
    if (v === null) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }

  function hydrateFromQuery() {
    const qs = new URLSearchParams(location.search);
    if (!qs.get("share")) return;

    // infer units based on params
    if (qs.get("weight_kg") || qs.get("height_cm")) setUnits("metric");
    if (qs.get("weight_lb") || qs.get("height_ft")) setUnits("us");

    // set fields if exist
    const set = (name, val) => {
      const el = form.querySelector(`[name="${name}"]`);
      if (el && val !== null && val !== undefined) el.value = String(val);
    };

    set("sex", qs.get("sex"));
    set("age", qs.get("age"));
    set("activity", qs.get("activity"));

    if (units === "us") {
      set("height_ft", qs.get("height_ft"));
      set("height_in", qs.get("height_in"));
      set("weight_lb", qs.get("weight_lb"));
    } else {
      set("height_cm", qs.get("height_cm"));
      set("weight_kg", qs.get("weight_kg"));
    }
  }

  // ---------- submit ----------
  function parseForm() {
    const fd = new FormData(form);
    const sex = String(fd.get("sex") || "male");
    const age = Number(fd.get("age"));
    const activity = String(fd.get("activity") || "moderate");

    let cm, kg;

    if (units === "us") {
      const ft = Number(fd.get("height_ft"));
      const inch = Number(fd.get("height_in"));
      const lb = Number(fd.get("weight_lb"));
      cm = ftInToCm(ft, inch);
      kg = lbToKg(lb);
    } else {
      cm = Number(fd.get("height_cm"));
      kg = Number(fd.get("weight_kg"));
    }

    return { sex, age, activity, cm, kg, raw: Object.fromEntries(fd.entries()) };
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const x = parseForm();

    if (!Number.isFinite(x.age) || !Number.isFinite(x.cm) || !Number.isFinite(x.kg)) {
      return window.__intake.toast("Check your inputs");
    }

    const bmr = bmrMifflin(x.sex, x.kg, x.cm, x.age);
    const tdee = bmr * (ACT[x.activity] || 1.55);

    const out = {
      bmr: round(bmr),
      tdee: round(tdee),
      cut: round(tdee * 0.85),
      bulk: round(tdee * 1.10),
      shareParams: {
        sex: x.sex,
        age: x.age,
        activity: x.activity,
        ...(units === "us"
          ? {
              height_ft: Number(x.raw.height_ft),
              height_in: Number(x.raw.height_in),
              weight_lb: Number(x.raw.weight_lb)
            }
          : {
              height_cm: x.cm,
              weight_kg: x.kg
            })
      }
    };

    renderResult(out);
  });

  resetBtn.addEventListener("click", () => {
    form.reset();
    results.hidden = true;
    window.history.replaceState({}, "", window.location.pathname);
    window.__intake.toast("Reset");
  });

  // init
  renderFields();
  hydrateFromQuery();
})();
