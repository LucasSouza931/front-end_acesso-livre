/* map.js
   Responsabilidade: mapa, pins, modal, abas, formulários, interações.
   Usa window.api.* para dados.
*/

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const MODAL_IDS = {
  infoModal: "infoModal",
  addCommentModal: "addCommentModal",
};

document.addEventListener("DOMContentLoaded", () => {
  const imgUrl = "/assets/img/map/mapa_ifba.svg";
  const img = new Image();

  // Garantir modal fechado
  const initialModal = document.getElementById(MODAL_IDS.infoModal);
  if (initialModal) initialModal.style.display = "none";

  // Estado de modal
  let inModal = false;
  let modalPushed = false;

  // Mapeamento de nomes de locais para imagens
  const imageMap = {
    estacionamento: "/assets/img/map/estacionamento.svg",
    "bloco 5": "/assets/img/map/Bloco-5.svg",
    "bloco 6": "/assets/img/map/Bloco-6.svg",
    "bloco 8": "/assets/img/map/Bloco-8.svg",
    "bloco 9": "/assets/img/map/Bloco-9.svg",
    "bloco 16": "/assets/img/map/Bloco-16.svg",
    "quadra de areia": "/assets/img/map/Quadra de areia.svg",
    quadra: "/assets/img/map/Quadra.svg",
    campo: "/assets/img/map/Quadra.svg", // campo compartilha a mesma imagem da quadra
    biblioteca: "/assets/img/map/Biblioteca.svg",
    cantina: "/assets/img/map/Cantina.svg",
    auditório: "/assets/img/map/Auditório.svg",
    cores: "/assets/img/map/Cores.svg",
    entrada: "/assets/img/map/entrada.svg",
  };

  // Função para encontrar a imagem com matching flexível
  function getImagePath(label) {
    const lowerLabel = label.toLowerCase().trim();

    // Busca exata primeiro
    if (imageMap[lowerLabel]) {
      return imageMap[lowerLabel];
    }

    // Busca parcial para blocos (ex: "Bloco 5" pode estar como "bloco 5" ou com caracteres extras)
    if (lowerLabel.includes("bloco")) {
      if (lowerLabel.includes("5")) return imageMap["bloco 5"];
      if (lowerLabel.includes("6")) return imageMap["bloco 6"];
      if (lowerLabel.includes("8")) return imageMap["bloco 8"];
      if (lowerLabel.includes("9")) return imageMap["bloco 9"];
      if (lowerLabel.includes("16")) return imageMap["bloco 16"];
    }

    // Busca para outros tipos
    if (lowerLabel.includes("quadra de areia") || lowerLabel.includes("areia"))
      return imageMap["quadra de areia"];
    if (lowerLabel.includes("quadra")) return imageMap["quadra"];
    if (lowerLabel.includes("campo")) return imageMap["campo"];
    if (lowerLabel.includes("estacionamento"))
      return imageMap["estacionamento"];
    if (lowerLabel.includes("biblioteca")) return imageMap["biblioteca"];
    if (lowerLabel.includes("cantina")) return imageMap["cantina"];
    if (lowerLabel.includes("audit")) return imageMap["auditório"];
    if (lowerLabel.includes("cores")) return imageMap["cores"];
    if (lowerLabel.includes("entrada")) return imageMap["entrada"];

    return null;
  }

  // Função para criar ícone de pin
  function makePinIcon(color = "#FF0000", tipo = "default", label = "") {
    console.log("Making icon for tipo:", tipo, "name:", label);

    const imagePath = getImagePath(label);
    let iconHtml;

    if (imagePath) {
      // SVG apenas círculo com imagem no centro
      iconHtml = `
        <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
          <defs>
            <clipPath id="circle-clip">
              <circle cx="20" cy="20" r="18"/>
            </clipPath>
          </defs>
          <!-- Circle background -->
          <circle cx="20" cy="20" r="19" fill="${color}"/>
          <!-- White border circle -->
          <circle cx="20" cy="20" r="18" fill="#fff"/>
          <!-- Image inside clipped circle -->
          <image href="${imagePath}" x="2" y="2" width="36" height="36" clip-path="url(#circle-clip)" preserveAspectRatio="xMidYMid slice"/>
        </svg>
      `;
    } else {
      // Fallback apenas com círculo SVG
      iconHtml = `
        <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
          <circle cx="20" cy="20" r="19" fill="${color}"/>
          <circle cx="20" cy="20" r="18" fill="#fff"/>
        </svg>
      `;
    }

    return L.divIcon({
      className: `pin-marker pin-${tipo}`,
      html: `
      <div class="pin-label">${label}</div>
      <div>${iconHtml}</div>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 20],
    });
  }

  // ===== FUNÇÃO HELPER: Resolver IDs de imagem para URLs =====
  // Se o backend retornar imagens com IDs, esta função converte para URLs
  function resolveImageUrl(image) {
    // Se for string (URL já resolvida)
    if (typeof image === 'string') {
      return image;
    }
    // Se for objeto com url (compatibilidade com formato atual)
    if (image && typeof image === 'object' && image.url) {
      return image.url;
    }
    // Se for objeto com id (novo formato)
    if (image && typeof image === 'object' && image.id) {
      return `${API_BASE_URL}/images/${image.id}`;
    }
    return null;
  }

  // ===== FUNÇÃO HELPER: Renderizar carrossel de imagens =====
  // Centraliza a lógica de exibição de imagens para reutilização
  function renderImagesCarousel(swiperWrapper, images) {
    if (!images || images.length === 0) {
      // Fallback: sem imagens
      swiperWrapper.innerHTML = `
        <div class="swiper-slide" style="background-color: #ffffff; height: 100%;">
          <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; width: 100%; color: #9ca3af;">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom: 12px; opacity: 0.5;">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <circle cx="8.5" cy="8.5" r="1.5"></circle>
              <polyline points="21 15 16 10 5 21"></polyline>
            </svg>
            <p style="font-size: 14px; font-weight: 500;">Sem imagens disponíveis</p>
          </div>
        </div>`;
      return;
    }

    // Renderizar slides
    swiperWrapper.innerHTML = '';
    images.forEach((image) => {
      const imageUrl = resolveImageUrl(image);
      if (imageUrl) {
        const slide = document.createElement('div');
        slide.className = 'swiper-slide';
        slide.innerHTML = `
          <div class="project-img">
            <img src="${imageUrl}" alt="Imagem do comentário" style="width: 100%; height: 100%; object-fit: cover;">
          </div>`;
        swiperWrapper.appendChild(slide);
      }
    });

    // Reinitializar Swiper
    if (window.swiperInstance) {
      window.swiperInstance.destroy();
    }
    window.swiperInstance = new Swiper('.swiper', {
      loop: images.length > 1,
      navigation: {
        nextEl: '.swiper-button-next',
        prevEl: '.swiper-button-prev',
      },
      pagination: {
        el: '.swiper-pagination',
      },
    });
  }

  // Abre modal com dados (somente apresentação)
  async function openLocationModal(locationData) {
    try {
      // Definir o ID do local atual para uso no formulário de comentário
      window.currentLocationId = locationData.id;

      // Usar os dados já carregados de locationData (evita requisição duplicada)
      const details = locationData;

      // ELEMENTOS DO MODAL
      const modal = document.getElementById("infoModal");
      if (modal) modal.style.display = "block"; // Exibir modal imediatamente

      const titleEl = document.querySelector("#location-title");
      const descEl = document.querySelector("#location-description");
      const starsEl = document.querySelector(".stars");
      const swiperWrapper = document.querySelector(".swiper-wrapper");
      const infoList = document.querySelector("#info-content ul");
      const commentsList = document.querySelector(
        "#review-content .comments-list"
      );

      // =========================
      // 1. TÍTULO E DESCRIÇÃO
      // =========================
      titleEl.textContent = details.name || "Sem nome";
      // Atualiza descrição somente se o elemento estiver presente (aba removida em alguns layouts)
      if (descEl) {
        descEl.textContent = details.description || "";
      }

      // =========================
      // 4. ITENS DE ACESSIBILIDADE (será atualizado após carregar comentários)
      // =========================
      infoList.innerHTML = `
        <li style="display: flex; justify-content: center; padding: 20px;">
          <span class="loader" style="width: 24px; height: 24px; border-width: 3px;"></span>
        </li>
      `;

      // =========================
      // 5. COMENTÁRIOS E AVALIAÇÃO E IMAGENS (Unificado)
      // =========================
      commentsList.innerHTML = `
        <div class="loader-container" style="padding: 20px;">
          <span class="loader" style="width: 30px; height: 30px; border-width: 3px;"></span>
        </div>`;

      swiperWrapper.innerHTML = `
        <div class="swiper-slide" style="height: 100%; background: #f3f4f6;">
          <div class="loader-container">
            <span class="loader"></span>
          </div>
        </div>`;

      try {
        // Busca comentários uma única vez
        const commentsResponse = await fetch(
          `${API_BASE_URL}/comments/${locationData.id}/comments`
        );
        const commentsData = await commentsResponse.json();
        const comments = commentsData.comments || [];

        // A. Renderizar Lista de Comentários
        commentsList.innerHTML = "";
        if (comments.length === 0) {
          commentsList.innerHTML =
            "<p>Este local ainda não possui comentários.</p>";
        } else {
          comments.forEach((c) => {
            // Gerar estrelas para cada comentário
            let commentStars = "";
            for (let i = 1; i <= 5; i++) {
              if (i <= c.rating) {
                commentStars += '<span class="star-icon filled"></span>';
              } else {
                commentStars += '<span class="star-icon empty"></span>';
              }
            }

            commentsList.innerHTML += `
                  <div class="comment-card">
                      <div class="comment-header">
                          <span class="user-name">${c.user_name}</span>
                          <span class="comment-date">${new Date(
              c.created_at || c.date // Fallback para c.date se created_at não existir
            ).toLocaleDateString("pt-BR")}</span>
                      </div>
                      <div class="comment-rating">${commentStars}</div>
                      <p class="comment-text">${c.comment}</p>
                  </div>
                  `;
          });
        }

        // B. Calcular Avaliação Média
        let totalRating = 0;
        let count = 0;
        comments.forEach((c) => {
          if (c.rating && c.rating > 0) {
            totalRating += c.rating;
            count++;
          }
        });
        let avgRating = count > 0 ? totalRating / count : 0;
        let rating = Math.floor(avgRating);

        // Renderizar estrelas da média
        let starsHTML = "";
        for (let i = 1; i <= 5; i++) {
          if (i <= rating) {
            starsHTML += '<span class="star-icon filled"></span>';
          } else {
            starsHTML += '<span class="star-icon empty"></span>';
          }
        }
        starsEl.innerHTML = starsHTML;

        // C. Popuar Carrossel de Imagens
        let allImages = [];
        comments.forEach((c) => {
          if (c.images && Array.isArray(c.images)) {
            allImages = allImages.concat(c.images);
          }
        });

        renderImagesCarousel(swiperWrapper, allImages);

        // D. Coletar e exibir ícones dos comentários (sem duplicatas)
        // Buscar todos os ícones disponíveis da API
        let availableIcons = [];
        try {
          const iconsResponse = await fetch(`${API_BASE_URL}/comments/icons/`);
          if (iconsResponse.ok) {
            const iconsData = await iconsResponse.json();
            console.log("DEBUG - Resposta da API /comments/icons/:", iconsData);
            availableIcons = iconsData.icons || iconsData.comment_icons || iconsData || [];
            console.log("DEBUG - Ícones disponíveis:", availableIcons);
            if (availableIcons.length > 0) {
              console.log("DEBUG - Estrutura de um ícone:", availableIcons[0]);
            }
          }
        } catch (iconError) {
          console.warn("Erro ao buscar ícones:", iconError);
        }

        // Criar mapa de ID -> ícone para lookup rápido
        const iconMap = new Map();
        if (Array.isArray(availableIcons)) {
          availableIcons.forEach(icon => {
            iconMap.set(icon.id, icon);
          });
        }

        // Coletar IDs únicos dos ícones de todos os comentários
        const uniqueIconIds = new Set();
        comments.forEach((c) => {
          // Suporte para comment_icon_ids (array de IDs) ou comment_icons (array de objetos)
          if (c.comment_icon_ids && Array.isArray(c.comment_icon_ids)) {
            c.comment_icon_ids.forEach(id => uniqueIconIds.add(id));
          }
          if (c.comment_icons && Array.isArray(c.comment_icons)) {
            c.comment_icons.forEach(icon => {
              if (icon.id) uniqueIconIds.add(icon.id);
            });
          }
        });

        // Mapear IDs para ícones completos
        const allCommentIcons = [];
        uniqueIconIds.forEach(iconId => {
          const icon = iconMap.get(iconId);
          if (icon) {
            allCommentIcons.push(icon);
          }
        });

        // Atualizar seção de Informações de Acessibilidade com os ícones
        if (allCommentIcons.length > 0) {
          // Placeholder SVG em base64 para quando a imagem não carregar
          const placeholderSvg = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%239ca3af'%3E%3Cpath d='M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z'/%3E%3C/svg%3E";

          infoList.innerHTML = `
            <div class="accessibility-icons-grid">
              ${allCommentIcons.map(icon => `
                <div class="accessibility-icon-item">
                  <img 
                    src="${icon.icon_url || icon.image_url || icon.image || placeholderSvg}" 
                    alt="${icon.name}" 
                    title="${icon.name}"
                    class="accessibility-icon-img"
                    onerror="this.onerror=null; this.src='${placeholderSvg}'; this.classList.add('icon-placeholder');"
                  />
                  <span class="accessibility-icon-name">${icon.name}</span>
                </div>
              `).join('')}
            </div>
          `;
        } else {
          infoList.innerHTML = "<li>Nenhum item de acessibilidade informado</li>";
        }
      } catch (error) {
        console.error("Erro ao carregar dados do local:", error);
        commentsList.innerHTML = "<p>Erro ao carregar comentários.</p>";
      }

      // =========================
      // 6. ABRIR O MODAL (Já aberto no início)
      // =========================
      // document.getElementById("infoModal").style.display = "block";
    } catch (error) {
      console.error("Erro ao abrir modal:", error);
    }
  }

  // =====================================
  // FUNÇÃO PARA DETECTAR O TIPO PELO NAME
  // =====================================
  function detectTypeFromName(name) {
    const n = name.toLowerCase();

    if (n.includes("estacionamento")) return "estacionamento";
    if (n.includes("bloco")) return "bloco";
    if (n.includes("quadra de areia")) return "quadra_areia";
    if (n.includes("quadra")) return "quadra";
    if (n.includes("campo")) return "campo";
    if (n.includes("cantina")) return "cantina";
    if (n.includes("biblioteca")) return "biblioteca";
    if (n.includes("audit")) return "auditorio";
    if (n.includes("cores")) return "cores";
    if (n.includes("entrada")) return "entrada";

    return "default";
  }

  // Render de pins (chama window.api.getAllLocations)
  async function renderPinsOnMap(map, W, H) {
    // Busca locations via API
    const pins = await window.api.getAllLocations();
    // Salva no global para outras partes que precisarem (não sobrescrever)
    window.pins = pins || [];

    console.log("PINS RECEBIDOS:", pins);

    pins.forEach((p) => {
      const tipo = detectTypeFromName(p.name);

      const top = parseFloat(p.top) || 0;
      const left = parseFloat(p.left) || 0;
      const x = (left / 100) * W;
      const y = (top / 100) * H;

      const corMap = {
        estacionamento: "#FF0000",
        bloco: "#00FF00",
        campo: "#0000FF",
        quadra: "#FFFF00",
        quadra_areia: "#FFA500",
        biblioteca: "#800080",
        cantina: "#00FFFF",
        auditorio: "#FFC0CB",
        cores: "#808080",
        entrada: "#000000",
        default: "#000000",
      };

      const color = corMap[tipo] || corMap.default;

      const marker = L.marker([y, x], {
        icon: makePinIcon(color, tipo, p.name),
      }).addTo(map);

      marker.on("click", async () => {
        // Usar os dados do pin diretamente (p), pois já contêm a descrição retornada pelo getAllLocations
        openLocationModal(p);
      });
    });

    // Ocultar loader após carregar pins
    const loader = document.getElementById("map-loader");
    if (loader) {
      loader.style.display = "none";
    }
  }

  let mapLoaded = false;
  img.onload = async () => {
    if (mapLoaded) return;
    mapLoaded = true;
    const W = img.naturalWidth;
    const H = img.naturalHeight;
    const bounds = [
      [0, 0],
      [H, W],
    ];

    const map = L.map("map", {
      crs: L.CRS.Simple,
      minZoom: 0,
      maxZoom: 4,
      zoomSnap: 0.25,
      attributionControl: false,
      maxBounds: bounds,
      maxBoundsViscosity: 1.0,
    });
    L.imageOverlay(imgUrl, bounds).addTo(map);
    map.fitBounds(bounds);

    const viewport = map.getSize();
    const zoomH = Math.log2(viewport.y / H);
    const zoomW = Math.log2(viewport.x / W);
    const fillZoom = Math.max(zoomH, zoomW);
    map.setZoom(fillZoom);
    map.setMinZoom(fillZoom);

    // Renderiza os pins usando a API (apenas aqui)
    await renderPinsOnMap(map, W, H);

    map.addControl(new BotaoCustom({ position: "bottomright" }));

    // --- AQUI: lógica de clique para mostrar e fechar modal ---
    const btnModal = document.getElementById("btnModal");
    const btnMap = document.querySelector(".btn-map-custom");

    // Ao clicar no botão do mapa
    L.DomEvent.on(btnMap, "click", function (e) {
      this.style.display = "none"; // desaparece o botão
      btnModal.style.display = "block"; // mostra o modal
    });

    // Fecha o modal ao clicar em qualquer lugar do mapa
    map.on("click", () => {
      if (btnModal.style.display === "block") {
        btnModal.style.display = "none"; // esconde o modal
        btnMap.style.display = "block"; // reaparece o botão
      }
    });

    // resize handling
    let resizeTimer = null;
    window.addEventListener("resize", () => {
      const center = map.getCenter();
      const zoom = map.getZoom();
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        map.invalidateSize(false);
        map.setView(center, zoom, { animate: false });
      }, 100);
    });
  };

  const pinTypes = {
    estacionamento: "pin-estacionamento",
    bloco: "pin-bloco",
    campo: "pin-campo",
    quadra: "pin-quadra",
    quadra_areia: "pin-quadra-areia",
    biblioteca: "pin-biblioteca",
    cantina: "pin-cantina",
    auditorio: "pin-auditorio",
    cores: "pin-cores",
    entrada: "pin-entrada",
    default: "pin-default",
  };

  img.onerror = () => {
    console.error("Erro ao carregar a imagem do mapa:", imgUrl);
    alert("Erro ao carregar a imagem do mapa. Verifique o caminho.");
  };

  // Iniciar carregamento da imagem após definir os handlers
  img.src = imgUrl;

  // --- UI: tabs, swiper, carousel init (mantidos) ---
  function initCustomCarousel() {
    /* ... seu código atual (sem mudanças) ... */
  }
  function initSwiperIfAvailable() {
    /* ... seu código atual (sem mudanças) ... */
  }
  initSwiperIfAvailable() || initCustomCarousel();

  // Tabs behaviour (mantido como você já tinha)
  (function initTabs() {
    const tabs = document.querySelectorAll(".tab-btn");
    const tabContents = document.querySelectorAll(".tab-pane");
    const tabWrapper = document.querySelector(".tab-content");
    if (tabWrapper) {
      tabWrapper.style.position = tabWrapper.style.position || "relative";
      tabWrapper.style.overflow = tabWrapper.style.overflow || "hidden";
    }
    tabContents.forEach((content, index) => {
      if (index === 0) {
        content.classList.add("active");
        content.classList.remove("enter-right", "exit-left");
      } else {
        content.classList.remove("active");
        content.classList.add("enter-right");
      }
    });
    tabs.forEach((tab) => {
      tab.addEventListener("click", function () {
        tabs.forEach((t) => t.classList.remove("active"));
        tab.classList.add("active");
        const current = document.querySelector(".tab-pane.active");
        const target = document.querySelector(
          `#${tab.id.replace("tab", "content")}`
        );
        if (!target || current === target) return;
        if (current) {
          current.classList.remove("active");
          current.classList.add("exit-left");
          const onEnd = (e) => {
            if (e.propertyName && e.propertyName.indexOf("transform") === -1)
              return;
            current.classList.remove("exit-left");
            current.removeEventListener("transitionend", onEnd);
          };
          current.addEventListener("transitionend", onEnd);
        }
        target.classList.remove("exit-left");
        target.classList.add("enter-right");
        // force repaint
        // eslint-disable-next-line no-unused-expressions
        target.offsetWidth;
        target.classList.add("active");
        target.classList.remove("enter-right");
        // REMOVIDO: loadCommentsForLocation aqui, pois já carregamos ao abrir o modal
      });
    });
  })();

  // Função para carregar comentários aprovados para um local (usa API)
  async function loadCommentsForLocation(locationId) {
    const commentsList = document.querySelector(".comments-list");
    if (!commentsList) return;
    commentsList.innerHTML = "<p>Carregando comentários...</p>";
    try {
      const comments = await window.api.getApprovedCommentsForLocation(
        locationId
      );
      if (comments.length === 0) {
        commentsList.innerHTML = "<p>Nenhum comentário ainda.</p>";
      } else {
        commentsList.innerHTML = comments
          .map(
            (comment) => `
          <div class="comment-card">
            <div class="comment-header">
              <span class="user-name">${comment.user_name}</span>
              <span class="comment-date">${new Date(
              comment.date
            ).toLocaleDateString("pt-BR")}</span>
            </div>
            <div class="comment-rating">${"⭐".repeat(
              comment.rating || 0
            )}</div>
            <p class="comment-text">${comment.comment}</p>
          </div>
        `
          )
          .join("");
      }
    } catch (error) {
      console.error("Erro ao carregar comentários:", error);
      commentsList.innerHTML = "<p>Erro ao carregar comentários.</p>";
    }
  }

  // Helper: mostra um modal simples (estilo alert) com mensagem e botão OK
  function showMessageModal(message, isError = false) {
    // Remover se já existir
    const existing = document.getElementById("message-modal");
    if (existing) existing.remove();

    const overlay = document.createElement("div");
    overlay.id = "message-modal";
    overlay.style.position = "fixed";
    overlay.style.left = 0;
    overlay.style.top = 0;
    overlay.style.width = "100%";
    overlay.style.height = "100%";
    overlay.style.display = "flex";
    overlay.style.alignItems = "center";
    overlay.style.justifyContent = "center";
    overlay.style.backgroundColor = "rgba(0,0,0,0.45)";
    overlay.style.zIndex = 9999;

    const card = document.createElement("div");
    card.style.background = "#fff";
    card.style.padding = "28px";
    card.style.borderRadius = "12px";
    card.style.boxShadow = "0 10px 30px rgba(0,0,0,0.18)";
    // Tornar o card quadrado e um pouco maior
    card.style.width = "min(300px, 92%)";
    card.style.height = "min(300px, 92%)";
    card.style.display = "flex";
    card.style.flexDirection = "column";
    card.style.alignItems = "center";
    card.style.justifyContent = "center";
    card.style.textAlign = "center";

    const msg = document.createElement("p");
    msg.textContent = message;
    msg.style.margin = "0 0 22px 0";
    msg.style.fontSize = "20px";
    msg.style.lineHeight = "1.3";
    msg.style.color = isError ? "#b91c1c" : "#064e3b";
    msg.style.fontWeight = "700";

    const btn = document.createElement("button");
    btn.textContent = "OK";
    btn.style.padding = "12px 22px";
    btn.style.border = "none";
    btn.style.borderRadius = "10px";
    btn.style.cursor = "pointer";
    btn.style.background = isError ? "#ef4444" : "#10b981";
    btn.style.color = "#fff";
    btn.style.fontSize = "16px";
    btn.style.fontWeight = "700";

    btn.addEventListener("click", () => {
      overlay.remove();
    });

    card.appendChild(msg);
    card.appendChild(btn);
    overlay.appendChild(card);
    document.body.appendChild(overlay);
  }

  // Array para armazenar pins de acessibilidade adicionados nesta sessão
  let sessionAddedPins = [];

  // Controla o botão "Adicionar comentário"
  (function initCommentFlow() {
    const commentBtn = document.querySelector(".comment-btn");
    function setCommentButton(enabled) {
      if (!commentBtn) return;
      if (enabled) {
        commentBtn.classList.remove("hidden");
        commentBtn.classList.remove("disabled");
        commentBtn.disabled = false;
      } else {
        commentBtn.classList.add("hidden");
        commentBtn.classList.add("disabled");
        commentBtn.disabled = true;
      }
    }
    setCommentButton(
      document.querySelector("#review-content")?.classList.contains("active")
    );
    const tabs = document.querySelectorAll(".tab-btn");
    tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        setTimeout(() => {
          const isReviewActive = document
            .querySelector("#review-content")
            ?.classList.contains("active");
          setCommentButton(!!isReviewActive);
        }, 0);
      });
    });

    // abrir modal de adicionar comentário
    if (commentBtn) {
      commentBtn.addEventListener("click", () => {
        const infoModal = document.getElementById(MODAL_IDS.infoModal);
        const addModal = document.getElementById(MODAL_IDS.addCommentModal);
        if (infoModal) infoModal.style.display = "none";
        if (addModal) addModal.style.display = "flex";
      });
    }

    // fechar add-comment modal
    const addCommentBackBtn = document.querySelector(
      `#${MODAL_IDS.addCommentModal} .back-btn`
    );
    if (addCommentBackBtn) {
      addCommentBackBtn.addEventListener("click", () => {
        const infoModal = document.getElementById(MODAL_IDS.infoModal);
        const addModal = document.getElementById(MODAL_IDS.addCommentModal);
        if (addModal) addModal.style.display = "none";
        if (infoModal) {
          infoModal.style.display = "flex";
          setTimeout(() => {
            infoModal.scrollIntoView({ behavior: "smooth", block: "center" });
          }, 0);
        }
      });
    }

    // Função para mostrar seleção de ícones de acessibilidade
    function showAccessibilityIconSelection() {
      // Remover modal existente se houver
      const existingModal = document.getElementById("accessibility-icon-modal");
      if (existingModal) existingModal.remove();

      const overlay = document.createElement("div");
      overlay.id = "accessibility-icon-modal";
      overlay.style.position = "fixed";
      overlay.style.left = 0;
      overlay.style.top = 0;
      overlay.style.width = "100%";
      overlay.style.height = "100%";
      overlay.style.display = "flex";
      overlay.style.alignItems = "center";
      overlay.style.justifyContent = "center";
      overlay.style.backgroundColor = "rgba(0,0,0,0.5)";
      overlay.style.zIndex = 10000;

      const modalContent = document.createElement("div");
      modalContent.style.background = "#fff";
      modalContent.style.padding = "20px";
      modalContent.style.borderRadius = "10px";
      modalContent.style.maxWidth = "500px";
      modalContent.style.width = "90%";
      modalContent.style.maxHeight = "80vh";
      modalContent.style.overflowY = "auto";

      const title = document.createElement("h3");
      title.textContent = "Selecione o tipo de acessibilidade";
      title.style.marginBottom = "20px";
      title.style.textAlign = "center";

      const iconsContainer = document.createElement("div");
      iconsContainer.style.display = "grid";
      iconsContainer.style.gridTemplateColumns = "repeat(3, 1fr)";
      iconsContainer.style.gap = "15px";

      // Lista de ícones disponíveis (sem generic)
      const accessibilityIcons = [
        { name: "Ramp", icon: "ramp.svg", type: "ramp" },
        { name: "Elevator", icon: "elevator.svg", type: "elevator" },
        { name: "Wide Entrance", icon: "wide-entrance.svg", type: "wide-entrance" },
        { name: "Parking Special", icon: "parking-special.svg", type: "parking-special" },
        { name: "Tactile Floor", icon: "tactile-floor.svg", type: "tactile-floor" },
        { name: "Drinking Fountain", icon: "drinking-fountain.svg", type: "drinking-fountain" },
        { name: "Fire Extinguisher", icon: "fire-extinguisher.svg", type: "fire-extinguisher" },
        { name: "Libras", icon: "libras.svg", type: "libras" },
      ];

      accessibilityIcons.forEach((item) => {
        const iconDiv = document.createElement("div");
        iconDiv.style.display = "flex";
        iconDiv.style.flexDirection = "column";
        iconDiv.style.alignItems = "center";
        iconDiv.style.padding = "15px";
        iconDiv.style.border = "2px solid #ddd";
        iconDiv.style.borderRadius = "8px";
        iconDiv.style.cursor = "pointer";
        iconDiv.style.transition = "all 0.2s";

        const img = document.createElement("img");
        img.src = `/assets/icons/${item.icon}`;
        img.alt = item.name;
        img.style.width = "50px";
        img.style.height = "50px";
        img.style.marginBottom = "10px";

        const label = document.createElement("span");
        label.textContent = item.name;
        label.style.fontSize = "12px";
        label.style.textAlign = "center";
        label.style.fontWeight = "500";

        iconDiv.appendChild(img);
        iconDiv.appendChild(label);

        iconDiv.addEventListener("mouseenter", () => {
          iconDiv.style.borderColor = "#007bff";
          iconDiv.style.backgroundColor = "#f0f8ff";
          iconDiv.style.transform = "scale(1.05)";
        });

        iconDiv.addEventListener("mouseleave", () => {
          iconDiv.style.borderColor = "#ddd";
          iconDiv.style.backgroundColor = "";
          iconDiv.style.transform = "";
        });

        iconDiv.addEventListener("click", () => {
          showMessageModal(`Ícone "${item.name}" selecionado!`);
          overlay.remove();
        });

        iconsContainer.appendChild(iconDiv);
      });

      const closeBtn = document.createElement("button");
      closeBtn.textContent = "Cancelar";
      closeBtn.style.marginTop = "20px";
      closeBtn.style.padding = "10px 20px";
      closeBtn.style.backgroundColor = "#ccc";
      closeBtn.style.border = "none";
      closeBtn.style.borderRadius = "5px";
      closeBtn.style.cursor = "pointer";
      closeBtn.style.width = "100%";
      closeBtn.addEventListener("click", () => overlay.remove());

      modalContent.appendChild(title);
      modalContent.appendChild(iconsContainer);
      modalContent.appendChild(closeBtn);
      overlay.appendChild(modalContent);
      document.body.appendChild(overlay);
    }

    // Event listener para o botão de adicionar pin de acessibilidade
    const btnAddAccessibilityPin = document.getElementById(
      "btn-add-accessibility-pin"
    );
    if (btnAddAccessibilityPin) {
      btnAddAccessibilityPin.addEventListener(
        "click",
        showAccessibilityIconSelection
      );
    }

    // estrela rating
    const stars = document.querySelectorAll(".star");
    const ratingInput = document.getElementById("rating");
    stars.forEach((star) => {
      star.addEventListener("click", () => {
        const value = star.getAttribute("data-value");
        ratingInput.value = value;
        stars.forEach((s) => {
          if (s.getAttribute("data-value") <= value) {
            s.classList.add("active");
            s.textContent = "★";
          } else {
            s.classList.remove("active");
            s.textContent = "☆";
          }
        });
      });
    });

    let selectedImages = [];

    // Função para validar formatos de imagem permitidos
    function isAllowedImageFile(file) {
      const allowedExtensions = ['png', 'jpg', 'jpeg', 'webp', 'heic', 'heif'];
      const fileName = file.name.toLowerCase();
      const fileExtension = fileName.split('.').pop();
      return allowedExtensions.includes(fileExtension);
    }

    const imgInput = document.getElementById("comment-image");
    const fileList = document.getElementById("file-list");
    const btnAddImage = document.getElementById("btn-add-image");

    if (btnAddImage) {
      btnAddImage.addEventListener("click", () => {
        if (imgInput) imgInput.click();
      });
    }

    if (imgInput) {
      imgInput.addEventListener("change", () => {
        for (const file of imgInput.files) {
          if (file.size > 10485760) { // 10MB limit
            showMessageModal("Imagem muito grande. O tamanho máximo é 10MB.", true);
            continue;
          }
          if (!isAllowedImageFile(file)) {
            const fileExtension = file.name.split('.').pop().toUpperCase();
            showMessageModal(`Arquivo rejeitado: "${file.name}"\n\nFormato ".${fileExtension}" não é permitido.\n\nUse apenas: PNG, JPG, JPEG, WEBP, HEIC ou HEIF.`, true);
            continue;
          }
          selectedImages.push(file);
        }

        imgInput.value = "";
        renderFileList();
      });
    }

    function renderFileList() {
      fileList.innerHTML = "";

      selectedImages.forEach((file, index) => {
        const li = document.createElement("li");
        li.innerHTML = `
      <span>${file.name}</span>
      <button data-index="${index}"
              style="
                background:red;
                color:white;
                border:none;
                padding:2px 6px;
                border-radius:4px;
                cursor:pointer;
              ">X</button>
    `;

        fileList.appendChild(li);
      });

      document.querySelectorAll("#file-list button").forEach((btn) => {
        btn.addEventListener("click", () => {
          const i = btn.getAttribute("data-index");
          selectedImages.splice(i, 1);
          renderFileList();
        });
      });
    }

    // submit form de comentário
    const commentForm = document.getElementById("comment-form");
    if (commentForm) {
      commentForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const name = document.getElementById("user-name").value;
        const rating = ratingInput.value;
        const commentText = document.getElementById("comment-text").value;
        const imgInput = document.getElementById("imgInput");

        if (!rating || rating === "") {
          alert("Por favor, selecione uma avaliação com estrelas.");
          return;
        }
        const commentData = {
          user_name: name,
          rating: parseInt(rating),
          comment: commentText,
          created_at: new Date().toISOString(),
          location_id: window.currentLocationId,
          status: "pending",
          images: selectedImages, // Passar o array de arquivos selecionados
        };

        // NÃO sobrescrever window.pins — apenas chamar a API para enviar comentário
        const result = await window.api.postComment(commentData);
        if (result) {
          showMessageModal("Comentário enviado para aprovação!");
        } else {
          showMessageModal("Erro ao enviar comentário. Tente novamente.", true);
          return;
        }

        // reset visual do form
        commentForm.reset();
        stars.forEach((s) => {
          s.classList.remove("active");
          s.textContent = "☆";
        });
        ratingInput.value = "";

        // fecha addCommentModal e reabre infoModal
        const addModal = document.getElementById(MODAL_IDS.addCommentModal);
        const infoModal = document.getElementById(MODAL_IDS.infoModal);
        if (addModal) addModal.style.display = "none";
        if (infoModal) infoModal.style.display = "flex";

        // aciona a aba de reviews para o usuário ver (loadCommentsForLocation será chamado quando a aba ficar ativa)
        const reviewTab = document.getElementById("review-tab");
        if (reviewTab) reviewTab.click();
      });
    }
  })();

  // Back button navbar behavior
  const navBack = document.querySelector(".btn.voltar");
  if (navBack) {
    navBack.addEventListener("click", function (e) {
      const modal = document.getElementById(MODAL_IDS.infoModal);
      const addModal = document.getElementById(MODAL_IDS.addCommentModal);
      if (addModal && addModal.style.display === "flex") {
        e.preventDefault();
        addModal.style.display = "none";
        if (modal) modal.style.display = "flex";
      } else if (modal && modal.style.display === "flex") {
        e.preventDefault();
        modal.style.display = "none";
        inModal = false;
        if (modalPushed) {
          try {
            history.back();
          } catch (err) {
            /* ignore */
          }
          modalPushed = false;
        }
      }
    });
  }

  // popstate handler
  window.addEventListener("popstate", function () {
    if (inModal) {
      const modal = document.getElementById(MODAL_IDS.infoModal);
      if (modal) modal.style.display = "none";
      inModal = false;
      modalPushed = false;
    }
  });
});
