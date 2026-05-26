import bcrypt from "bcryptjs";
import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import { ZodError, type ZodObject, type ZodRawShape } from "zod";
import { createToken, requireAdmin } from "./auth.js";
import { config } from "./config.js";
import { many, one, run } from "./db.js";
import { mapOffer, mapProduct, mapSettings } from "./serializers.js";
import {
  loginSchema,
  offerCreateSchema,
  offerUpdateSchema,
  productCreateSchema,
  productUpdateSchema,
  settingsSchema
} from "./validators.js";

type AsyncHandler = (req: Request, res: Response, next: NextFunction) => Promise<void>;
type FieldMap = Record<string, string>;

const app = express();

app.use(cors({ origin: true }));
app.use(express.json({ limit: "1mb" }));

const asyncRoute =
  (handler: AsyncHandler) =>
  (req: Request, res: Response, next: NextFunction) => {
    handler(req, res, next).catch(next);
  };

function compact<T extends Record<string, unknown>>(values: T, keepEmptyKeys = new Set<string>()) {
  return Object.fromEntries(
    Object.entries(values).map(([key, value]) => [
      key,
      value === "" && !keepEmptyKeys.has(key) ? null : value
    ])
  ) as T;
}

function parseBody<T extends ZodRawShape>(schema: ZodObject<T>, body: unknown, keepEmptyKeys: string[] = []) {
  return compact(schema.parse(body), new Set(keepEmptyKeys));
}

async function fetchSettings() {
  const settings = await one<Record<string, unknown>>("SELECT * FROM site_settings WHERE id = 1");
  if (!settings) {
    throw Object.assign(new Error("Configuracoes iniciais nao encontradas. Execute npm run db:setup."), {
      status: 500
    });
  }
  return mapSettings(settings);
}

function buildUpdate(table: string, id: number, values: Record<string, unknown>, fields: FieldMap) {
  const entries = Object.entries(values).filter(([key]) => fields[key]);
  if (entries.length === 0) return null;

  const assignments = entries.map(([key]) => `${fields[key]} = ?`).join(", ");
  const params = entries.map(([, value]) => value);
  return {
    sql: `UPDATE ${table} SET ${assignments} WHERE id = ?`,
    params: [...params, id]
  };
}

function normalizeImageUrls(values: unknown[] = []) {
  return Array.from(
    new Set(values.map((value) => String(value).trim()).filter(Boolean))
  );
}

async function fetchProductImageMap(productIds: number[]) {
  const imageMap = new Map<number, string[]>();
  if (productIds.length === 0) return imageMap;

  const placeholders = productIds.map(() => "?").join(", ");
  const imageRows = await many<Record<string, unknown>>(
    `SELECT product_id, image_url
     FROM product_images
     WHERE product_id IN (${placeholders})
     ORDER BY product_id ASC, sort_order ASC, id ASC`,
    productIds
  );

  for (const row of imageRows) {
    const productId = Number(row.product_id);
    const currentImages = imageMap.get(productId) ?? [];
    currentImages.push(String(row.image_url));
    imageMap.set(productId, currentImages);
  }

  return imageMap;
}

async function mapProductsWithImages(productRows: Record<string, unknown>[]) {
  const imageMap = await fetchProductImageMap(productRows.map((row) => Number(row.id)));
  return productRows.map((row) => mapProduct(row, imageMap.get(Number(row.id)) ?? []));
}

async function syncProductImages(productId: number, imageUrls: string[]) {
  await run("DELETE FROM product_images WHERE product_id = ?", [productId]);

  if (imageUrls.length === 0) return;

  const placeholders = imageUrls.map(() => "(?, ?, ?)").join(", ");
  const params = imageUrls.flatMap((imageUrl, index) => [productId, imageUrl, index]);

  await run(
    `INSERT INTO product_images (product_id, image_url, sort_order)
     VALUES ${placeholders}`,
    params
  );
}

