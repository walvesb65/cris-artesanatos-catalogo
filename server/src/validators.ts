import { z } from "zod";

const urlOrEmpty = z.string().trim().url().or(z.literal("")).nullable().optional();
const nullableText = z.string().trim().nullable().optional();

export const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1)
});

export const settingsSchema = z.object({
  brandName: z.string().trim().max(120).optional(),
  tagline: z.string().trim().max(180).optional(),
  heroTitle: z.string().trim().min(2).max(180).optional(),
  heroSubtitle: z.string().trim().min(2).optional(),
  aboutTitle: z.string().trim().min(2).max(180).optional(),
  aboutText: nullableText,
  aboutImageUrl: urlOrEmpty,
  whatsapp: z.string().trim().min(8).max(30).optional(),
  instagram: nullableText,
  facebook: nullableText,
  tiktok: nullableText,
  contactEmail: z.string().trim().email().or(z.literal("")).nullable().optional(),
  address: nullableText,
  businessHours: nullableText,
  footerNote: nullableText,
  logoUrl: urlOrEmpty,
  heroImageUrl: urlOrEmpty,
  primaryColor: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  accentColor: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  backgroundColor: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/).optional()
});

export const productCreateSchema = z.object({
  name: z.string().trim().min(2).max(160),
  description: z.string().trim().min(2),
  price: z.coerce.number().min(0),
  category: z.string().trim().min(2).max(80),
  imageUrl: urlOrEmpty,
  imageUrls: z.array(z.string().trim().url()).max(12).optional(),
  stockStatus: z.enum(["available", "made_to_order", "sold_out"]).default("available"),
  isFeatured: z.boolean().default(false),
  isActive: z.boolean().default(true)
});

export const productUpdateSchema = productCreateSchema.partial();

export const offerCreateSchema = z.object({
  title: z.string().trim().min(2).max(160),
  description: z.string().trim().min(2),
  discountLabel: z.string().trim().min(1).max(80),
  imageUrl: urlOrEmpty,
  startsAt: z.string().trim().date().or(z.literal("")).nullable().optional(),
  endsAt: z.string().trim().date().or(z.literal("")).nullable().optional(),
  isActive: z.boolean().default(true)
});

export const offerUpdateSchema = offerCreateSchema.partial();
