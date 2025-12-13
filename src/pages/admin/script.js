// src/admin/script.js - Entry point para página admin
import "./api.js";
// Importa o handler global de erros (mostra modal amigável em caso de falhas)
import "../../utils/error-handler.js";

// ==========================
// PROTEÇÃO DE ROTA
// ==========================
document.addEventListener("DOMContentLoaded", () => {
  const token = sessionStorage.getItem("authToken");

  if (!token) {
    console.warn("Sem token → redirecionando ao login");
    window.location.href = "/pages/auth/";
    return;
  }

  loadPendingComments();
  setupTabNavigation();
});

// ==========================
// BOTÃO DE LOGOUT
// ==========================
document.getElementById("logout-btn").addEventListener("click", () => {
  sessionStorage.removeItem("authToken");
  window.location.href = "/pages/auth/";
});

// ==========================
// NAVEGAÇÃO POR ABAS
// ==========================
function setupTabNavigation() {
  const tabs = document.querySelectorAll(".tab-btn");

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const tabName = tab.dataset.tab;

      // Remover classe active de todos os botões e conteúdos
      tabs.forEach((t) => t.classList.remove("active"));
      document.querySelectorAll(".tab-content").forEach((content) => {
        content.classList.remove("active");
      });

      // Adicionar classe active ao botão clicado e seu conteúdo
      tab.classList.add("active");
      document.getElementById(`${tabName}-content`).classList.add("active");

      // Carregar dados específicos
      if (tabName === "locations") {
        loadLocationsList();
      } else if (tabName === "comments") {
        loadPendingComments();
      }
    });
  });
}

