// src/admin/api.js
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const adminApi = {
    // Buscar comentários pendentes
    async getPendingComments() {
        try {
            const response = await fetch(`${API_BASE_URL}/comments/pending?skip=0&limit=10`, {
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": "Bearer " + sessionStorage.getItem("authToken")
                },
            });
            if (!response.ok) throw new Error("Erro ao carregar comentários pendentes");
            return await response.json();
        } catch (err) {
            console.error(err);
            return [];
        }
    },

    // Aprovar comentário
    async approveComment(commentId) {
        try {
            const response = await fetch(`${API_BASE_URL}/comments/${commentId}/status`, {
                method: "PATCH",
                body: JSON.stringify({ status: "approved" }),
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": "Bearer " + sessionStorage.getItem("authToken")
                }
            });

            console.log("Resposta approveComment:", response);
            return await response.json();
        } catch (err) {
            console.error(err);
        }
    },

    // Rejeitar comentário
    async rejectComment(commentId) {
        try {
            const response = await fetch(`${API_BASE_URL}/comments/${commentId}/status`, {
                method: "PATCH",
                body: JSON.stringify({ status: "rejected" }),
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": "Bearer " + sessionStorage.getItem("authToken")
                },
            });

            return await response.json();
        } catch (err) {
            console.error(err);
        }
    },

    // ==============================
    // CRUD LOCAIS
    // ==============================

    // Buscar todos os locais
    async getLocations() {
        try {
            const response = await fetch(`${API_BASE_URL}/locations/`, {
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": "Bearer " + sessionStorage.getItem("authToken")
                }
            });
            return await response.json();
        } catch (err) {
            console.error("Erro ao buscar locais:", err);
            return [];
        }
    },

    // Buscar um local específico
    async getLocation(id) {
        try {
            const response = await fetch(`${API_BASE_URL}/locations/${id}`, {
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": "Bearer " + sessionStorage.getItem("authToken")
                }
            });
            return await response.json();
        } catch (err) {
            console.error("Erro ao buscar local:", err);
            return null;
        }
    },

    // Criar novo local
    async createLocation(data) {
        try {
            const response = await fetch(`${API_BASE_URL}/locations/`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": "Bearer " + sessionStorage.getItem("authToken")
                },
                body: JSON.stringify(data)
            });
            return await response.json();
        } catch (err) {
            console.error("Erro ao criar local:", err);
            return null;
        }
    },

    // Atualizar local existente
    async updateLocation(id, data) {
        try {
            const response = await fetch(`${API_BASE_URL}/locations/${id}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": "Bearer " + sessionStorage.getItem("authToken")
                },
                body: JSON.stringify(data)
            });
            return await response.json();
        } catch (err) {
            console.error("Erro ao atualizar local:", err);
            return null;
        }
    },

    // Deletar local
    async deleteLocation(id) {
        try {
            const response = await fetch(`${API_BASE_URL}/locations/${id}`, {
                method: "DELETE",
                headers: {
                    "Authorization": "Bearer " + sessionStorage.getItem("authToken")
                }
            });
            return await response.json();
        } catch (err) {
            console.error("Erro ao deletar local:", err);
            return null;
        }
    },

    // Buscar itens de acessibilidade
    async getAccessibilityItems() {
        try {
            const response = await fetch(`${API_BASE_URL}/locations/accessibility-items/`, {
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": "Bearer " + sessionStorage.getItem("authToken")
                }
            });
            return await response.json();
        } catch (err) {
            console.error("Erro ao buscar itens de acessibilidade:", err);
            return [];
        }
    },

    // Criar novo item de acessibilidade
    async createAccessibilityItem(data) {
        try {
            const response = await fetch(`${API_BASE_URL}/locations/accessibility-items/`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": "Bearer " + sessionStorage.getItem("authToken")
                },
                body: JSON.stringify(data)
            });
            return await response.json();
        } catch (err) {
            console.error("Erro ao criar item de acessibilidade:", err);
            return null;
        }
    },
};

// Export global para compatibilidade
window.adminApi = adminApi;
