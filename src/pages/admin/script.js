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
        <strong>${comment.user_name ?? "Usuário"}</strong> — ${
      comment.rating ?? ""
    } ⭐
      </div>

      <p class="comment-text">${comment.comment}</p>

      <div class="actions">
        <button class="btn-approve" onclick="approve(${
          comment.id
        })">Aprovar</button>
        <button class="btn-reject" onclick="reject(${
          comment.id
        })">Rejeitar</button>
        ${
          hasImages
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
  await window.adminApi.approveComment(id);
  loadPendingComments();
};

window.reject = async function (id) {
  await window.adminApi.rejectComment(id);
  loadPendingComments();
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

  // Criar Swiper
  window.swiperInstance = new Swiper(".swiper", {
    loop: imageArray.length > 1,
    pagination: {
      el: ".swiper-pagination",
      clickable: true,
    },
    navigation: {
      nextEl: ".swiper-button-next",
      prevEl: ".swiper-button-prev",
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
    let html =
      '<button class="btn-create" onclick="openLocationForm()">+ Criar Novo Local</button>';
    html += '<div class="locations-grid">';

    locations.forEach((location) => {
      // Processar imagens
      let images = [];
      if (Array.isArray(location.images)) {
        images = location.images.filter((img) => img && img.trim());
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
                <div class="location-grid-card" onclick="viewLocationDetails(${
                  location.id
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

    // Processar imagens
    let images = [];
    if (Array.isArray(location.images)) {
      images = location.images.filter((img) => img && img.trim());
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
                    ${
                      item.image
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
                        <button class="btn-edit-main" onclick="openLocationForm(${
                          location.id
                        })">Editar Local</button>
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
                            <p>${
                              location.description || "Sem descrição fornecida"
                            }</p>
                        </div>
                        
                        <div class="detail-tab-pane" id="position-pane">
                            <h3>Posição no Mapa</h3>
                            <p><strong>Top:</strong> ${location.top || "-"}</p>
                            <p><strong>Left:</strong> ${
                              location.left || "-"
                            }</p>
                        </div>
                    </div>
                    
                    <div class="detail-actions">
                        <button class="btn-edit" onclick="openLocationForm(${
                          location.id
                        })">Editar</button>
                        <button class="btn-delete" onclick="confirmDeleteLocation(${
                          location.id
                        })">Excluir</button>
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
  let location = null;
  let accessibilityItems = [];
  let selectedAccessibilityItems = [];

  // Se está editando, buscar dados do local
  if (locationId !== null) {
    container.innerHTML =
      '<div class="loading-container"><div class="loading-spinner"></div></div>';
    try {
      location = await window.adminApi.getLocation(locationId);
      selectedAccessibilityItems = location.accessibility_items || [];
    } catch (error) {
      console.error("Erro ao buscar local:", error);
      container.innerHTML =
        '<p style="color: red;">Erro ao carregar dados do local.</p>';
      return;
    }
  }

  // Buscar itens de acessibilidade
  try {
    const response = await window.adminApi.getAccessibilityItems();
    // Extrair array de accessibility_items (pode estar em response.accessibility_items ou ser um array direto)
    accessibilityItems = Array.isArray(response)
      ? response
      : response?.accessibility_items || [];
  } catch (error) {
    console.error("Erro ao buscar itens de acessibilidade:", error);
    accessibilityItems = [];
  }

  // Renderizar formulário
  let html = `
        <h3>${location ? "Editar Local" : "Criar Novo Local"}</h3>
        
        <form class="location-form" id="locationForm">
            <div class="form-group">
                <label for="locName">Nome *</label>
                <input type="text" id="locName" name="name" required value="${
                  location?.name || ""
                }" />
            </div>

            <div class="form-group">
                <label for="locDescription">Descrição</label>
                <textarea id="locDescription" name="description">${
                  location?.description || ""
                }</textarea>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                <div class="form-group">
                    <label for="locTop">Posição Y (top)</label>
                    <input type="number" id="locTop" name="top" value="${
                      location?.top || ""
                    }" />
                </div>

                <div class="form-group">
                    <label for="locLeft">Posição X (left)</label>
                    <input type="number" id="locLeft" name="left" value="${
                      location?.left || ""
                    }" />
                </div>
            </div>

            <div class="form-group">
                <label for="locImages">Imagens (URLs separadas por vírgula)</label>
                <textarea id="locImages" name="images">${
                  location?.images ? location.images.join(", ") : ""
                }</textarea>
            </div>

            <div class="form-group">
                <label>Itens de Acessibilidade</label>
                <div class="accessibility-items">
                    ${accessibilityItems
                      .map(
                        (item) => `
                        <div class="accessibility-item-card">
                            <input type="checkbox" id="acc-${item.id}" value="${
                          item.id
                        }" 
                                ${
                                  selectedAccessibilityItems.includes(item.id)
                                    ? "checked"
                                    : ""
                                } />
                            <div class="accessibility-item-content">
                                ${
                                  item.image
                                    ? `<img src="${item.image}" alt="${item.name}" class="accessibility-icon">`
                                    : ""
                                }
                                <label for="acc-${item.id}">${item.name}</label>
                            </div>
                        </div>
                    `
                      )
                      .join("")}
                    ${
                      accessibilityItems.length === 0
                        ? '<p style="color: #999; margin: 0;">Nenhum item disponível</p>'
                        : ""
                    }
                </div>
            </div>

            <div class="form-actions">
                <button type="submit" class="btn-submit">${
                  location ? "Salvar Alterações" : "Criar Local"
                }</button>
                <button type="button" class="btn-cancel" onclick="loadLocationsList()">Cancelar</button>
            </div>
        </form>
    `;

  container.innerHTML = html;

  // Listener do formulário
  document
    .getElementById("locationForm")
    .addEventListener("submit", async (e) => {
      e.preventDefault();

      // Coletar dados do formulário
      const formData = new FormData(e.target);
      const data = {
        name: formData.get("name"),
        description: formData.get("description") || "",
        top: formData.get("top") ? parseInt(formData.get("top")) : null,
        left: formData.get("left") ? parseInt(formData.get("left")) : null,
      };

      // Processa imagens
      const imagesStr = formData.get("images")?.trim();
      if (imagesStr) {
        data.images = imagesStr
          .split(",")
          .map((url) => url.trim())
          .filter((url) => url);
      } else {
        data.images = [];
      }

      // Coletar IDs de acessibilidade selecionados
      const selectedCheckboxes = document.querySelectorAll(
        '.accessibility-items input[type="checkbox"]:checked'
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
    });
}

// 3. Confirmar e deletar local
async function confirmDeleteLocation(id) {
  if (!confirm("Tem certeza que deseja excluir este local?")) {
    return;
  }

  try {
    await window.adminApi.deleteLocation(id);
    alert("Local excluído com sucesso!");
    loadLocationsList();
  } catch (error) {
    console.error("Erro ao excluir local:", error);
    alert("Erro ao excluir local. Tente novamente.");
  }
}

// Expor funções globalmente para chamadas inline
window.openLocationForm = openLocationForm;
window.confirmDeleteLocation = confirmDeleteLocation;
window.loadLocationsList = loadLocationsList;
window.viewLocationDetails = viewLocationDetails;
window.backToLocationsList = backToLocationsList;