// ==========================
// BUSCAR COMENTÁRIOS PENDENTES
// ==========================
async function loadPendingComments() {
  const container = document.getElementById("reviews-list");
  container.innerHTML =
    '<div class="loading-container"><div class="loading-spinner"></div></div>';

  const result = await window.adminApi.getPendingComments();
  console.log("API retornou:", result);

  // Extrair array de comentários (pode estar em result.comments ou ser um array direto)
  const list = Array.isArray(result) ? result : result?.comments || [];
  console.log("Lista de comentários:", list);

  if (list.length === 0) {
    container.innerHTML = "<p>Nenhum comentário pendente ✨</p>";
    return;
  }

  container.innerHTML = "";

  list.forEach((comment) => {
    const card = document.createElement("div");
    card.className = "comment-card-admin";

    const images = comment.images || "";
    const hasImages = images.length > 0;

    card.innerHTML = `
      <div class="top-info">
        <strong>${comment.user_name ?? "Usuário"}</strong> — ${comment.rating ?? ""
      } ⭐
      </div>

      <p class="comment-text">${comment.comment}</p>

      <div class="actions">
        <button class="btn-approve" onclick="approve(${comment.id
      })">Aprovar</button>
        <button class="btn-reject" onclick="reject(${comment.id
      })">Rejeitar</button>
        ${hasImages
        ? `<button class="btn-photos" onclick="viewPhotos(decodeURIComponent('${encodeURIComponent(
          JSON.stringify(images)
        )}'))">Fotos</button>`
        : ""
      }
      </div>
    `;

    container.appendChild(card);
  });
}

// ==========================
// APROVAR / REJEITAR
// ==========================
window.approve = async function (id) {
  showConfirmation({
    title: "Aprovar Comentário",
    message: "Deseja aprovar e publicar este comentário?",
    onConfirm: async () => {
      await window.adminApi.approveComment(id);
      loadPendingComments();
    }
  });
};

window.reject = async function (id) {
  showConfirmation({
    title: "Rejeitar Comentário",
    message: "Tem certeza que deseja rejeitar este comentário?",
    confirmText: "Rejeitar",
    isDestructive: true,
    onConfirm: async () => {
      await window.adminApi.rejectComment(id);
      loadPendingComments();
    }
  });
};

// ==========================
// FUNÇÃO HELPER: Resolver IDs de imagem para URLs
// ==========================
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
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
    return `${API_BASE_URL}/images/${image.id}`;
  }
  return null;
}

// ==========================
// MODAL DE FOTOS COM SWIPER
// ==========================
window.viewPhotos = function (imagesData) {
  const modal = document.getElementById("photoModal");
  const swiperWrapper = document.getElementById("swiperWrapper");

  let images = imagesData;
  if (typeof imagesData === "string") {
    try {
      images = JSON.parse(imagesData);
    } catch (e) {
      images = imagesData;
    }
  }

  // Mostrar modal com spinner
  swiperWrapper.innerHTML =
    '<div class="loading-container"><div class="loading-spinner"></div></div>';
  modal.style.display = "flex";

  // Processar imagens
  let imageArray = [];

  if (Array.isArray(images)) {
    images.forEach((img) => {
      const url = resolveImageUrl(img);
      if (url) imageArray.push(url);
    });
  } else if (typeof images === "string" && images.trim()) {
    imageArray = images.split(",").map((img) => img.trim());
  }

  // Renderizar imagens sem delay desnecessário
  swiperWrapper.innerHTML = "";

  if (imageArray.length === 0) {
    // Fallback: sem imagens
    swiperWrapper.innerHTML = `
      <div class="swiper-slide" style="background-color: #ffffff; height: 100%; display: flex; align-items: center; justify-content: center;">
        <div style="display: flex; flex-direction: column; align-items: center; text-align: center; color: #9ca3af;">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom: 12px; opacity: 0.5;">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <circle cx="8.5" cy="8.5" r="1.5"></circle>
            <polyline points="21 15 16 10 5 21"></polyline>
          </svg>
          <p style="font-size: 14px; font-weight: 500;">Sem imagens</p>
        </div>
      </div>`;
  } else {
    // Adicionar slides
    imageArray.forEach((url) => {
      const slide = document.createElement("div");
      slide.className = "swiper-slide";
      slide.innerHTML = `<img src="${url}" alt="" style="width: 100%; height: 100%; object-fit: cover;">`;
      swiperWrapper.appendChild(slide);
    });
  }

  // Destruir instância anterior (se existir) para evitar bug
  if (window.swiperInstance) {
    window.swiperInstance.destroy(true, true);
  }

  // Criar Swiper (apenas para o modal de fotos)
  window.swiperInstance = new Swiper("#photoModal .swiper", {
    loop: imageArray.length > 1,
    pagination: {
      el: "#photoModal .swiper-pagination",
      clickable: true,
    },
    navigation: {
      nextEl: "#photoModal .swiper-button-next",
      prevEl: "#photoModal .swiper-button-prev",
    },
  });
};

// Fechar modal
document.getElementById("closeModal").addEventListener("click", () => {
  document.getElementById("photoModal").style.display = "none";

  if (window.swiperInstance) {
    window.swiperInstance.destroy(true, true);
    window.swiperInstance = null;
  }
});

// ==========================
// GERENCIAR LOCAIS
// ==========================

// 1. Carregar lista de locais
async function loadLocationsList() {
  const container = document.getElementById("locations-container");

  // Mostrar spinner
  container.innerHTML =
    '<div class="loading-container"><div class="loading-spinner"></div></div>';

  try {
    const response = await window.adminApi.getLocations();

    // Extrair array de locais (pode estar em response.locations ou ser um array direto)
    const locations = Array.isArray(response)
      ? response
      : response?.locations || [];
    console.log("Locais carregados:", locations);

    // Se não houver locais
    if (!locations || locations.length === 0) {
      container.innerHTML = `
                <p style="text-align: center; color: #999;">Nenhum local registrado</p>
                <button class="btn-create" onclick="openLocationForm()">+ Criar Novo Local</button>
            `;
      return;
    }

    // Renderizar lista de locais como cards clicáveis
    // Ordenar por nome em ordem alfabética
    locations.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'pt-BR'));

    let html =
      '<button class="btn-create" onclick="openLocationForm()">+ Criar Novo Local</button>';
    html += '<div class="locations-grid">';

    locations.forEach((location) => {
      // Processar imagens - suporta arrays de strings ou objetos
      let images = [];
      if (Array.isArray(location.images)) {
        images = location.images
          .map((img) => {
            if (typeof img === 'string') return img.trim();
            if (img && typeof img === 'object' && img.url) return img.url;
            return null;
          })
          .filter((img) => img);
      } else if (
        typeof location.images === "string" &&
        location.images.trim()
      ) {
        images = location.images
          .split(",")
          .map((img) => img.trim())
          .filter((img) => img);
      }

      const firstImage = images.length > 0 ? images[0] : "";
      const imageHtml = firstImage
        ? `<img src="${firstImage}" alt="${location.name}" class="location-grid-img">`
        : '<div class="location-grid-no-img">📍</div>';

      html += `
                <div class="location-grid-card" onclick="viewLocationDetails(${location.id
        })">
                    <div class="location-grid-image">
                        ${imageHtml}
                    </div>
                    <div class="location-grid-info">
                        <h3>${location.name}</h3>
                        <p>${location.description || "Sem descrição"}</p>
                    </div>
                </div>
            `;
    });

    html += "</div>";
    container.innerHTML = html;
  } catch (error) {
    console.error("Erro ao carregar locais:", error);
    container.innerHTML =
      '<p style="color: red;">Erro ao carregar locais. Tente novamente.</p>';
  }
}

// 1.5 Visualizar detalhes do local em modal
async function viewLocationDetails(locationId) {
  try {
    const location = await window.adminApi.getLocation(locationId);

    // Processar imagens - suporta arrays de strings ou objetos
    let images = [];
    if (Array.isArray(location.images)) {
      images = location.images
        .map((img) => {
          if (typeof img === 'string') return img.trim();
          if (img && typeof img === 'object' && img.url) return img.url;
          return null;
        })
        .filter((img) => img);
    } else if (typeof location.images === "string" && location.images.trim()) {
      images = location.images
        .split(",")
        .map((img) => img.trim())
        .filter((img) => img);
    }

    // Renderizar modal com carrossel
    let swiperSlides = "";
    if (images.length > 0) {
      swiperSlides = images
        .map(
          (img) => `
                <div class="swiper-slide">
                    <div class="project-img">
                        <img src="${img}" alt="Imagem de ${location.name}">
                    </div>
                </div>
            `
        )
        .join("");
    } else {
      swiperSlides = `
                <div class="swiper-slide" style="background-color: #f3f4f6; display: flex; align-items: center; justify-content: center;">
                    <div style="text-align: center; color: #999;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                            <circle cx="8.5" cy="8.5" r="1.5"></circle>
                            <polyline points="21 15 16 10 5 21"></polyline>
                        </svg>
                        <p>Sem imagens</p>
                    </div>
                </div>
            `;
    }

    // Renderizar itens de acessibilidade
    let accessibilityHtml = "";
    if (
      location.accessibility_items &&
      location.accessibility_items.length > 0
    ) {
      accessibilityHtml = location.accessibility_items
        .map(
          (item) => `
                <li>
                    ${item.image
              ? `<img src="${item.image}" alt="${item.name}" style="width: 20px; height: 20px; margin-right: 8px;">`
              : ""
            }
                    ${item.name}
                </li>
            `
        )
        .join("");
    } else {
      accessibilityHtml = "<li>Nenhum item de acessibilidade informado</li>";
    }

    const modalHtml = `
            <div class="modal-view-location">
                <button class="close-detail-modal" onclick="backToLocationsList()">← Voltar</button>
                
                <div class="swiper detail-swiper">
                    <div class="swiper-wrapper">
                        ${swiperSlides}
                    </div>
                    <div class="swiper-button-next"></div>
                    <div class="swiper-button-prev"></div>
                    <div class="swiper-pagination"></div>
                </div>
                
                <section class="detail-info-section">
                    <div class="detail-header">
                        <h1>${location.name}</h1>
                    </div>
                    
                    <div class="detail-tabs">
                        <button class="detail-tab-btn active" data-tab="info">Informações</button>
                        <button class="detail-tab-btn" data-tab="description">Descrição</button>
                        <button class="detail-tab-btn" data-tab="position">Posição</button>
                    </div>
                    
                    <div class="detail-tab-content">
                        <div class="detail-tab-pane active" id="info-pane">
                            <h3>Acessibilidade</h3>
                            <ul class="accessibility-list">
                                ${accessibilityHtml}
                            </ul>
                        </div>
                        
                        <div class="detail-tab-pane" id="description-pane">
                            <h3>Descrição</h3>
                            <p>${location.description || "Sem descrição fornecida"
      }</p>
                        </div>
                        
                        <div class="detail-tab-pane" id="position-pane">
                            <h3>Posição no Mapa</h3>
                            <p><strong>Top:</strong> ${location.top || "-"}</p>
                            <p><strong>Left:</strong> ${location.left || "-"
      }</p>
                        </div>
                    </div>
                    
                    <div class="detail-actions">
                        <button class="btn-edit" onclick="openLocationForm(${location.id})">Editar</button>
                        <button class="btn-delete" onclick="confirmDeleteLocation(${location.id})">Excluir</button>
                    </div>
                </section>
            </div>
        `;

    document.getElementById("locations-container").innerHTML = modalHtml;

    // Configurar abas
    document.querySelectorAll(".detail-tab-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        document
          .querySelectorAll(".detail-tab-btn")
          .forEach((b) => b.classList.remove("active"));
        document
          .querySelectorAll(".detail-tab-pane")
          .forEach((p) => p.classList.remove("active"));

        e.target.classList.add("active");
        document
          .getElementById(`${e.target.dataset.tab}-pane`)
          .classList.add("active");
      });
    });

    // Inicializar Swiper
    setTimeout(() => {
      if (window.swiperInstance) {
        window.swiperInstance.destroy(true, true);
      }
      window.swiperInstance = new Swiper(".detail-swiper", {
        loop: images.length > 1,
        navigation: {
          nextEl: ".swiper-button-next",
          prevEl: ".swiper-button-prev",
        },
        pagination: {
          el: ".swiper-pagination",
          clickable: true,
        },
      });
    }, 100);
  } catch (error) {
    console.error("Erro ao carregar detalhes do local:", error);
  }
}

// Voltar para lista
function backToLocationsList() {
  loadLocationsList();
}

// 2. Abrir formulário de criação/edição
async function openLocationForm(locationId = null) {
  const container = document.getElementById("locations-container");
  // Carregar dados necessários (agora buscando ícones de comentários)
  let accessibilityItems = [];
  let location = null;
  let selectedAccessibilityItemIds = [];

  try {
    // Tentar buscar ícones de comentários primeiro (nova rota)
    let iconsResponse = null;
    try {
      iconsResponse = await window.adminApi.getCommentIcons();
      window.lastApiResponse = iconsResponse;
      console.log("Resposta getCommentIcons:", iconsResponse);
    } catch (e) {
      window.lastApiResponse = { error: e.toString() };
      console.warn("Falha ao buscar ícones de comentário:", e);
    }

    // Processar resposta
    if (Array.isArray(iconsResponse) && iconsResponse.length > 0) {
      accessibilityItems = iconsResponse;
    } else if (iconsResponse && Array.isArray(iconsResponse.comment_icons) && iconsResponse.comment_icons.length > 0) {
      accessibilityItems = iconsResponse.comment_icons;
    } else if (iconsResponse && Array.isArray(iconsResponse.icons) && iconsResponse.icons.length > 0) {
      accessibilityItems = iconsResponse.icons;
    } else if (iconsResponse && Array.isArray(iconsResponse.data) && iconsResponse.data.length > 0) {
      accessibilityItems = iconsResponse.data;
    } else {
      // Fallback: Se não encontrou ícones, tentar a rota antiga de itens de acessibilidade
      console.log("Fallback para getAccessibilityItems...");
      const legacyResponse = await window.adminApi.getAccessibilityItems();
      accessibilityItems = Array.isArray(legacyResponse) ? legacyResponse : (legacyResponse?.accessibility_items || []);
    }

    // Log final para debug
    console.log("Itens finais para renderizar:", accessibilityItems);

    // Se estiver editando, buscar dados do local
    if (locationId) {
      container.innerHTML =
        '<div class="loading-container"><div class="loading-spinner"></div></div>';

      // Buscar local e comentários em paralelo
      const [loc, commentsResponse] = await Promise.all([
        window.adminApi.getLocation(locationId),
        window.adminApi.getCommentsByLocation(locationId)
      ]);
      location = loc;

      // Extrair array de comentários (API retorna { comments: [...] })
      const comments = commentsResponse?.comments || commentsResponse || [];

      console.log("Comentários do local:", comments);

      // Extrair IDs de ícones dos comentários
      const commentsIconsIds = new Set();

      if (Array.isArray(comments)) {
        comments.forEach(comment => {
          // 1. Verificar comment_icon_ids (IDs diretos)
          if (comment.comment_icon_ids && Array.isArray(comment.comment_icon_ids)) {
            comment.comment_icon_ids.forEach(id => commentsIconsIds.add(id));
          }

          // 2. Verificar comment_icons (Objetos ou Array misto)
          let icons = comment.comment_icons;
          if (typeof icons === 'string') {
            // Se for string "1,2,3"
            icons.split(',').forEach(id => commentsIconsIds.add(parseInt(id.trim())));
          } else if (Array.isArray(icons)) {
            icons.forEach(icon => {
              if (typeof icon === 'object') {
                if (icon.id) commentsIconsIds.add(icon.id);
                if (icon.icon_url) commentsIconsIds.add(icon.icon_url);
                if (icon.url) commentsIconsIds.add(icon.url);
              } else {
                commentsIconsIds.add(icon);
              }
            });
          }
        });
      }

      selectedAccessibilityItemIds = Array.from(commentsIconsIds);
      console.log("IDs de ícones extraídos dos comentários:", selectedAccessibilityItemIds);

      // Update Debug Info
      const debugEl = document.getElementById('api-debug-info');
      if (debugEl) {
        const debugData = {
          extractedIds: selectedAccessibilityItemIds,
          availableItems: accessibilityItems.map(i => ({ id: i.id, name: i.name })),
          commentsSample: comments.length > 0 ? {
            id: comments[0].id,
            icons: comments[0].comment_icons,
            iconIds: comments[0].comment_icon_ids
          } : 'No comments'
        };
        debugEl.textContent = "Debug Selection: " + JSON.stringify(debugData, null, 2);
        debugEl.style.display = 'block';
      }

      // Fallback: Se não achou nos comentários, verificar no próprio local (retrocompatibilidade)
      if (selectedAccessibilityItemIds.length === 0 && location && location.accessibility_items) {
        if (location.accessibility_items.length > 0 && typeof location.accessibility_items[0] === 'object') {
          selectedAccessibilityItemIds = location.accessibility_items.map(item => item.id);
        } else {
          selectedAccessibilityItemIds = location.accessibility_items;
        }
      }
    }
  } catch (error) {
    console.error("Erro ao carregar dados:", error);
    alert("Erro ao carregar dados do formulário");
    return;
  }

  // Renderizar formulário
  const html = `
        <h3>${location ? "Editar Local" : "Criar Novo Local"}</h3>
        
        <form class="location-form" id="locationForm">
            <div class="form-group">
                <label for="locName">Nome *</label>
                <input type="text" id="locName" name="name" required value="${location?.name || ""
    }" />
            </div>

            <div class="form-group">
                <label for="locDescription">Descrição</label>
                <textarea id="locDescription" name="description">${location?.description || ""
    }</textarea>
            </div>

            <div class="position-inputs-grid">
                <div class="form-group">
                    <label for="locTop">Posição Y (top)</label>
                    <input type="number" id="locTop" name="top" value="${location?.top || ""
    }" />
                </div>

                <div class="form-group">
                    <label for="locLeft">Posição X (left)</label>
                    <input type="number" id="locLeft" name="left" value="${location?.left || ""}" />
                </div>
            </div>

            <div class="form-group">
                <label>Imagens do Local</label>
                <div id="location-images-carousel" class="location-images-carousel">
                    ${(() => {
      // Processar imagens existentes
      let existingImages = [];
      if (location && Array.isArray(location.images)) {
        existingImages = location.images.map((img) => {
          if (typeof img === 'string') return { url: img, id: null };
          if (img && typeof img === 'object') return { url: img.url, id: img.id };
          return null;
        }).filter(img => img && img.url);
      }

      if (existingImages.length === 0) {
        return '<p class="no-images-msg">Nenhuma imagem cadastrada</p>';
      }

      return `
                        <div id="edit-location-carousel" class="swiper edit-location-carousel">
                          <div class="swiper-wrapper">
                            ${existingImages.map((img, index) => `
                              <div class="swiper-slide">
                                <div class="carousel-image-item" data-image-id="${img.id || ''}" data-image-url="${img.url}">
                                  <img src="${img.url}" alt="Imagem ${index + 1}">
                                  <button type="button" class="btn-delete-image" onclick="deleteLocationImage('${img.id}', this)" ${!img.id ? 'disabled title="Imagem sem ID"' : ''}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                      <polyline points="3 6 5 6 21 6"></polyline>
                                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                    </svg>
                                    Excluir
                                  </button>
                                </div>
                              </div>
                            `).join('')}
                          </div>
                          <div class="swiper-button-next"></div>
                          <div class="swiper-button-prev"></div>
                          <div class="swiper-pagination"></div>
                        </div>
                      `;
    })()}
                </div>
            </div>

            <div class="form-group">
                <label>Itens de Acessibilidade</label>
                
                <div class="accessibility-items-grid">
                    ${accessibilityItems
      .map(
        (item, index) => {
          let itemId, itemName, itemImage;

          if (typeof item === 'object' && item !== null) {
            // Objeto normal
            itemId = item.id;
            itemName = item.name || item.title || 'Item ' + item.id;
            // Adicionado suporte para icon_url
            itemImage = item.image || item.icon || item.icon_url || item.image_url || null;
          } else if (typeof item === 'string') {
            // String (provavelmente URL) - Fallback
            itemId = item; // Usar a própria string como ID
            itemName = 'Item ' + (index + 1);
            itemImage = item;
          } else {
            return ''; // Ignorar item inválido
          }

          // Verificação mais robusta (usa 'some' e '==' para lidar com string vs number)
          const isChecked = selectedAccessibilityItemIds.some(selected =>
            (selected == itemId) || (selected === itemImage)
          );

          // Escapar ID para uso em atributo HTML
          const safeId = String(itemId).replace(/[^a-zA-Z0-9-_]/g, '_');

          return `
            <label class="accessibility-icon-item ${isChecked ? 'selected' : ''}" for="acc-${safeId}">
              <input type="checkbox" id="acc-${safeId}" value="${itemId}" ${isChecked ? "checked" : ""} 
                onchange="this.parentElement.classList.toggle('selected', this.checked)">
              
              ${itemImage
              ? `<img src="${itemImage}" alt="${itemName}" class="accessibility-icon-img">`
              : `<div class="accessibility-icon-img icon-placeholder"></div>`
            }
              
              <span class="accessibility-icon-name">${itemName}</span>
            </label>
          `;
        }
      )
      .join("")}
                    ${accessibilityItems.length === 0
      ? '<p style="color: #999; margin: 0; text-align: center;">Nenhum item disponível</p>'
      : ""
    }
                </div>
            </div>

            <div class="form-actions">
                <button type="submit" class="btn-submit">${location ? "Salvar Alterações" : "Criar Local"}</button>
                <button type="button" class="btn-cancel" onclick="loadLocationsList()">Cancelar</button>
            </div>
        </form>
    `;

  container.innerHTML = html;

  // Inicializar Swiper do carrossel de imagens (se existir)
  const carouselEl = document.getElementById('edit-location-carousel');
  if (carouselEl) {
    // Destruir instância anterior se existir
    if (window.editLocationCarousel) {
      window.editLocationCarousel.destroy(true, true);
    }
    window.editLocationCarousel = new Swiper('#edit-location-carousel', {
      slidesPerView: 1,
      spaceBetween: 15,
      loop: false,
      autoplay: false,
      grabCursor: true,
      navigation: {
        nextEl: '#edit-location-carousel .swiper-button-next',
        prevEl: '#edit-location-carousel .swiper-button-prev',
      },
      pagination: {
        el: '#edit-location-carousel .swiper-pagination',
        clickable: true,
      },
    });
  }

  // Listener do formulário
  document
    .getElementById("locationForm")
    .addEventListener("submit", async (e) => {
      e.preventDefault();

      // Funcao de salvar para ser chamada apos confirmacao
      const saveAction = async () => {
        // Coletar dados do formulário
        const formData = new FormData(e.target);
        const data = {
          name: formData.get("name"),
          description: formData.get("description") || "",
          top: formData.get("top") ? parseInt(formData.get("top")) : null,
          left: formData.get("left") ? parseInt(formData.get("left")) : null,
        };

        // Nota: Imagens são gerenciadas via carrossel (exclusão individual)

        // Coletar IDs de acessibilidade selecionados
        const selectedCheckboxes = document.querySelectorAll(
          '.accessibility-items-grid input[type="checkbox"]:checked'
        );
        data.accessibility_items = Array.from(selectedCheckboxes).map((cb) =>
          parseInt(cb.value)
        );

        try {
          if (location) {
            // Atualizar local existente
            await window.adminApi.updateLocation(location.id, data);
            alert("Local atualizado com sucesso!");
          } else {
            // Criar novo local
            await window.adminApi.createLocation(data);
            alert("Local criado com sucesso!");
          }
          loadLocationsList();
        } catch (error) {
          console.error("Erro ao salvar local:", error);
          alert("Erro ao salvar local. Tente novamente.");
        }
      };

      showConfirmation({
        title: location ? "Salvar Alterações" : "Criar Local",
        message: "Confirma os dados inseridos para este local?",
        confirmText: location ? "Salvar" : "Criar",
        onConfirm: saveAction
      });
    });
}

// 3. Confirmar e deletar local
// 3. Confirmar e deletar local
async function confirmDeleteLocation(id) {
  showConfirmation({
    title: "Excluir Local",
    message: "Tem certeza que deseja excluir este local? Esta ação não pode ser desfeita.",
    confirmText: "Excluir",
    isDestructive: true,
    onConfirm: async () => {
      try {
        await window.adminApi.deleteLocation(id);
        alert("Local excluído com sucesso!");
        loadLocationsList();
      } catch (error) {
        console.error("Erro ao excluir local:", error);
        alert("Erro ao excluir local. Tente novamente.");
      }
    }
  });
}

// 4. Deletar imagem de local
async function deleteLocationImage(imageId, buttonElement) {
  if (!imageId || imageId === 'null' || imageId === 'undefined') {
    alert("Esta imagem não possui um ID válido para exclusão.");
    return;
  }

  showConfirmation({
    title: "Excluir Imagem",
    message: "Deseja realmente remover esta imagem do local?",
    confirmText: "Excluir",
    isDestructive: true,
    onConfirm: async () => {
      // Desabilitar botão durante operação
      if (buttonElement) {
        buttonElement.disabled = true;
        buttonElement.innerHTML = '<span class="loading-spinner-small"></span> Excluindo...';
      }

      try {
        const success = await window.adminApi.deleteLocationImage(imageId);

        if (success) {
          // Remover slide do carrossel
          const slide = buttonElement?.closest('.swiper-slide');
          if (slide) {
            slide.remove();

            // Atualizar Swiper
            if (window.editLocationCarousel) {
              window.editLocationCarousel.update();
            }

            // Se não houver mais imagens, mostrar mensagem
            const remainingSlides = document.querySelectorAll('#edit-location-carousel .swiper-slide');
            if (remainingSlides.length === 0) {
              const carousel = document.getElementById('location-images-carousel');
              if (carousel) {
                carousel.innerHTML = '<p class="no-images-msg">Nenhuma imagem cadastrada</p>';
              }
            }
          }

          alert("Imagem excluída com sucesso!");
        } else {
          throw new Error("Falha ao excluir imagem");
        }
      } catch (error) {
        console.error("Erro ao excluir imagem:", error);
        alert("Erro ao excluir imagem. Tente novamente.");

        // Restaurar botão
        if (buttonElement) {
          buttonElement.disabled = false;
          buttonElement.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              <line x1="10" y1="11" x2="10" y2="17"></line>
              <line x1="14" y1="11" x2="14" y2="17"></line>
            </svg>
            Excluir
          `;
        }
      }
    }
  });
}

