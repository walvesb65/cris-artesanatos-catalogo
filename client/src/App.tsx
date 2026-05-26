import {
  BadgePercent,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  Facebook,
  Grid2X2,
  Image,
  Instagram,
  LayoutDashboard,
  LogOut,
  Mail,
  MapPin,
  MessageCircle,
  Music2,
  PackagePlus,
  Palette,
  Pencil,
  Plus,
  Save,
  Search,
  ShoppingBag,
  Sparkles,
  Tags,
  Trash2,
  UsersRound,
  Rows3
} from "lucide-react";
import { FormEvent, ReactNode, useEffect, useMemo, useRef, useState } from "react";
import {
  deleteOffer,
  deleteProduct,
  getAdminCatalog,
  getCatalog,
  login,
  saveOffer,
  saveProduct,
  saveSettings
} from "./api";
import type { CatalogData, Offer, Product, SiteSettings, StockStatus } from "./types";

const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL"
});

const emptyProduct: Partial<Product> = {
  name: "",
  description: "",
  price: 0,
  category: "",
  imageUrl: "",
  imageUrls: [],
  stockStatus: "available",
  isFeatured: false,
  isActive: true
};

const emptyOffer: Partial<Offer> = {
  title: "",
  description: "",
  discountLabel: "",
  imageUrl: "",
  startsAt: "",
  endsAt: "",
  isActive: true
};

const CUSTOM_CATEGORY = "__custom_category__";

const fallbackCatalog: CatalogData = {
  settings: {
    id: 1,
    brandName: "Cris Artesanatos",
    tagline: "Peças feitas a mão com cuidado",
    heroTitle: "Catalogo artesanal",
    heroSubtitle: "Produtos, presentes e encomendas personalizados.",
    aboutTitle: "Quem somos",
    aboutText:
      "A Cris Artesanatos nasceu do cuidado com detalhes e da vontade de transformar materiais simples em peças afetivas para casa, presentes e datas especiais.",
    aboutImageUrl: "",
    whatsapp: "5599999999999",
    instagram: "",
    facebook: "",
    tiktok: "",
    contactEmail: "contato@crisartesanatos.local",
    address: "Atendimento online e entregas combinadas",
    businessHours: "Segunda a sexta, 9h as 18h",
    footerNote: "Pecas artesanais podem ter pequenas variacoes de cor, textura e acabamento.",
    logoUrl: "",
    heroImageUrl: "",
    primaryColor: "#0e7c7b",
    accentColor: "#d45070",
    backgroundColor: "#fbfaf7",
    updatedAt: ""
  },
  products: [],
  offers: []
};

function App() {
  const isAdminRoute = window.location.pathname.startsWith("/admin");
  const [catalog, setCatalog] = useState<CatalogData>(fallbackCatalog);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refreshPublicCatalog = async () => {
    setLoading(true);
    setError("");
    try {
      setCatalog(await getCatalog());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel carregar o catalogo.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshPublicCatalog();
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--brand", catalog.settings.primaryColor);
    root.style.setProperty("--accent", catalog.settings.accentColor);
    root.style.setProperty("--page", catalog.settings.backgroundColor);
  }, [catalog.settings]);

  if (isAdminRoute) {
    return <AdminApp initialCatalog={catalog} onPublicRefresh={refreshPublicCatalog} />;
  }

  return <PublicCatalog catalog={catalog} loading={loading} error={error} />;
}

