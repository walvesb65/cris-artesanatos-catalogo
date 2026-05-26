import bcrypt from "bcryptjs";
import mysql from "mysql2/promise";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "./config.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function assertSafeDatabaseName(database: string) {
  if (!/^[a-zA-Z0-9_]+$/.test(database)) {
    throw new Error("MYSQL_DATABASE deve conter apenas letras, numeros e underscore.");
  }
}

async function createConnectionWithRetry(options: mysql.ConnectionOptions, attempts = 30) {
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await mysql.createConnection(options);
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
  }

  throw lastError;
}

async function ensureColumn(
  connection: mysql.Connection,
  tableName: string,
  columnName: string,
  definition: string
) {
  const [[column]] = await connection.query<mysql.RowDataPacket[]>(
    `SELECT COUNT(*) AS total
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND COLUMN_NAME = ?`,
    [tableName, columnName]
  );

  if (Number(column.total) === 0) {
    await connection.query(`ALTER TABLE \`${tableName}\` ADD COLUMN \`${columnName}\` ${definition}`);
  }
}

async function ensureSettingsColumns(connection: mysql.Connection) {
  await ensureColumn(connection, "site_settings", "about_title", "VARCHAR(180) NOT NULL DEFAULT 'Quem somos'");
  await ensureColumn(connection, "site_settings", "about_text", "TEXT NULL");
  await ensureColumn(connection, "site_settings", "about_image_url", "TEXT NULL");
  await ensureColumn(connection, "site_settings", "facebook", "VARCHAR(160) NULL");
  await ensureColumn(connection, "site_settings", "tiktok", "VARCHAR(160) NULL");
  await ensureColumn(connection, "site_settings", "contact_email", "VARCHAR(160) NULL");
  await ensureColumn(connection, "site_settings", "address", "VARCHAR(220) NULL");
  await ensureColumn(connection, "site_settings", "business_hours", "VARCHAR(160) NULL");
  await ensureColumn(connection, "site_settings", "footer_note", "TEXT NULL");
}

