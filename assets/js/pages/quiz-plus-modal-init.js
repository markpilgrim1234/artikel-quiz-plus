(function initQuizPlusModal(){
  if (!window.DeutschBuddyPlusModal) return;
  window.DeutschBuddyPlusModal.initPlusModal({
    formUrl: "https://docs.google.com/forms/d/e/1FAIpQLSd7aZ8okTdi2sr08p8l8HZ2r6oH09BsF3L_mJQtSc8q0nFRdw/viewform?usp=header",
    cardSelector: ".gameCard.locked",
    codeSheetUrl: "https://docs.google.com/spreadsheets/d/1uvv-lBznfYWJoIOMEwAfxaj7jVPzrYKtC-9T2PjJV-g/export?format=tsv&gid=0"
  });
})();