function PublicCatalog({ catalog, loading, error }: { catalog: CatalogData; loading: boolean; error: string }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Todos");
  const [mobileProductView, setMobileProductView] = useState<"compact" | "list">("compact");
  const [categoryScroll, setCategoryScroll] = useState({ left: false, right: false });
  const categoryTabsRef = useRef<HTMLDivElement | null>(null);
  const { settings, products, offers } = catalog;

  const categories = useMemo(
    () => ["Todos", ...Array.from(new Set(products.map((product) => product.category)))],
    [products]
  );

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesQuery = `${product.name} ${product.description} ${product.category}`
        .toLowerCase()
        .includes(query.toLowerCase());
      const matchesCategory = category === "Todos" || product.category === category;
      return matchesQuery && matchesCategory;
    });
  }, [category, products, query]);

  const displayBrandName = settings.brandName.trim();
  const whatsappLink = `https://wa.me/${settings.whatsapp}?text=${encodeURIComponent(
    `Oi! Vim pelo catalogo da ${displayBrandName || "loja"} e quero saber mais.`
  )}`;
  const heroInstagramLink = settings.instagram?.trim() || "/admin";
  const productOrderLink = (product: Product) =>
    `https://wa.me/${settings.whatsapp}?text=${encodeURIComponent(
      `Olá gostaria de incomendar essa peça: ${product.name}.${getProductImages(product)[0] ? `\n${getProductImages(product)[0]}` : ""}`
    )}`;

  const updateCategoryScroll = () => {
    const element = categoryTabsRef.current;
    if (!element) return;

    const maxScroll = element.scrollWidth - element.clientWidth;
    setCategoryScroll({
      left: element.scrollLeft > 2,
      right: maxScroll > 2 && element.scrollLeft < maxScroll - 2
    });
  };

  const scrollCategoryTabs = (direction: "left" | "right") => {
    const element = categoryTabsRef.current;
    if (!element) return;

    element.scrollBy({
      left: direction === "left" ? -160 : 160,
      behavior: "smooth"
    });
  };

  useEffect(() => {
    const element = categoryTabsRef.current;
    if (!element) return;

    const resizeObserver = new ResizeObserver(updateCategoryScroll);
    resizeObserver.observe(element);
    element.addEventListener("scroll", updateCategoryScroll, { passive: true });
    window.addEventListener("resize", updateCategoryScroll);
    updateCategoryScroll();

    return () => {
      resizeObserver.disconnect();
      element.removeEventListener("scroll", updateCategoryScroll);
      window.removeEventListener("resize", updateCategoryScroll);
    };
  }, [categories]);

  return (
    <main className="site-shell">
      <section
        className="hero"
        style={{
          backgroundImage: settings.heroImageUrl
            ? `linear-gradient(90deg, rgba(19, 23, 28, 0.78), rgba(19, 23, 28, 0.2)), url(${settings.heroImageUrl})`
            : undefined
        }}
      >
        <nav className="topbar" aria-label="Navegacao principal">
          <a className="brand-mark" href="/">
            {settings.logoUrl ? <img src={settings.logoUrl} alt="" /> : <Sparkles size={22} />}
            {displayBrandName && <span>{displayBrandName}</span>}
          </a>
          <a
            className="admin-link"
            href={heroInstagramLink}
            target={settings.instagram ? "_blank" : undefined}
            rel={settings.instagram ? "noreferrer" : undefined}
            title="Instagram"
          >
            <Instagram size={18} />
          </a>
        </nav>

        <div className="hero-copy">
          {settings.tagline.trim() && <p>{settings.tagline}</p>}
          <h1>{settings.heroTitle}</h1>
          <span>{settings.heroSubtitle}</span>
          <div className="hero-actions">
            <a className="primary-action" href={whatsappLink} target="_blank" rel="noreferrer">
              <ShoppingBag size={18} />
              Chamar no WhatsApp
            </a>
            <a className="secondary-action" href="#catalogo">
              Ver catalogo
            </a>
          </div>
        </div>
      </section>

      <section className="catalog-section" id="catalogo">
        <div className="section-heading">
          <span>Produtos</span>
          <h2>Escolha uma peça e faça a sua encomenda</h2>
        </div>

        <div className="catalog-tools">
          <label className="search-box">
            <Search size={18} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar produto, categoria ou detalhe"
            />
          </label>
          <div className="category-carousel">
            {categoryScroll.left && (
              <button
                className="category-arrow category-arrow-left"
                onClick={() => scrollCategoryTabs("left")}
                title="Ver categorias anteriores"
                type="button"
              >
                <ChevronLeft size={18} />
              </button>
            )}
            <div className="category-tabs" aria-label="Categorias" ref={categoryTabsRef}>
              {categories.map((item) => (
                <button
                  key={item}
                  className={item === category ? "active" : ""}
                  onClick={() => setCategory(item)}
                  type="button"
                >
                  {item}
                </button>
              ))}
            </div>
            {categoryScroll.right && (
              <button
                className="category-arrow category-arrow-right"
                onClick={() => scrollCategoryTabs("right")}
                title="Ver mais categorias"
                type="button"
              >
                <ChevronRight size={18} />
              </button>
            )}
          </div>
          <div className="mobile-view-toggle" aria-label="Visualizacao dos produtos">
            <button
              className={mobileProductView === "compact" ? "active" : ""}
              onClick={() => setMobileProductView("compact")}
              type="button"
              aria-pressed={mobileProductView === "compact"}
              aria-label="Ver dois produtos por linha"
              title="Ver dois produtos por linha"
            >
              <Grid2X2 size={17} />
            </button>
            <button
              className={mobileProductView === "list" ? "active" : ""}
              onClick={() => setMobileProductView("list")}
              type="button"
              aria-pressed={mobileProductView === "list"}
              aria-label="Ver um produto por linha"
              title="Ver um produto por linha"
            >
              <Rows3 size={17} />
            </button>
          </div>
        </div>

        {error && <p className="status-message error">{error}</p>}
        {loading && <p className="status-message">Carregando catalogo...</p>}

        {filteredProducts.length === 0 && !loading ? (
          <div className="empty-products">
            <div>
              <h3>Nenhum produto encontrado</h3>
              <p>
                Nao encontramos uma peça com esses filtros. A Cris pode verificar opcoes prontas ou montar uma
                encomenda personalizada.
              </p>
            </div>
            <a className="whatsapp-action" href={whatsappLink} target="_blank" rel="noreferrer">
              <MessageCircle size={18} />
              Fale com Cris
            </a>
          </div>
        ) : (
          <div className={`product-grid product-grid-${mobileProductView}`}>
            {filteredProducts.map((product) => (
              <article className="product-card" key={product.id}>
                <ProductMedia product={product} />
                <div className="product-body">
                  <div>
                    <span>{product.category}</span>
                    <h3>{product.name}</h3>
                    <p>{product.description}</p>
                  </div>
                  <div className="product-footer">
                    <b>{BRL.format(product.price)}</b>
                    <small>{stockLabel(product.stockStatus)}</small>
                  </div>
                  <a
                    className="order-action"
                    href={productOrderLink(product)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <ShoppingBag size={17} />
                    Fazer pedido
                  </a>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {offers.length > 0 && (
        <section className="offers-section">
          <div className="section-heading">
            <span>Ofertas</span>
            <h2>Condicoes especiais ativas</h2>
          </div>
          <div className="offer-list">
            {offers.map((offer) => (
              <article className="offer-card" key={offer.id}>
                {offer.imageUrl && <img src={offer.imageUrl} alt="" />}
                <div>
                  <span>{offer.discountLabel}</span>
                  <h3>{offer.title}</h3>
                  <p>{offer.description}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      <AboutSection settings={settings} />
      <SiteFooter settings={settings} whatsappLink={whatsappLink} />
    </main>
  );
}

function getProductImages(product: Product) {
  const imageUrls = product.imageUrls?.map((imageUrl) => imageUrl.trim()).filter(Boolean) ?? [];
  if (imageUrls.length > 0) return imageUrls;
  return product.imageUrl ? [product.imageUrl] : [];
}

function ProductMedia({ product }: { product: Product }) {
  const images = getProductImages(product);
  const [activeImage, setActiveImage] = useState(0);
  const hasMultipleImages = images.length > 1;

  useEffect(() => {
    setActiveImage(0);
  }, [product.id, images.length]);

  const moveImage = (direction: "previous" | "next") => {
    setActiveImage((currentImage) => {
      if (direction === "previous") {
        return currentImage === 0 ? images.length - 1 : currentImage - 1;
      }

      return currentImage === images.length - 1 ? 0 : currentImage + 1;
    });
  };

  return (
    <div className="product-media">
      {images[activeImage] ? <img src={images[activeImage]} alt={product.name} /> : <Image size={30} />}
      {product.isFeatured && <strong>Destaque</strong>}
      {hasMultipleImages && (
        <>
          <button
            className="product-photo-arrow product-photo-arrow-left"
            onClick={() => moveImage("previous")}
            title="Foto anterior"
            type="button"
          >
            <ChevronLeft size={17} />
          </button>
          <button
            className="product-photo-arrow product-photo-arrow-right"
            onClick={() => moveImage("next")}
            title="Proxima foto"
            type="button"
          >
            <ChevronRight size={17} />
          </button>
          <span className="product-photo-count">
            {activeImage + 1}/{images.length}
          </span>
        </>
      )}
    </div>
  );
}

function AboutSection({ settings }: { settings: SiteSettings }) {
  if (!settings.aboutTitle && !settings.aboutText) return null;

  return (
    <section className="about-section" id="quem-somos">
      <div className="about-copy">
        <div className="section-heading">
          <span>Quem somos</span>
          <h2>{settings.aboutTitle}</h2>
        </div>
        <p>{settings.aboutText}</p>
      </div>
      <div className="about-media">
        {settings.aboutImageUrl ? <img src={settings.aboutImageUrl} alt="" /> : <UsersRound size={48} />}
      </div>
    </section>
  );
}

function SiteFooter({ settings, whatsappLink }: { settings: SiteSettings; whatsappLink: string }) {
  const socialLinks = [
    settings.instagram ? { label: "Instagram", href: settings.instagram, icon: <Instagram size={18} /> } : null,
    settings.facebook ? { label: "Facebook", href: settings.facebook, icon: <Facebook size={18} /> } : null,
    settings.tiktok ? { label: "TikTok", href: settings.tiktok, icon: <Music2 size={18} /> } : null
  ].filter(Boolean) as Array<{ label: string; href: string; icon: ReactNode }>;

  return (
    <footer className="site-footer">
      <div className="footer-brand">
        <a className="brand-mark" href="/">
          {settings.logoUrl ? <img src={settings.logoUrl} alt="" /> : <Sparkles size={22} />}
          {settings.brandName.trim() && <span>{settings.brandName}</span>}
        </a>
        <p>{settings.footerNote}</p>
      </div>

      <div className="footer-info">
        <h2>Informacoes</h2>
        {settings.address && (
          <p>
            <MapPin size={17} />
            {settings.address}
          </p>
        )}
        {settings.businessHours && (
          <p>
            <Clock size={17} />
            {settings.businessHours}
          </p>
        )}
        {settings.contactEmail && (
          <a href={`mailto:${settings.contactEmail}`}>
            <Mail size={17} />
            {settings.contactEmail}
          </a>
        )}
        <a href={whatsappLink} target="_blank" rel="noreferrer">
          <MessageCircle size={17} />
          WhatsApp
        </a>
      </div>

      <div className="footer-social">
        <h2>Redes sociais</h2>
        <div>
          {socialLinks.length > 0 ? (
            socialLinks.map((link) => (
              <a key={link.label} href={link.href} target="_blank" rel="noreferrer" title={link.label}>
                {link.icon}
                <span>{link.label}</span>
              </a>
            ))
          ) : (
            <span>Adicione as redes no painel admin.</span>
          )}
        </div>
      </div>
    </footer>
  );
}

function AdminApp({
  initialCatalog,
  onPublicRefresh
}: {
  initialCatalog: CatalogData;
  onPublicRefresh: () => Promise<void>;
}) {
  const [token, setToken] = useState(() => localStorage.getItem("adminToken") ?? "");
  const [catalog, setCatalog] = useState(initialCatalog);
  const [activeTab, setActiveTab] = useState<"layout" | "products" | "offers">("layout");
  const [message, setMessage] = useState("");

  const loadAdminCatalog = async (authToken = token) => {
    if (!authToken) return;
    setMessage("");
    try {
      setCatalog(await getAdminCatalog(authToken));
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Falha ao carregar admin.");
    }
  };

  useEffect(() => {
    loadAdminCatalog();
  }, [token]);

  const handleLogout = () => {
    localStorage.removeItem("adminToken");
    setToken("");
  };

  if (!token) {
    return (
      <LoginScreen
        onLogin={(nextToken) => {
          localStorage.setItem("adminToken", nextToken);
          setToken(nextToken);
        }}
      />
    );
  }

  return (
    <main className="admin-shell">
      <aside className="admin-sidebar">
        <a className={`brand-mark admin-brand ${catalog.settings.logoUrl ? "admin-brand-logo" : ""}`} href="/">
          {catalog.settings.logoUrl ? <img src={catalog.settings.logoUrl} alt="" /> : <LayoutDashboard size={22} />}
          {!catalog.settings.logoUrl && <span>Admin catalogo</span>}
        </a>
        <div className="admin-tabs">
          <button className={activeTab === "layout" ? "active" : ""} onClick={() => setActiveTab("layout")}>
            <Palette size={18} />
            Layout
          </button>
          <button className={activeTab === "products" ? "active" : ""} onClick={() => setActiveTab("products")}>
            <ShoppingBag size={18} />
            Produtos
          </button>
          <button className={activeTab === "offers" ? "active" : ""} onClick={() => setActiveTab("offers")}>
            <BadgePercent size={18} />
            Ofertas
          </button>
        </div>
        <button className="ghost-button" onClick={handleLogout}>
          <LogOut size={18} />
          Sair
        </button>
      </aside>

      <section className="admin-content">
        <header className="admin-header">
          <div>
            <span>Painel administrativo</span>
            <h1>{catalog.settings.brandName || "Catalogo"}</h1>
          </div>
          <a className="secondary-action compact" href="/">
            <Eye size={17} />
            Ver catalogo
          </a>
        </header>

        {message && <p className="status-message">{message}</p>}

        {activeTab === "layout" && (
          <LayoutEditor
            settings={catalog.settings}
            token={token}
            onSaved={(settings) => {
              setCatalog((current) => ({ ...current, settings }));
              onPublicRefresh();
              setMessage("Layout atualizado.");
            }}
          />
        )}
        {activeTab === "products" && (
          <ProductsEditor
            products={catalog.products}
            token={token}
            onChanged={async () => {
              await loadAdminCatalog();
              await onPublicRefresh();
              setMessage("Produtos atualizados.");
            }}
          />
        )}
        {activeTab === "offers" && (
          <OffersEditor
            offers={catalog.offers}
            token={token}
            onChanged={async () => {
              await loadAdminCatalog();
              await onPublicRefresh();
              setMessage("Ofertas atualizadas.");
            }}
          />
        )}
      </section>
    </main>
  );
}

function LoginScreen({ onLogin }: { onLogin: (token: string) => void }) {
  const [email, setEmail] = useState("admin@crisartesanatos.local");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState("");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    try {
      const response = await login(email, password);
      onLogin(response.token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel entrar.");
    }
  };

  return (
    <main className="login-screen">
      <form className="login-card" onSubmit={submit}>
        <div className="login-icon">
          <LayoutDashboard size={26} />
        </div>
        <h1>Painel do catalogo</h1>
        <label>
          E-mail
          <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" />
        </label>
        <label>
          Senha
          <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" />
        </label>
        {error && <p className="status-message error">{error}</p>}
        <button className="primary-action full" type="submit">
          Entrar
        </button>
      </form>
    </main>
  );
}

function LayoutEditor({
  settings,
  token,
  onSaved
}: {
  settings: SiteSettings;
  token: string;
  onSaved: (settings: SiteSettings) => void;
}) {
  const [form, setForm] = useState(settings);

  useEffect(() => {
    setForm(settings);
  }, [settings]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    onSaved(await saveSettings(token, form));
  };

  return (
    <form className="editor-panel" onSubmit={submit}>
      <div className="editor-title">
        <Palette size={20} />
        <h2>Conteudo e aparencia</h2>
      </div>
      <div className="form-grid">
        <TextField label="Nome da loja" value={form.brandName} onChange={(brandName) => setForm({ ...form, brandName })} />
        <TextField label="Chamada curta" value={form.tagline} onChange={(tagline) => setForm({ ...form, tagline })} />
        <TextField label="Titulo principal" value={form.heroTitle} onChange={(heroTitle) => setForm({ ...form, heroTitle })} />
        <TextField label="WhatsApp" value={form.whatsapp} onChange={(whatsapp) => setForm({ ...form, whatsapp })} />
        <TextArea
          label="Texto principal"
          value={form.heroSubtitle}
          onChange={(heroSubtitle) => setForm({ ...form, heroSubtitle })}
        />
        <TextField
          label="Titulo Quem somos"
          value={form.aboutTitle ?? ""}
          onChange={(aboutTitle) => setForm({ ...form, aboutTitle })}
        />
        <TextField
          label="Imagem Quem somos"
          value={form.aboutImageUrl ?? ""}
          onChange={(aboutImageUrl) => setForm({ ...form, aboutImageUrl })}
        />
        <TextArea
          label="Historia da empresa"
          value={form.aboutText ?? ""}
          onChange={(aboutText) => setForm({ ...form, aboutText })}
        />
        <TextField
          label="Instagram"
          value={form.instagram ?? ""}
          onChange={(instagram) => setForm({ ...form, instagram })}
        />
        <TextField
          label="Facebook"
          value={form.facebook ?? ""}
          onChange={(facebook) => setForm({ ...form, facebook })}
        />
        <TextField label="TikTok" value={form.tiktok ?? ""} onChange={(tiktok) => setForm({ ...form, tiktok })} />
        <TextField
          label="E-mail de contato"
          value={form.contactEmail ?? ""}
          onChange={(contactEmail) => setForm({ ...form, contactEmail })}
        />
        <TextField label="Endereco/atendimento" value={form.address ?? ""} onChange={(address) => setForm({ ...form, address })} />
        <TextField
          label="Horario"
          value={form.businessHours ?? ""}
          onChange={(businessHours) => setForm({ ...form, businessHours })}
        />
        <TextArea
          label="Texto do rodape"
          value={form.footerNote ?? ""}
          onChange={(footerNote) => setForm({ ...form, footerNote })}
        />
        <TextField label="URL da logo" value={form.logoUrl ?? ""} onChange={(logoUrl) => setForm({ ...form, logoUrl })} />
        <TextField
          label="Imagem de fundo"
          value={form.heroImageUrl ?? ""}
          onChange={(heroImageUrl) => setForm({ ...form, heroImageUrl })}
        />
        <ColorField label="Cor principal" value={form.primaryColor} onChange={(primaryColor) => setForm({ ...form, primaryColor })} />
        <ColorField label="Cor de destaque" value={form.accentColor} onChange={(accentColor) => setForm({ ...form, accentColor })} />
        <ColorField label="Fundo da pagina" value={form.backgroundColor} onChange={(backgroundColor) => setForm({ ...form, backgroundColor })} />
      </div>
      <button className="primary-action fit" type="submit">
        <Save size={18} />
        Salvar layout
      </button>
    </form>
  );
}

function ProductsEditor({
  products,
  token,
  onChanged
}: {
  products: Product[];
  token: string;
  onChanged: () => Promise<void>;
}) {
  const [form, setForm] = useState<Partial<Product>>(emptyProduct);
  const productCategories = useMemo(
    () => Array.from(new Set(products.map((product) => product.category).filter(Boolean))).sort(),
    [products]
  );

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const imageUrls = normalizeProductImages(form.imageUrls ?? (form.imageUrl ? [form.imageUrl] : []));
    await saveProduct(token, {
      ...form,
      imageUrl: imageUrls[0] ?? "",
      imageUrls,
      price: Number(form.price ?? 0)
    });
    setForm(emptyProduct);
    await onChanged();
  };

  return (
    <div className="management-grid">
      <form className="editor-panel" onSubmit={submit}>
        <div className="editor-title">
          <PackagePlus size={20} />
          <h2>{form.id ? "Editar produto" : "Novo produto"}</h2>
        </div>
        <div className="form-grid">
          <TextField label="Nome" value={form.name ?? ""} onChange={(name) => setForm({ ...form, name })} />
          <CategoryField
            categories={productCategories}
            value={form.category ?? ""}
            onChange={(category) => setForm({ ...form, category })}
          />
          <PriceField value={form.price ?? 0} onChange={(price) => setForm({ ...form, price })} />
          <ProductImagesField
            value={form.imageUrls ?? (form.imageUrl ? [form.imageUrl] : [])}
            onChange={(imageUrls) => setForm({ ...form, imageUrls, imageUrl: imageUrls[0] ?? "" })}
          />
          <TextArea
            label="Descricao"
            value={form.description ?? ""}
            onChange={(description) => setForm({ ...form, description })}
          />
          <label>
            Status
            <select
              value={form.stockStatus ?? "available"}
              onChange={(event) => setForm({ ...form, stockStatus: event.target.value as StockStatus })}
            >
              <option value="available">Disponivel</option>
              <option value="made_to_order">Sob encomenda</option>
              <option value="sold_out">Esgotado</option>
            </select>
          </label>
          <label className="check-row">
            <input
              checked={Boolean(form.isFeatured)}
              onChange={(event) => setForm({ ...form, isFeatured: event.target.checked })}
              type="checkbox"
            />
            Produto destaque
          </label>
          <label className="check-row">
            <input
              checked={form.isActive ?? true}
              onChange={(event) => setForm({ ...form, isActive: event.target.checked })}
              type="checkbox"
            />
            Visivel no catalogo
          </label>
        </div>
        <div className="form-actions">
          <button className="primary-action fit" type="submit">
            <Save size={18} />
            Salvar produto
          </button>
          {form.id && (
            <button className="ghost-button fit" type="button" onClick={() => setForm(emptyProduct)}>
              <Plus size={18} />
              Novo
            </button>
          )}
        </div>
      </form>

      <div className="list-panel">
        {products.map((product) => (
          <article className="admin-list-item" key={product.id}>
            <div>
              <span>{product.category}</span>
              <h3>{product.name}</h3>
              <p>{BRL.format(product.price)} · {stockLabel(product.stockStatus)}</p>
            </div>
            <div className="item-actions">
              <button type="button" title="Editar" onClick={() => setForm(product)}>
                <Pencil size={17} />
              </button>
              <button
                type="button"
                title="Excluir"
                onClick={async () => {
                  await deleteProduct(token, product.id);
                  await onChanged();
                }}
              >
                <Trash2 size={17} />
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function CategoryField({
  categories,
  value,
  onChange
}: {
  categories: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  const [isCreatingCategory, setIsCreatingCategory] = useState(categories.length === 0);
  const isCustomCategory = Boolean(value) && !categories.includes(value);
  const selectedValue = isCreatingCategory || isCustomCategory || categories.length === 0 ? CUSTOM_CATEGORY : value;

  useEffect(() => {
    if (value && categories.includes(value)) {
      setIsCreatingCategory(false);
    }
  }, [categories, value]);

  return (
    <label>
      Categoria
      <select
        value={selectedValue}
        onChange={(event) => {
          const nextValue = event.target.value;
          const shouldCreateCategory = nextValue === CUSTOM_CATEGORY;
          setIsCreatingCategory(shouldCreateCategory);
          onChange(shouldCreateCategory ? "" : nextValue);
        }}
      >
        {categories.length > 0 && <option value="">Selecione uma categoria</option>}
        {categories.map((category) => (
          <option key={category} value={category}>
            {category}
          </option>
        ))}
        <option value={CUSTOM_CATEGORY}>Nova categoria</option>
      </select>
      {selectedValue === CUSTOM_CATEGORY && (
        <input
          value={isCustomCategory ? value : ""}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Digite o nome da nova categoria"
        />
      )}
    </label>
  );
}

function PriceField({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  const handleChange = (rawValue: string) => {
    const digits = rawValue.replace(/\D/g, "");
    const cents = Number(digits || "0");
    onChange(cents / 100);
  };

  return (
    <label>
      Preco
      <input
        inputMode="numeric"
        value={BRL.format(value)}
        onChange={(event) => handleChange(event.target.value)}
        placeholder="R$ 0,00"
      />
    </label>
  );
}

function normalizeProductImages(imageUrls: string[]) {
  return Array.from(new Set(imageUrls.map((imageUrl) => imageUrl.trim()).filter(Boolean)));
}

function ProductImagesField({
  value,
  onChange
}: {
  value: string[];
  onChange: (value: string[]) => void;
}) {
  const imageInputs = value.length > 0 ? value : [""];
  const previewImages = normalizeProductImages(imageInputs);

  const updateImage = (index: number, imageUrl: string) => {
    const nextImages = [...imageInputs];
    nextImages[index] = imageUrl;
    onChange(nextImages);
  };

  const removeImage = (index: number) => {
    const nextImages = imageInputs.filter((_, currentIndex) => currentIndex !== index);
    onChange(nextImages.length > 0 ? nextImages : [""]);
  };

  return (
    <div className="wide product-images-field">
      <span className="field-label">Fotos do produto</span>
      <div className="image-url-list">
        {imageInputs.map((imageUrl, index) => (
          <div className="image-url-row" key={index}>
            <input
              value={imageUrl}
              onChange={(event) => updateImage(index, event.target.value)}
              placeholder={`URL da foto ${index + 1}`}
              type="url"
            />
            <button
              aria-label="Remover foto"
              disabled={imageInputs.length === 1}
              onClick={() => removeImage(index)}
              title="Remover foto"
              type="button"
            >
              <Trash2 size={17} />
            </button>
          </div>
        ))}
      </div>
      <button className="ghost-button fit" onClick={() => onChange([...imageInputs, ""])} type="button">
        <Plus size={18} />
        Adicionar foto
      </button>
      {previewImages.length > 0 && (
        <div className="image-preview-grid">
          {previewImages.map((imageUrl, index) => (
            <figure key={`${imageUrl}-${index}`}>
              <img src={imageUrl} alt="" />
              <figcaption>Foto {index + 1}</figcaption>
            </figure>
          ))}
        </div>
      )}
    </div>
  );
}

function OffersEditor({
  offers,
  token,
  onChanged
}: {
  offers: Offer[];
  token: string;
  onChanged: () => Promise<void>;
}) {
  const [form, setForm] = useState<Partial<Offer>>(emptyOffer);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    await saveOffer(token, form);
    setForm(emptyOffer);
    await onChanged();
  };

  return (
    <div className="management-grid">
      <form className="editor-panel" onSubmit={submit}>
        <div className="editor-title">
          <Tags size={20} />
          <h2>{form.id ? "Editar oferta" : "Nova oferta"}</h2>
        </div>
        <div className="form-grid">
          <TextField label="Titulo" value={form.title ?? ""} onChange={(title) => setForm({ ...form, title })} />
          <TextField
            label="Selo"
            value={form.discountLabel ?? ""}
            onChange={(discountLabel) => setForm({ ...form, discountLabel })}
          />
          <TextField label="Imagem" value={form.imageUrl ?? ""} onChange={(imageUrl) => setForm({ ...form, imageUrl })} />
          <TextField
            label="Inicio"
            type="date"
            value={form.startsAt ?? ""}
            onChange={(startsAt) => setForm({ ...form, startsAt })}
          />
          <TextField
            label="Fim"
            type="date"
            value={form.endsAt ?? ""}
            onChange={(endsAt) => setForm({ ...form, endsAt })}
          />
          <TextArea
            label="Descricao"
            value={form.description ?? ""}
            onChange={(description) => setForm({ ...form, description })}
          />
          <label className="check-row">
            <input
              checked={form.isActive ?? true}
              onChange={(event) => setForm({ ...form, isActive: event.target.checked })}
              type="checkbox"
            />
            Oferta ativa
          </label>
        </div>
        <div className="form-actions">
          <button className="primary-action fit" type="submit">
            <Save size={18} />
            Salvar oferta
          </button>
          {form.id && (
            <button className="ghost-button fit" type="button" onClick={() => setForm(emptyOffer)}>
              <Plus size={18} />
              Nova
            </button>
          )}
        </div>
      </form>

      <div className="list-panel">
        {offers.map((offer) => (
          <article className="admin-list-item" key={offer.id}>
            <div>
              <span>{offer.discountLabel}</span>
              <h3>{offer.title}</h3>
              <p>{offer.isActive ? "Ativa" : "Oculta"}</p>
            </div>
            <div className="item-actions">
              <button type="button" title="Editar" onClick={() => setForm(offer)}>
                <Pencil size={17} />
              </button>
              <button
                type="button"
                title="Excluir"
                onClick={async () => {
                  await deleteOffer(token, offer.id);
                  await onChanged();
                }}
              >
                <Trash2 size={17} />
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  type = "text"
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label>
      {label}
      <input value={value} onChange={(event) => onChange(event.target.value)} type={type} step={type === "number" ? "0.01" : undefined} />
    </label>
  );
}

function TextArea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="wide">
      {label}
      <textarea value={value} onChange={(event) => onChange(event.target.value)} rows={4} />
    </label>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label>
      {label}
      <span className="color-input">
        <input aria-label={label} value={value} onChange={(event) => onChange(event.target.value)} type="color" />
        <input value={value} onChange={(event) => onChange(event.target.value)} />
      </span>
    </label>
  );
}

function stockLabel(status: StockStatus) {
  const labels: Record<StockStatus, string> = {
    available: "Disponivel",
    made_to_order: "Sob encomenda",
    sold_out: "Esgotado"
  };
  return labels[status];
}

export default App;