// ==========================
// FUNÇÃO HELPER: SHOW CONFIRMATION
// ==========================
function showConfirmation({ title, message, confirmText = "Confirmar", cancelText = "Cancelar", isDestructive = false, onConfirm }) {
  const modal = document.getElementById('confirmationModal');
  const titleEl = document.getElementById('confirmTitle');
  const messageEl = document.getElementById('confirmMessage');
  const confirmBtn = document.getElementById('btnConfirmAction');
  const cancelBtn = document.getElementById('btnCancelConfirm');

  if (!modal || !confirmBtn || !cancelBtn) {
    console.error("Modal elements not found!");
    // Fallback if modal is missing for some reason
    if (confirm(message)) {
      onConfirm();
    }
    return;
  }

  // Set content
  titleEl.textContent = title;
  messageEl.textContent = message;
  confirmBtn.textContent = confirmText;
  cancelBtn.textContent = cancelText;

  // Set style
  if (isDestructive) {
    confirmBtn.classList.add('destructive');
  } else {
    confirmBtn.classList.remove('destructive');
  }

  // Show modal
  modal.style.display = 'flex';

  // Event Handlers
  const close = () => {
    modal.style.display = 'none';
    cleanup();
  };

  const handleConfirm = () => {
    onConfirm();
    close();
  };

  const handleOutsideClick = (e) => {
    if (e.target === modal) {
      close();
    }
  };

  // Bind events
  confirmBtn.onclick = handleConfirm;
  cancelBtn.onclick = close;
  window.addEventListener('click', handleOutsideClick);

  // Cleanup to avoid multiple listeners
  function cleanup() {
    confirmBtn.onclick = null;
    cancelBtn.onclick = null;
    window.removeEventListener('click', handleOutsideClick);
  }
}

// Expor funções globalmente para chamadas inline
window.openLocationForm = openLocationForm;
window.confirmDeleteLocation = confirmDeleteLocation;
window.loadLocationsList = loadLocationsList;
window.viewLocationDetails = viewLocationDetails;
window.backToLocationsList = backToLocationsList;
window.deleteLocationImage = deleteLocationImage;
