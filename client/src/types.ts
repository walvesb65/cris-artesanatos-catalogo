export type StockStatus = "available" | "made_to_order" | "sold_out";

export interface SiteSettings {
  id: number;
  brandName: string;
  tagline: string;
  heroTitle: string;
  heroSubtitle: string;
  aboutTitle: string;
  aboutText: string;
  aboutImageUrl: string | null;
  whatsapp: string;
  instagram: string | null;
  facebook: string | null;
  tiktok: string | null;
  contactEmail: string | null;
  address: string | null;
  businessHours: string | null;
  footerNote: string | null;
  logoUrl: string | null;
  heroImageUrl: string | null;
  primaryColor: string;
  accentColor: string;
  backgroundColor: string;
  updatedAt: string;
}

export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  category: string;
  imageUrl: string | null;
  imageUrls: string[];
  stockStatus: StockStatus;
  isFeatured: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Offer {
  id: number;
  title: string;
  description: string;
  discountLabel: string;
  imageUrl: string | null;
  startsAt: string | null;
  endsAt: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CatalogData {
  settings: SiteSettings;
  products: Product[];
  offers: Offer[];
}
