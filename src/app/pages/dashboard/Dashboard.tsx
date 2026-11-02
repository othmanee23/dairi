import { useApp } from "../../context/AppContext";
import { useNavigate } from "react-router";
import { Link } from "react-router";
import {
  Package,
  Eye,
  FileText,
  BookOpen,
  Plus,
  ArrowRight,
  ExternalLink,
  Layers,
  ShoppingBag,
  MessageCircle,
} from "lucide-react";
import { ImageWithFallback } from "../../components/figma/ImageWithFallback";

export function Dashboard() {
  const { products, lookbooks, collections, orders, supportRequests } = useApp();
  const navigate = useNavigate();

  const publishedProducts = products.filter((p) => p.status === "published" && p.showOnWebsite);
  const draftProducts = products.filter((p) => p.status === "draft");
  const recentProducts = products.slice(0, 6);

  const now = new Date();
  const hour = now.getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const dateStr = now.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const stats = [
    { label: "Total Products", value: products.length, icon: Package, detail: "In the catalog" },
    { label: "Published", value: publishedProducts.length, icon: Eye, detail: "Live on store" },
    { label: "Drafts", value: draftProducts.length, icon: FileText, detail: "Awaiting review" },
    { label: "Lookbooks", value: lookbooks.length, icon: BookOpen, detail: `${collections.length} collections` },
    { label: "Local Orders", value: orders.length, icon: ShoppingBag, detail: "Preview checkout only" },
    { label: "Client Requests", value: supportRequests.length, icon: MessageCircle, detail: "Support inbox" },
  ];

  return (
    <div className="admin-page min-h-screen p-8 lg:p-10">
      <div className="mx-auto max-w-[1440px]">
        <div className="mb-10 flex flex-col gap-6 border-b border-black/10 pb-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="mb-3 text-[10px] uppercase tracking-[3px] text-black/45">{dateStr}</p>
            <h1 className="text-4xl font-medium tracking-tight text-black lg:text-5xl">{greeting}</h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-black/58">
              Your catalog, collections, and lookbook tools are ready for the next DAIRI store update.
            </p>
          </div>
          <Link
            to="/store"
            className="admin-button inline-flex h-12 items-center justify-center gap-2 border border-black bg-black px-6 text-xs uppercase tracking-[2px] text-white hover:bg-white hover:text-black"
          >
            <ExternalLink size={14} />
            View Store
          </Link>
        </div>

        <div className="mb-10 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          {stats.map((stat) => (
            <div key={stat.label} className="admin-metric admin-card p-5 lg:p-6">
              <div className="mb-7 flex items-center justify-between">
                <span className="admin-metric-icon flex h-9 w-9 items-center justify-center">
                  <stat.icon className="h-[17px] w-[17px]" strokeWidth={1.6} />
                </span>
                <span className="text-[10px] uppercase tracking-[1.4px] text-black/38">Overview</span>
              </div>
              <div className="mb-1 text-3xl font-medium tracking-tight lg:text-4xl">{stat.value}</div>
              <div className="mb-2 text-xs font-medium text-black/75">{stat.label}</div>
              <div className="text-xs text-black/45">{stat.detail}</div>
            </div>
          ))}
        </div>

        <div className="mb-12 flex flex-wrap gap-3">
          <button
            onClick={() => navigate("/admin/products/new")}
            className="admin-button inline-flex h-12 items-center gap-2 bg-black px-6 text-xs uppercase tracking-[2px] text-white hover:bg-neutral-800"
          >
            <Plus className="h-4 w-4" />
            Add Product
          </button>
          <button
            onClick={() => navigate("/admin/lookbooks")}
            className="admin-button inline-flex h-12 items-center gap-2 border border-black/20 bg-white px-6 text-xs uppercase tracking-[2px] text-black hover:border-black hover:bg-black hover:text-white"
          >
            <BookOpen className="h-4 w-4" />
            Generate Lookbook
          </button>
          <button
            onClick={() => navigate("/admin/collections")}
            className="admin-button inline-flex h-12 items-center gap-2 border border-black/20 bg-white px-6 text-xs uppercase tracking-[2px] text-black hover:border-black hover:bg-black hover:text-white"
          >
            <Layers className="h-4 w-4" />
            Collections
          </button>
        </div>

        <section className="mb-14">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <p className="mb-1 text-[10px] uppercase tracking-[3px] text-black/40">Catalog</p>
              <h2 className="text-2xl font-medium tracking-tight text-black">Recent Products</h2>
            </div>
            <button
              onClick={() => navigate("/admin/products")}
              className="admin-button inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[2px] text-black/55 hover:text-black"
            >
              View All <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
            {recentProducts.map((product) => (
              <button
                key={product.id}
                className="admin-card group cursor-pointer p-3 text-left"
                onClick={() => navigate(`/admin/products/${product.id}/edit`)}
              >
                <div className="relative mb-3 aspect-[3/4] overflow-hidden bg-neutral-100">
                  <ImageWithFallback
                    src={product.images[0]}
                    alt={product.name}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <span className={`absolute right-2 top-2 h-2 w-2 rounded-full ${product.status === "published" ? "bg-black" : "bg-neutral-400"}`} />
                </div>
                <h3 className="truncate text-xs text-black">{product.name}</h3>
                <p className="mt-1 text-xs text-black/50">${product.price}</p>
              </button>
            ))}
          </div>
        </section>

        <section>
          <div className="mb-6 flex items-center justify-between">
            <div>
              <p className="mb-1 text-[10px] uppercase tracking-[3px] text-black/40">Storefront</p>
              <h2 className="text-2xl font-medium tracking-tight text-black">Collections</h2>
            </div>
            <button
              onClick={() => navigate("/admin/collections")}
              className="admin-button inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[2px] text-black/55 hover:text-black"
            >
              View All <ArrowRight className="h-3 w-3" />
            </button>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {collections.map((col) => (
              <button
                key={col.id}
                className="group relative aspect-[16/7] overflow-hidden text-left"
                onClick={() => navigate(`/collections/${col.id}`)}
              >
                <ImageWithFallback
                  src={col.image}
                  alt={col.name}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/72 via-black/10 to-transparent" />
                <div className="absolute bottom-0 left-0 p-5">
                  <p className="mb-1 text-[9px] uppercase tracking-[2px] text-white/65">{col.season}</p>
                  <h3 className="text-sm text-white">{col.name}</h3>
                </div>
                <div className="absolute right-3 top-3 bg-white px-2 py-1 text-[9px] uppercase tracking-[1px] text-black">
                  {products.filter(product => product.collection === col.name).length} items
                </div>
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
