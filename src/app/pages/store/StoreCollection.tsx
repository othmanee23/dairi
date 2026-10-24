import { Link, useParams } from 'react-router';
import { StoreHeader } from '../../components/store/StoreHeader';
import { StoreFooter } from '../../components/store/StoreFooter';
import { useApp } from '../../context/AppContext';
import { withCustomerPrice, customerPriceLabel } from '../../data/storeProducts';
import { usePageSeo } from '../../lib/seo';

export function StoreCollection() {
  const { id } = useParams();
  const { collections, products, customerAccount } = useApp();
  const wholesale = customerAccount?.wholesaleStatus === 'approved';
  const collection = collections.find(item => item.id === id);
  usePageSeo({ title: collection ? `${collection.name} | DAIRI` : 'Collection | DAIRI', description: collection?.description || 'Explore the latest DAIRI fashion collection and available pieces.', path: `/store/collections/${id ?? ''}`, image: collection?.image });
  const items = collection ? products.filter(p => p.collection === collection.name && p.status === 'published' && p.showOnWebsite).map(product => withCustomerPrice(product, wholesale)) : [];
  return <div className="store-page min-h-screen bg-white" style={{fontFamily:'Inter, sans-serif'}}><StoreHeader/><main><section className="px-6 lg:px-10 py-14 border-b border-black/10"><p className="text-xs uppercase tracking-[.22em] text-black/45 mb-4">{collection?.season ?? 'DAIRI collection'}</p><h1 className="text-4xl mb-4">{collection?.name ?? 'Collection not found'}</h1><p className="max-w-2xl text-black/60">{collection?.description ?? 'This collection is no longer available.'}</p></section>{items.length ? <section className="px-6 lg:px-10 py-12 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">{items.map(item=><Link key={item.id} to={`/store/products/${item.id}`} className="store-card"><img src={item.image} alt={item.name} className="aspect-[4/5] w-full object-cover object-top bg-[#f6f6f6] mb-4"/><p className="text-sm font-medium">{item.name}</p><p className="text-sm mt-1">{customerPriceLabel(item, wholesale)}</p></Link>)}</section>:<section className="py-24 text-center"><p className="text-black/55 mb-6">There are no published pieces in this collection yet.</p><Link to="/store/shop" className="underline">Shop all pieces</Link></section>}</main><StoreFooter/></div>;
}
