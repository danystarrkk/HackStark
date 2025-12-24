/* ============================================================
   Archivo: main.js
   Descripción: Controla funciones globales de interactividad.
   - Añade botón "copiar" a todos los bloques de código
   - Diseñado para funcionar con PaperMod y custom.css
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {
  /* === COPIAR BLOQUES DE CÓDIGO === */
  const codeBlocks = document.querySelectorAll("pre");

  codeBlocks.forEach((pre) => {
    // Evita duplicar botones si Hugo vuelve a renderizar
    if (pre.querySelector(".copy-button")) return;

    // Crear botón
    const button = document.createElement("button");
    button.className = "copy-button";
    button.setAttribute("title", "Copiar código");
    button.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="#d8dee9" viewBox="0 0 24 24">
        <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v16h14c1.1 0 2-.9 2-2V5zm0 16H8V7h11v14z"/>
      </svg>
    `;

    // Insertar botón en el bloque
    pre.appendChild(button);

    // Acción de copiar
    button.addEventListener("click", () => {
      const code = pre.innerText.trim();
      navigator.clipboard.writeText(code).then(() => {
        button.classList.add("copied");
        const originalHTML = button.innerHTML;

        // Cambiar el ícono temporalmente a ✓
        button.innerHTML = `<span style="color:#a3be8c;">✓ Copiado</span>`;

        // Restaurar después de 2 segundos
        setTimeout(() => {
          button.classList.remove("copied");
          button.innerHTML = originalHTML;
        }, 2000);
      });
    });
  });
});

document.addEventListener("DOMContentLoaded", function () {
  const images = document.querySelectorAll(".post-content img");

  if (!images.length) return;

  // Crear overlay
  const overlay = document.createElement("div");
  overlay.className = "image-zoom-overlay";

  const zoomedImg = document.createElement("img");

  const closeBtn = document.createElement("div");
  closeBtn.className = "image-zoom-close";
  closeBtn.innerHTML = "&times;";

  overlay.appendChild(zoomedImg);
  overlay.appendChild(closeBtn);
  document.body.appendChild(overlay);

  // Abrir zoom
  images.forEach((img) => {
    img.style.cursor = "zoom-in";

    img.addEventListener("click", () => {
      zoomedImg.src = img.src;
      overlay.classList.add("active");
      document.body.style.overflow = "hidden";
    });
  });

  // Cerrar zoom
  function closeZoom() {
    overlay.classList.remove("active");
    zoomedImg.src = "";
    document.body.style.overflow = "";
  }

  closeBtn.addEventListener("click", closeZoom);

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) {
      closeZoom();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeZoom();
    }
  });
});