async function main() {
  assertSafeDatabaseName(config.db.database);

  const connection = await createConnectionWithRetry({
    host: config.db.host,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password,
    ssl: config.db.ssl,
    multipleStatements: true
  });

  await connection.query(
    `CREATE DATABASE IF NOT EXISTS \`${config.db.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  );
  await connection.changeUser({ database: config.db.database });

  const schemaPath = path.resolve(__dirname, "..", "database", "schema.sql");
  const schema = await fs.readFile(schemaPath, "utf8");
  await connection.query(schema);
  await ensureSettingsColumns(connection);

  await connection.execute(
    `INSERT IGNORE INTO site_settings (
      id, brand_name, tagline, hero_title, hero_subtitle, about_title, about_text, about_image_url,
      whatsapp, instagram, facebook, tiktok, contact_email, address, business_hours, footer_note, logo_url,
      hero_image_url, primary_color, accent_color, background_color
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      1,
      "Cris Artesanatos",
      "Peças feitas a mão com cuidado e personalidade",
      "Artesanato afetivo para casa, presentes e momentos especiais",
      "Escolha peças prontas ou encomende algo sob medida pelo WhatsApp. O painel admin permite trocar produtos, ofertas, textos, cores e imagens do catálogo.",
      "Quem somos",
      "A Cris Artesanatos nasceu do cuidado com detalhes e da vontade de transformar materiais simples em peças afetivas para casa, presentes e datas especiais. Cada produto e encomenda passa por uma produção manual, com atenção ao acabamento e ao estilo de quem vai receber.",
      "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=1000&q=80",
      "5599999999999",
      "https://instagram.com/crisartesanatos",
      "",
      "",
      "contato@crisartesanatos.local",
      "Atendimento online e entregas combinadas",
      "Segunda a sexta, 9h as 18h",
      "Pecas artesanais podem ter pequenas variacoes de cor, textura e acabamento, tornando cada item unico.",
      "",
      "https://images.unsplash.com/photo-1452860606245-08befc0ff44b?auto=format&fit=crop&w=1600&q=80",
      "#0e7c7b",
      "#d45070",
      "#fbfaf7"
    ]
  );

  await connection.execute(
    `UPDATE site_settings
     SET
      about_title = COALESCE(NULLIF(about_title, ''), ?),
      about_text = COALESCE(NULLIF(about_text, ''), ?),
      about_image_url = COALESCE(NULLIF(about_image_url, ''), ?),
      contact_email = COALESCE(NULLIF(contact_email, ''), ?),
      address = COALESCE(NULLIF(address, ''), ?),
      business_hours = COALESCE(NULLIF(business_hours, ''), ?),
      footer_note = COALESCE(NULLIF(footer_note, ''), ?)
     WHERE id = 1`,
    [
      "Quem somos",
      "A Cris Artesanatos nasceu do cuidado com detalhes e da vontade de transformar materiais simples em peças afetivas para casa, presentes e datas especiais. Cada produto e encomenda passa por uma produção manual, com atenção ao acabamento e ao estilo de quem vai receber.",
      "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=1000&q=80",
      "contato@crisartesanatos.local",
      "Atendimento online e entregas combinadas",
      "Segunda a sexta, 9h as 18h",
      "Pecas artesanais podem ter pequenas variacoes de cor, textura e acabamento, tornando cada item unico."
    ]
  );

  const passwordHash = await bcrypt.hash(config.admin.password, 10);
  await connection.execute(
    `INSERT INTO admin_users (name, email, password_hash)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE name = VALUES(name), password_hash = VALUES(password_hash)`,
    [config.admin.name, config.admin.email, passwordHash]
  );

  const [[productCount]] = await connection.query<mysql.RowDataPacket[]>("SELECT COUNT(*) as total FROM products");
  if (Number(productCount.total) === 0) {
    await connection.execute(
      `INSERT INTO products
        (name, description, price, category, image_url, stock_status, is_featured, is_active)
       VALUES
        (?, ?, ?, ?, ?, ?, ?, ?),
        (?, ?, ?, ?, ?, ?, ?, ?),
        (?, ?, ?, ?, ?, ?, ?, ?),
        (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        "Cesto organizador em fio de malha",
        "Cesto firme e lavavel para organizar atelie, banheiro ou quarto infantil.",
        89.9,
        "Casa",
        "https://images.unsplash.com/photo-1602872030490-4a484a7b3ba6?auto=format&fit=crop&w=900&q=80",
        "available",
        true,
        true,
        "Kit sousplat floral",
        "Conjunto com quatro sousplats em croche, ideal para mesa posta delicada.",
        124.9,
        "Mesa posta",
        "https://images.unsplash.com/photo-1513519683267-4ee6761728ac?auto=format&fit=crop&w=900&q=80",
        "made_to_order",
        true,
        true,
        "Boneca de pano personalizada",
        "Boneca artesanal com escolha de vestido, cabelo e detalhes bordados.",
        149.9,
        "Presentes",
        "https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?auto=format&fit=crop&w=900&q=80",
        "made_to_order",
        false,
        true,
        "Guirlanda decorativa",
        "Guirlanda leve para porta de entrada, feita com tecido, laços e flores.",
        79.9,
        "Decoracao",
        "https://images.unsplash.com/photo-1512909006721-3d6018887383?auto=format&fit=crop&w=900&q=80",
        "available",
        false,
        true
      ]
    );
  }

  const [[productImageCount]] = await connection.query<mysql.RowDataPacket[]>(
    "SELECT COUNT(*) as total FROM product_images"
  );
  if (Number(productImageCount.total) === 0) {
    await connection.execute(
      `INSERT INTO product_images (product_id, image_url, sort_order)
       SELECT id, image_url, 0
       FROM products
       WHERE image_url IS NOT NULL AND image_url <> ''`
    );
  }

  const [[offerCount]] = await connection.query<mysql.RowDataPacket[]>("SELECT COUNT(*) as total FROM offers");
  if (Number(offerCount.total) === 0) {
    await connection.execute(
      `INSERT INTO offers
        (title, description, discount_label, image_url, starts_at, ends_at, is_active)
       VALUES
        (?, ?, ?, ?, ?, ?, ?),
        (?, ?, ?, ?, ?, ?, ?)`,
      [
        "Semana da mesa posta",
        "Monte seu kit com sousplats, porta-guardanapos e trilho sob medida.",
        "10% off em kits",
        "https://images.unsplash.com/photo-1464195244916-405fa0a82545?auto=format&fit=crop&w=900&q=80",
        null,
        null,
        true,
        "Encomendas para presentes",
        "Pedidos personalizados com embalagem especial e cartao escrito a mao.",
        "embalagem gratis",
        "https://images.unsplash.com/photo-1512909006721-3d6018887383?auto=format&fit=crop&w=900&q=80",
        null,
        null,
        true
      ]
    );
  }

  await connection.end();
  console.log(`Banco ${config.db.database} preparado com sucesso.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
