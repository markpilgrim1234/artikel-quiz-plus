(function initPlusModalComponent(global){
  function resolveElements(options){
    const root = options && options.root ? options.root : document;
    return {
      modal: root.getElementById("plusModal"),
      closeModalBtn: root.getElementById("closeModal"),
      okBtn: root.getElementById("okBtn"),
      plusText: root.getElementById("plusText"),
      waitlistBtn: root.getElementById("waitlistBtn")
    };
  }

  function initPlusModal(options){
    const formUrl = (options && options.formUrl) || "https://docs.google.com/forms/d/e/1FAIpQLSd7aZ8okTdi2sr08p8l8HZ2r6oH09BsF3L_mJQtSc8q0nFRdw/viewform?usp=header";
    const cardSelector = (options && options.cardSelector) || ".gameCard.locked";

    const { modal, closeModalBtn, okBtn, plusText, waitlistBtn } = resolveElements(options);

    if (!modal || !closeModalBtn || !okBtn || !plusText || !waitlistBtn) return;

    function openModal(moduleName){
      plusText.innerHTML =
        `The <strong>${moduleName}</strong> is part of <strong>DeutschBuddy Plus</strong> and will be available soon.<br>` +
        "Want early access and updates?";
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
      card.addEventListener("click", () => openModal(name));
      card.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openModal(name);
        }
      });
    });

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
    initPlusModal
  };
})(window);
