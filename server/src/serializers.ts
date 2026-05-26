import type { Offer, Product, SiteSettings } from "./types.js";

type Row = Record<string, unknown>;

const toBoolean = (value: unknown) => Boolean(Number(value));
const toIsoDate = (value: unknown) => {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
};
const toIsoDateTime = (value: unknown) => {
  if (value instanceof Date) return value.toISOString();
  return String(value);
};

export function mapProduct(row: Row, imageUrls: string[] = []): Product {
  const fallbackImageUrl = row.image_url ? String(row.image_url) : null;
  const productImageUrls = imageUrls.length > 0 ? imageUrls : fallbackImageUrl ? [fallbackImageUrl] : [];

  return {
    id: Number(row.id),
    name: String(row.name),
    description: String(row.description),
    price: Number(row.price),
    category: String(row.category),
    imageUrl: productImageUrls[0] ?? fallbackImageUrl,
    imageUrls: productImageUrls,
    stockStatus: row.stock_status as Product["stockStatus"],
    isFeatured: toBoolean(row.is_featured),
    isActive: toBoolean(row.is_active),
    createdAt: toIsoDateTime(row.created_at),
    updatedAt: toIsoDateTime(row.updated_at)
  };
}

export function mapOffer(row: Row): Offer {
  return {
    id: Number(row.id),
    title: String(row.title),
    description: String(row.description),
    discountLabel: String(row.discount_label),
    imageUrl: row.image_url ? String(row.image_url) : null,
    startsAt: toIsoDate(row.starts_at),
    endsAt: toIsoDate(row.ends_at),
    isActive: toBoolean(row.is_active),
    createdAt: toIsoDateTime(row.created_at),
    updatedAt: toIsoDateTime(row.updated_at)
  };
}

export function mapSettings(row: Row): SiteSettings {
  return {
    id: Number(row.id),
    brandName: String(row.brand_name),
    tagline: String(row.tagline),
    heroTitle: String(row.hero_title),
    heroSubtitle: String(row.hero_subtitle),
    aboutTitle: String(row.about_title ?? "Quem somos"),
    aboutText: String(row.about_text ?? ""),
    aboutImageUrl: row.about_image_url ? String(row.about_image_url) : null,
    whatsapp: String(row.whatsapp),
    instagram: row.instagram ? String(row.instagram) : null,
    facebook: row.facebook ? String(row.facebook) : null,
    tiktok: row.tiktok ? String(row.tiktok) : null,
    contactEmail: row.contact_email ? String(row.contact_email) : null,
    address: row.address ? String(row.address) : null,
    businessHours: row.business_hours ? String(row.business_hours) : null,
    footerNote: row.footer_note ? String(row.footer_note) : null,
    logoUrl: row.logo_url ? String(row.logo_url) : null,
    heroImageUrl: row.hero_image_url ? String(row.hero_image_url) : null,
    primaryColor: String(row.primary_color),
    accentColor: String(row.accent_color),
    backgroundColor: String(row.background_color),
    updatedAt: toIsoDateTime(row.updated_at)
  };
}
