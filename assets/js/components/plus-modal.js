(function initPlusModalComponent(global){
  const LS_VALID_CODES = "db_plus_valid_codes_v1";
  const LS_UNLOCKS = "db_plus_unlocks_v1";
  const ALL_ACCESS_KEY = "__all_plus__";

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

  function parseSheet(text){
    const lines = text.trim().split(/\r?\n/).filter(Boolean);
    if (!lines.length) return [];
    const delimiter = lines[0].includes("\t") ? "\t" : ",";
    const header = lines[0].split(delimiter).map(h => h.trim().toLowerCase());
    const iCodeNum = header.findIndex(h => h === "code number" || h === "code_number" || h === "code");
    const iCodeVal = header.findIndex(h => h === "code value" || h === "code_value");
    const iAssign = header.findIndex(h => h === "assignment");
    if (iCodeVal < 0) return [];

    return lines.slice(1).map(line => line.split(delimiter)).map(cols => ({
      codeNumber: (cols[iCodeNum] || "").trim(),
      codeValue: iCodeVal >= 0 ? (cols[iCodeVal] || "").trim() : "",
      assignment: iAssign >= 0 ? (cols[iAssign] || "").trim() : ""
    })).filter(r => r.codeValue);
  }


  function hasAllAccess(){
    const unlocks = getUnlocks();
    return !!unlocks[ALL_ACCESS_KEY];
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

  async function validateCodeWithSheet({ codeSheetUrl, codeInput, moduleName }){
    if (!codeSheetUrl) {
      return { ok: false, message: "Code list not configured yet." };
    }

    try {
      const res = await fetch(codeSheetUrl + (codeSheetUrl.includes("?") ? "&" : "?") + "t=" + Date.now());
      if (!res.ok) return { ok: false, message: "Code list unavailable." };
      const txt = await res.text();
      const rows = parseSheet(txt);
      const normalized = codeInput.trim().toLowerCase();

      const match = rows.find(r => r.codeValue.trim().toLowerCase() === normalized);
      if (!match) return { ok: false, message: "Invalid code." };

      return { ok: true, message: "Code accepted." };
    } catch {
      return { ok: false, message: "Code check failed. Please try again." };
    }
  }

  function initPlusModal(options){
    const formUrl = (options && options.formUrl) || "https://docs.google.com/forms/d/e/1FAIpQLSd7aZ8okTdi2sr08p8l8HZ2r6oH09BsF3L_mJQtSc8q0nFRdw/viewform?usp=header";
    const cardSelector = (options && options.cardSelector) || ".gameCard.locked";
    const codeSheetUrl = (options && options.codeSheetUrl) || global.DEUTSCHBUDDY_CODE_SHEET_URL || "https://docs.google.com/spreadsheets/d/1uvv-lBznfYWJoIOMEwAfxaj7jVPzrYKtC-9T2PjJV-g/export?format=tsv&gid=0";

    const { modal, closeModalBtn, okBtn, plusText, waitlistBtn, modalActions } = resolveElements(options);
    if (!modal || !closeModalBtn || !okBtn || !plusText || !waitlistBtn) return;

    let currentModuleName = "This game";

    applyUnlockState(cardSelector);

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

        const result = await validateCodeWithSheet({ codeSheetUrl, codeInput: code, moduleName: currentModuleName });
        if (!result.ok) {
          alert(result.message);
          return;
        }

        const codes = getValidCodes();
        const normalizedCode = code.trim();
        if (!codes.includes(normalizedCode)) {
          codes.push(normalizedCode);
          setValidCodes(codes);
        }

        unlockAllPlus();
        applyUnlockState(cardSelector);

        alert("Code accepted. All Plus features are now unlocked on this browser.");
        closeModal();
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
    hasAllAccess
  };
})(window);
