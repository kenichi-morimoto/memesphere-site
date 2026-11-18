/*
 * 製品ページの概念モーダル。
 * WORDSPHERE で開き、左上の x と ESC だけで閉じる。
 * 開いているあいだ html に modal-open を付け、背面をスクロールさせない。
 * prefers-reduced-motion ではフェードも拡大もせず、その場で出す。
 */

(function () {
  var openButton = document.getElementById("open-concept");
  var modal = document.getElementById("concept-modal");
  var foreground = modal.querySelector(".concept-foreground");
  var closeButton = modal.querySelector(".concept-close");
  var closeTimer = 0;
  var lockedScrollY = 0;

  function reduced() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function lockScroll() {
    lockedScrollY = window.scrollY;
    document.body.style.position = "fixed";
    document.body.style.top = "-" + lockedScrollY + "px";
    document.body.style.left = "0";
    document.body.style.right = "0";
    document.body.style.width = "100%";
    document.documentElement.classList.add("modal-open");
  }

  function unlockScroll() {
    document.body.style.position = "";
    document.body.style.top = "";
    document.body.style.left = "";
    document.body.style.right = "";
    document.body.style.width = "";
    document.documentElement.classList.remove("modal-open");
    window.scrollTo(0, lockedScrollY);
  }

  function openModal() {
    if (!modal.hidden && modal.classList.contains("is-open") && !modal.classList.contains("is-closing")) {
      return;
    }
    window.clearTimeout(closeTimer);
    modal.classList.remove("is-closing");
    modal.hidden = false;
    lockScroll();
    if (reduced()) {
      modal.classList.add("is-open", "is-settled");
      closeButton.focus();
      return;
    }
    modal.classList.remove("is-open", "is-settled");
    requestAnimationFrame(function () {
      modal.classList.add("is-open", "is-settled");
      closeButton.focus();
    });
  }

  function finishClose() {
    if (modal.hidden) return;
    window.clearTimeout(closeTimer);
    modal.hidden = true;
    modal.classList.remove("is-open", "is-closing", "is-settled");
    unlockScroll();
    openButton.focus();
  }

  function closeModal() {
    if (modal.hidden || modal.classList.contains("is-closing")) return;
    if (reduced()) {
      finishClose();
      return;
    }
    modal.classList.remove("is-open");
    modal.classList.add("is-closing");
    closeTimer = window.setTimeout(finishClose, 700);
  }

  foreground.addEventListener("animationend", function (event) {
    if (event.target !== foreground) return;
    if (event.animationName === "concept-rise-out") finishClose();
  });

  openButton.addEventListener("click", openModal);
  closeButton.addEventListener("click", closeModal);
  document.addEventListener("keydown", function (event) {
    if (event.key !== "Escape" || modal.hidden) return;
    event.preventDefault();
    closeModal();
  });
})();
