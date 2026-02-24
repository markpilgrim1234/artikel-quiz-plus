(function initPlusModalComponent(global){
  const LS_VALID_CODES = "db_plus_valid_codes_v1";
  const LS_UNLOCKS = "db_plus_unlocks_v1";
  const ALL_ACCESS_KEY = "__all_plus__";

  const API_BASE = global.DEUTSCHBUDDY_API_BASE || "https://deutschbuddy-api.marco-pellegrino-1.workers.dev";
  const PLUS_VERIFY_URL = `${API_BASE}/api/plus/verify`;
  const PLUS_STATUS_URL = `${API_BASE}/api/plus/status`;
  const PLUS_TOKEN_KEY = "db_plus_token_v1";
  const PLUS_TOKEN_EXP_KEY = "db_plus_token_exp_v1";
  let plusStatusPromise = null;

  function resolveElements(options){
    const root = options && options.root ? options.root : document;
    return {
      modal: root.getElementById("plusModal"),
      closeModalBtn: root.getElementById("closeModal"),
      okBtn: root.getElementById("okBtn"),
      plusText: root.getElementById("plusText"),
      waitlistBtn: root.getElementById("waitlistBtn"),
      modalActions: root.querySelector("#plusModal .modalActions")
    };
  }

  function getUnlocks(){
    try { return JSON.parse(sessionStorage.getItem(LS_UNLOCKS) || "{}"); }
    catch { return {}; }
  }
  function setUnlocks(v){ sessionStorage.setItem(LS_UNLOCKS, JSON.stringify(v)); }

  function getValidCodes(){
    try { return JSON.parse(sessionStorage.getItem(LS_VALID_CODES) || "[]"); }
    catch { return []; }
  }
  function setValidCodes(v){ sessionStorage.setItem(LS_VALID_CODES, JSON.stringify(v)); }

  function getPlusToken(){ return sessionStorage.getItem(PLUS_TOKEN_KEY); }
  function setPlusToken(token, exp){
    sessionStorage.setItem(PLUS_TOKEN_KEY, token);
    if (exp) sessionStorage.setItem(PLUS_TOKEN_EXP_KEY, String(exp));
  }
  function clearPlusToken(){
    sessionStorage.removeItem(PLUS_TOKEN_KEY);
    sessionStorage.removeItem(PLUS_TOKEN_EXP_KEY);
  }

  function hasAllAccess(){
    return !!getPlusToken();
  }

  function unlockAllPlus(){
    const unlocks = getUnlocks();
    unlocks[ALL_ACCESS_KEY] = true;
    setUnlocks(unlocks);
  }

  function applyUnlockState(cardSelector){
    if (!hasAllAccess()) return;
    document.querySelectorAll(cardSelector).forEach(card => {
      card.classList.remove("locked");
      card.classList.remove("gameCard");
      card.removeAttribute("data-plus");
      card.removeAttribute("tabindex");
      card.removeAttribute("role");
      card.classList.add("plusUnlocked");
      card.setAttribute("title", "Plus unlocked");
    });
  }

  async function verifyCodeWithWorker(code){
    const res = await fetch(PLUS_VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) throw new Error(data.error || "verify_failed");
    setPlusToken(data.token, data.exp);
    return data;
  }

  async function refreshPlusStatusWithWorker(){
    const token = getPlusToken();
    if (!token) return { plus: false };

    const tokenExp = parseInt(sessionStorage.getItem(PLUS_TOKEN_EXP_KEY) || "0", 10);
    const now = Math.floor(Date.now() / 1000);

    if (!navigator.onLine) {
      if (token && tokenExp && tokenExp > now) return { plus: true, exp: tokenExp };
      clearPlusToken();
      return { plus: false };
    }

    let res;
    try {
      res = await fetch(PLUS_STATUS_URL, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch {
      if (token && tokenExp && tokenExp > now) return { plus: true, exp: tokenExp };
      clearPlusToken();
      return { plus: false };
    }

    const data = await res.json().catch(() => ({}));

    if (!res.ok || !data.ok || !data.plus){
      clearPlusToken();
      return { plus: false };
    }

    if (data.exp) sessionStorage.setItem(PLUS_TOKEN_EXP_KEY, String(data.exp));
    return { plus: true, exp: data.exp };
  }

  function refreshPlusStatusOnce(){
    if (!plusStatusPromise) {
      plusStatusPromise = refreshPlusStatusWithWorker();
    }
    return plusStatusPromise;
  }

  function initPlusModal(options){
    const formUrl = (options && options.formUrl) || "https://docs.google.com/forms/d/e/1FAIpQLSd7aZ8okTdi2sr08p8l8HZ2r6oH09BsF3L_mJQtSc8q0nFRdw/viewform?usp=header";
    const cardSelector = (options && options.cardSelector) || ".gameCard.locked";

    const { modal, closeModalBtn, okBtn, plusText, waitlistBtn, modalActions } = resolveElements(options);
    if (!modal || !closeModalBtn || !okBtn || !plusText || !waitlistBtn) return;

    let currentModuleName = "This game";

    refreshPlusStatusOnce().then(status => {
      if (status.plus) {
        unlockAllPlus();
        applyUnlockState(cardSelector);
      }
    }).catch(() => {
      // Non-blocking: keep locked state on status refresh errors.
    });

    function ensureCodeButton(){
      if (!modalActions) return null;
      let codeBtn = modalActions.querySelector("#codeBtn");
      if (codeBtn) return codeBtn;

      codeBtn = document.createElement("button");
      codeBtn.id = "codeBtn";
      codeBtn.type = "button";
      codeBtn.className = "btn";
      codeBtn.textContent = "Code";
      modalActions.appendChild(codeBtn);
      return codeBtn;
    }

    function openModal(moduleName){
      currentModuleName = moduleName || "This game";
      plusText.innerHTML =
        `The <strong>${currentModuleName}</strong> is part of <strong>DeutschBuddy Plus</strong> and will be available soon.<br>` +
        "Want early access, updates, or code access?";
      waitlistBtn.href = formUrl;
      modal.style.display = "flex";
      modal.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";
    }

    function closeModal(){
      modal.style.display = "none";
      modal.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
    }

    document.querySelectorAll(cardSelector).forEach(card => {
      const name = card.getAttribute("data-plus") || "This game";
      card.addEventListener("click", (e) => { if (hasAllAccess()) return; e.preventDefault(); openModal(name); });
      card.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          if (hasAllAccess()) return;
          e.preventDefault();
          openModal(name);
        }
      });
    });

    const codeBtn = ensureCodeButton();
    if (codeBtn) {
      codeBtn.addEventListener("click", async () => {
        const code = prompt("Enter your access code");
        if (!code) return;

        try {
          await verifyCodeWithWorker(code);

          const codes = getValidCodes();
          const normalizedCode = code.trim();
          if (!codes.includes(normalizedCode)) {
            codes.push(normalizedCode);
            setValidCodes(codes);
          }

          unlockAllPlus();
          applyUnlockState(cardSelector);
          alert("Code accepted. All Plus features are now unlocked on this browser session.");
          closeModal();
        } catch (err) {
          const msg = err && err.message ? err.message : "verify_failed";
          if (msg === "invalid_code") {
            alert("Invalid code.");
          } else if (msg === "rate_limited") {
            alert("Too many attempts. Try again in a minute.");
          } else if (msg === "missing_code") {
            alert("Please enter a code.");
          } else {
            alert("Couldn’t verify right now. Check connection and try again.");
          }
        }
      });
    }

    closeModalBtn.addEventListener("click", closeModal);
    okBtn.addEventListener("click", closeModal);

    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeModal();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && modal.style.display === "flex") closeModal();
    });
  }

  global.DeutschBuddyPlusModal = {
    initPlusModal,
    hasAllAccess,
    refreshPlusStatusWithWorker,
    refreshPlusStatusOnce,
    getPlusToken,
    clearPlusToken
  };
})(window);
