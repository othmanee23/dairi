import { Link } from "react-router";
import { StoreFooter } from "../../components/store/StoreFooter";
import { StoreHeader } from "../../components/store/StoreHeader";
import { useApp } from "../../context/AppContext";
import { customerPriceLabel, withCustomerPrice } from "../../data/storeProducts";
import { usePageSeo } from "../../lib/seo";

export function CloseoutSale() {
  const { products, customerAccount } = useApp();
  usePageSeo({ title: 'Closeout Sale | DAIRI Women’s Fashion', description: 'Shop selected DAIRI closeout pieces with limited availability. Product prices are shown in USD.', path: '/store/sale' });
  const wholesale = customerAccount?.wholesaleStatus === "approved";
  const items = products.filter(product => product.status === "published" && product.showOnWebsite && product.tags.some(tag => tag.trim().toLowerCase() === "closeout")).map(product => withCustomerPrice(product, wholesale));

  return (
    <div className="store-page min-h-screen bg-white" style={{ fontFamily: "Inter, sans-serif" }}>
      <StoreHeader />
      <main className="px-6 py-14 lg:px-10 lg:py-20">
        <div className="mb-10 border-b border-black/10 pb-7">
          <p className="mb-3 text-[10px] uppercase tracking-[0.22em] text-black/45">Limited availability</p>
          <h1 className="text-4xl">Closeout Sale</h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-black/60">Explore selected DAIRI pieces with limited availability. Product prices are shown in USD.</p>
        </div>
        {items.length ? (
          <div className="grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-4">
            {items.map(product => (
              <Link key={product.id} to={`/store/products/${product.id}`} className="store-card group block">
                <div className="mb-4 aspect-[3/4] overflow-hidden bg-[#f5f5f5]">
                  <img src={product.image} alt={product.name} className="h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-[1.02]" />
                </div>
                <p className="text-sm font-medium">{product.name}</p>
                <p className="mt-1 text-sm text-black/60">{customerPriceLabel(product, wholesale)}</p>
                {product.styleNumber && <p className="mt-1 text-[10px] uppercase tracking-wider text-black/40">Style {product.styleNumber}</p>}
              </Link>
            ))}
          </div>
        ) : (
          <div className="py-16 text-center">
            <p className="text-black/60">There are no closeout pieces available right now.</p>
            <Link to="/store/shop" className="mt-6 inline-block text-sm underline underline-offset-4">Continue shopping</Link>
          </div>
        )}
      </main>
      <StoreFooter />
    </div>
  );
}
