import { Link } from "react-router";
import { StoreFooter } from "../../components/store/StoreFooter";
import { StoreHeader } from "../../components/store/StoreHeader";
import { useApp } from "../../context/AppContext";
import { withCustomerPrice, customerPriceLabel } from "../../data/storeProducts";

export function Wishlist() {
  const { wishlist, products, toggleWishlist, addToCart, customerAccount } = useApp();
  const wholesale = customerAccount?.wholesaleStatus === 'approved';
  const items = wishlist.map(id => products.find(p => p.id === id)).filter((p): p is NonNullable<typeof p> => Boolean(p));
  return <div className="store-page min-h-screen bg-white" style={{fontFamily:"Inter, sans-serif"}}><StoreHeader/><main className="px-8 lg:px-10 py-16"><div className="flex items-end justify-between mb-10"><div><h1 className="text-3xl mb-3">Wishlist</h1><p className="text-black/55">Save pieces here and move them to your bag when you are ready.</p></div><Link to="/store/shop" className="hidden md:block underline underline-offset-2">Continue shopping</Link></div>{items.length ? <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">{items.map(item=>{const view=withCustomerPrice(item,wholesale);const variant=item.variants?.find(v=>v.isActive&&v.inventoryQuantity>0);return <div key={item.id} className="store-card"><Link to={`/store/products/${item.id}`} className="block"><div className="relative aspect-[3/4] bg-[#f6f6f6] overflow-hidden mb-4"><img src={view.image} alt={item.name} className="h-full w-full object-cover object-top"/></div><p className="text-sm font-medium">{item.name}</p><p className="text-sm mt-1">{customerPriceLabel(view,wholesale)}</p></Link><div className="flex gap-2 mt-4"><button disabled={!variant||(wholesale&&variant.wholesalePrice==null)} className="bg-black text-white px-3 py-2 text-xs disabled:opacity-40" onClick={()=>variant&&addToCart(item.id,variant.id,variant.size,variant.color)}>Add available option</button><button className="border border-black/20 px-3 py-2 text-xs" onClick={()=>toggleWishlist(item.id)}>Remove</button></div></div>})}</div>:<div className="py-20 text-center"><p className="text-black/55 mb-6">Your wishlist is empty.</p><Link to="/store/shop" className="bg-black text-white px-8 py-4 inline-block">Explore the collection</Link></div>}</main><StoreFooter/></div>;
}