const productFields: FieldMap = {
  name: "name",
  description: "description",
  price: "price",
  category: "category",
  imageUrl: "image_url",
  stockStatus: "stock_status",
  isFeatured: "is_featured",
  isActive: "is_active"
};

const offerFields: FieldMap = {
  title: "title",
  description: "description",
  discountLabel: "discount_label",
  imageUrl: "image_url",
  startsAt: "starts_at",
  endsAt: "ends_at",
  isActive: "is_active"
};

const settingsFields: FieldMap = {
  brandName: "brand_name",
  tagline: "tagline",
  heroTitle: "hero_title",
  heroSubtitle: "hero_subtitle",
  aboutTitle: "about_title",
  aboutText: "about_text",
  aboutImageUrl: "about_image_url",
  whatsapp: "whatsapp",
  instagram: "instagram",
  facebook: "facebook",
  tiktok: "tiktok",
  contactEmail: "contact_email",
  address: "address",
  businessHours: "business_hours",
  footerNote: "footer_note",
  logoUrl: "logo_url",
  heroImageUrl: "hero_image_url",
  primaryColor: "primary_color",
  accentColor: "accent_color",
  backgroundColor: "background_color"
};

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get(
  "/api/catalog",
  asyncRoute(async (_req, res) => {
    const [settings, productRows, offerRows] = await Promise.all([
      fetchSettings(),
      many<Record<string, unknown>>(
        "SELECT * FROM products WHERE is_active = 1 ORDER BY is_featured DESC, created_at DESC"
      ),
      many<Record<string, unknown>>(
        `SELECT * FROM offers
         WHERE is_active = 1
           AND (starts_at IS NULL OR starts_at <= CURRENT_DATE())
           AND (ends_at IS NULL OR ends_at >= CURRENT_DATE())
         ORDER BY created_at DESC`
      )
    ]);

    res.json({
      settings,
      products: await mapProductsWithImages(productRows),
      offers: offerRows.map(mapOffer)
    });
  })
);

app.post(
  "/api/admin/login",
  asyncRoute(async (req, res) => {
    const credentials = loginSchema.parse(req.body);
    const admin = await one<Record<string, unknown>>("SELECT * FROM admin_users WHERE email = ?", [
      credentials.email
    ]);

    if (!admin) {
      res.status(401).json({ message: "E-mail ou senha invalidos." });
      return;
    }

    const matches = await bcrypt.compare(credentials.password, String(admin.password_hash));
    if (!matches) {
      res.status(401).json({ message: "E-mail ou senha invalidos." });
      return;
    }

    res.json({
      token: createToken({
        id: Number(admin.id),
        email: String(admin.email),
        name: String(admin.name)
      }),
      admin: {
        id: Number(admin.id),
        email: String(admin.email),
        name: String(admin.name)
      }
    });
  })
);

app.use("/api/admin", requireAdmin);

app.get(
  "/api/admin/catalog",
  asyncRoute(async (_req, res) => {
    const [settings, productRows, offerRows] = await Promise.all([
      fetchSettings(),
      many<Record<string, unknown>>("SELECT * FROM products ORDER BY created_at DESC"),
      many<Record<string, unknown>>("SELECT * FROM offers ORDER BY created_at DESC")
    ]);

    res.json({
      settings,
      products: await mapProductsWithImages(productRows),
      offers: offerRows.map(mapOffer)
    });
  })
);

app.put(
  "/api/admin/settings",
  asyncRoute(async (req, res) => {
    const values = parseBody(settingsSchema, req.body, ["brandName", "tagline"]);
    const update = buildUpdate("site_settings", 1, values, settingsFields);
    if (update) await run(update.sql, update.params);
    res.json(await fetchSettings());
  })
);

