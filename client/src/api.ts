import type { CatalogData, Offer, Product, SiteSettings } from "./types";

const API_BASE = import.meta.env.VITE_API_BASE ?? "";

async function request<T>(path: string, options: RequestInit = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {})
    }
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.message ?? "Erro ao comunicar com a API.");
  }

  if (response.status === 204) return null as T;
  return response.json() as Promise<T>;
}

export function getCatalog() {
  return request<CatalogData>("/api/catalog");
}

export function login(email: string, password: string) {
  return request<{ token: string; admin: { name: string; email: string } }>("/api/admin/login", {
    method: "POST",
    body: JSON.stringify({ email, password })
  });
}

export function getAdminCatalog(token: string) {
  return request<CatalogData>("/api/admin/catalog", {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export function saveSettings(token: string, settings: Partial<SiteSettings>) {
  return request<SiteSettings>("/api/admin/settings", {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(settings)
  });
}

export function saveProduct(token: string, product: Partial<Product>) {
  const method = product.id ? "PUT" : "POST";
  const path = product.id ? `/api/admin/products/${product.id}` : "/api/admin/products";
  return request<Product>(path, {
    method,
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(product)
  });
}

export function deleteProduct(token: string, id: number) {
  return request<null>(`/api/admin/products/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` }
  });
}

export function saveOffer(token: string, offer: Partial<Offer>) {
  const method = offer.id ? "PUT" : "POST";
  const path = offer.id ? `/api/admin/offers/${offer.id}` : "/api/admin/offers";
  return request<Offer>(path, {
    method,
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(offer)
  });
}

export function deleteOffer(token: string, id: number) {
  return request<null>(`/api/admin/offers/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` }
  });
}