app.post(
  "/api/admin/products",
  asyncRoute(async (req, res) => {
    const product = parseBody(productCreateSchema, req.body);
    const productImages = normalizeImageUrls(product.imageUrls ?? (product.imageUrl ? [product.imageUrl] : []));
    const result = await run(
      `INSERT INTO products
        (name, description, price, category, image_url, stock_status, is_featured, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        product.name,
        product.description,
        product.price,
        product.category,
        productImages[0] ?? product.imageUrl ?? null,
        product.stockStatus,
        product.isFeatured,
        product.isActive
      ]
    );
    await syncProductImages(result.insertId, productImages);
    const created = await one<Record<string, unknown>>("SELECT * FROM products WHERE id = ?", [
      result.insertId
    ]);
    res.status(201).json((await mapProductsWithImages([created!]))[0]);
  })
);

app.put(
  "/api/admin/products/:id",
  asyncRoute(async (req, res) => {
    const productId = Number(req.params.id);
    const product = parseBody(productUpdateSchema, req.body);
    const productImages =
      product.imageUrls !== undefined
        ? normalizeImageUrls(product.imageUrls)
        : product.imageUrl !== undefined
          ? normalizeImageUrls(product.imageUrl ? [product.imageUrl] : [])
          : null;
    if (productImages) {
      product.imageUrl = productImages[0] ?? null;
    }
    const update = buildUpdate("products", productId, product, productFields);
    if (update) await run(update.sql, update.params);
    if (productImages) await syncProductImages(productId, productImages);
    const updated = await one<Record<string, unknown>>("SELECT * FROM products WHERE id = ?", [productId]);
    if (!updated) {
      res.status(404).json({ message: "Produto nao encontrado." });
      return;
    }
    res.json((await mapProductsWithImages([updated]))[0]);
  })
);

app.delete(
  "/api/admin/products/:id",
  asyncRoute(async (req, res) => {
    await run("DELETE FROM products WHERE id = ?", [Number(req.params.id)]);
    res.status(204).end();
  })
);

app.post(
  "/api/admin/offers",
  asyncRoute(async (req, res) => {
    const offer = parseBody(offerCreateSchema, req.body);
    const result = await run(
      `INSERT INTO offers
        (title, description, discount_label, image_url, starts_at, ends_at, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        offer.title,
        offer.description,
        offer.discountLabel,
        offer.imageUrl ?? null,
        offer.startsAt ?? null,
        offer.endsAt ?? null,
        offer.isActive
      ]
    );
    const created = await one<Record<string, unknown>>("SELECT * FROM offers WHERE id = ?", [
      result.insertId
    ]);
    res.status(201).json(mapOffer(created!));
  })
);

app.put(
  "/api/admin/offers/:id",
  asyncRoute(async (req, res) => {
    const offerId = Number(req.params.id);
    const offer = parseBody(offerUpdateSchema, req.body);
    const update = buildUpdate("offers", offerId, offer, offerFields);
    if (update) await run(update.sql, update.params);
    const updated = await one<Record<string, unknown>>("SELECT * FROM offers WHERE id = ?", [offerId]);
    if (!updated) {
      res.status(404).json({ message: "Oferta nao encontrada." });
      return;
    }
    res.json(mapOffer(updated));
  })
);

app.delete(
  "/api/admin/offers/:id",
  asyncRoute(async (req, res) => {
    await run("DELETE FROM offers WHERE id = ?", [Number(req.params.id)]);
    res.status(204).end();
  })
);

app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (error instanceof ZodError) {
    res.status(400).json({
      message: "Dados invalidos.",
      issues: error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message }))
    });
    return;
  }

  const status = typeof error === "object" && error && "status" in error ? Number(error.status) : 500;
  const message = error instanceof Error ? error.message : "Erro inesperado.";
  res.status(status || 500).json({ message });
});

const server = app.listen(config.port, () => {
  console.log(`API rodando em http://localhost:${config.port}/api`);
});

server.on("error", (error: NodeJS.ErrnoException) => {
  if (error.code === "EADDRINUSE") {
    console.error(
      `Porta ${config.port} ja esta em uso. Encerre o outro processo ou altere PORT no arquivo .env.`
    );
    process.exit(1);
  }

  throw error;
});
