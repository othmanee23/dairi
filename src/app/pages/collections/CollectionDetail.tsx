import { useState, type FormEvent } from 'react';
import { useApp } from '../../context/AppContext';
import { useParams, Link, useNavigate } from 'react-router';
import { Button } from '../../components/ui/button';
import { ArrowLeft, BookOpen, Pencil, Plus, Trash2 } from 'lucide-react';
import { ImageWithFallback } from '../../components/figma/ImageWithFallback';
import { toast } from 'sonner';
import { ProductForm } from '../products/ProductForm';

export function CollectionDetail() {
  const { id } = useParams();
  const { collections, products, subcollections, addSubcollection, deleteSubcollection, deleteCollection } = useApp();
  const navigate = useNavigate();
  const [subcollectionName, setSubcollectionName] = useState('');
  const [savingSubcollection, setSavingSubcollection] = useState(false);
  const [showProductFlow, setShowProductFlow] = useState(false);
  const [initialProductSubcollectionId, setInitialProductSubcollectionId] = useState('');

  const collection = collections.find(c => c.id === id);
  const collectionProducts = products.filter(p => p.collectionId === collection?.id || (!p.collectionId && p.collection === collection?.name));
  const collectionSubcollections = subcollections.filter(item => item.collectionId === collection?.id).sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));

  const handleDelete = async () => {
    try {
      await deleteCollection(collection.id);
      navigate('/admin/collections');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not delete collection');
    }
  };

  const handleAddSubcollection = async (event: FormEvent) => {
    event.preventDefault();
    const name = subcollectionName.trim();
    if (!name || !collection) return;
    setSavingSubcollection(true);
    try {
      await addSubcollection({ id: `subcollection-${crypto.randomUUID()}`, collectionId: collection.id, name, sortOrder: collectionSubcollections.length });
      setSubcollectionName('');
      toast.success('Subcollection created');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not create subcollection');
    } finally { setSavingSubcollection(false); }
  };

  const handleDeleteSubcollection = async (subcollectionId: string, name: string) => {
    if (!window.confirm(`Remove “${name}”? Its products will stay in this collection without a subcollection.`)) return;
    try { await deleteSubcollection(subcollectionId); toast.success('Subcollection removed'); }
    catch (error) { toast.error(error instanceof Error ? error.message : 'Could not remove subcollection'); }
  };

  const openProductFlow = (subcollectionId = '') => {
    setInitialProductSubcollectionId(subcollectionId);
    setShowProductFlow(true);
  };

  if (!collection) {
    return (
      <div className="admin-page p-8 lg:p-10">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-neutral-600">Collection not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page p-8 lg:p-10">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <Link
          to="/admin/collections"
          className="inline-flex items-center gap-2 text-sm text-neutral-600 hover:text-black mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to collections
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-12">
          <div>
            <div className="aspect-[4/5] bg-neutral-100 overflow-hidden">
              <ImageWithFallback
                src={collection.image}
                alt={collection.name}
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          <div className="flex flex-col justify-center">
            <div className="inline-block px-3 py-1 bg-neutral-100 text-xs uppercase tracking-wider mb-4 self-start">
              {collection.season}
            </div>
            <h1 className="text-5xl mb-4 tracking-tight">{collection.name}</h1>
            <p className="text-lg text-neutral-600 mb-8">
              {collection.description}
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="outline" onClick={() => navigate(`/admin/collections/${collection.id}/edit`)} className="rounded-none h-12 px-5"><Pencil className="w-4 h-4 mr-2" />Edit</Button>
              <Button
                onClick={() => navigate(`/admin/lookbooks?collection=${encodeURIComponent(collection.id)}`)}
                className="bg-black text-white hover:bg-neutral-800 rounded-none h-12 px-6"
              >
                <BookOpen className="w-4 h-4 mr-2" />
                Preview collection lookbook
              </Button>
              <Button variant="outline" onClick={() => openProductFlow()} className="rounded-none h-12 px-5"><Plus className="w-4 h-4 mr-2" />Add product</Button>
              <Button variant="outline" onClick={() => { if (window.confirm(`Delete ${collection.name}? Products will remain in the catalog without a collection.`)) void handleDelete(); }} className="rounded-none h-12 px-5 text-red-700"><Trash2 className="w-4 h-4 mr-2" />Delete</Button>
            </div>
            <p className="mt-4 text-sm text-neutral-600">{collectionProducts.length} products in this collection</p>
          </div>
        </div>

        <section className="mb-12 border-y border-neutral-200 py-6">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
            <div><h2 className="text-2xl tracking-tight">Subcollections</h2><p className="mt-1 text-sm text-neutral-600">These names appear as headings in the lookbook.</p></div>
          </div>
          <form onSubmit={handleAddSubcollection} className="flex max-w-xl gap-3">
            <input aria-label="New subcollection name" value={subcollectionName} onChange={event => setSubcollectionName(event.target.value)} maxLength={120} required placeholder="e.g. Knitwear" className="h-11 min-w-0 flex-1 border border-neutral-300 bg-white px-3 text-sm" />
            <Button type="submit" disabled={savingSubcollection} className="admin-button h-11 rounded-none bg-black px-5 text-white">{savingSubcollection ? 'Adding…' : 'Add subcollection'}</Button>
          </form>
          {collectionSubcollections.length > 0 && <div className="mt-5 flex flex-wrap gap-2">{collectionSubcollections.map(item => <span key={item.id} className="inline-flex items-center gap-2 border border-neutral-200 px-3 py-2 text-sm">{item.name}<button type="button" aria-label={`Remove ${item.name}`} onClick={() => void handleDeleteSubcollection(item.id, item.name)} className="text-neutral-400 hover:text-red-700"><Trash2 className="h-3.5 w-3.5" /></button></span>)}</div>}
        </section>

        {showProductFlow && <section className="mb-12 border border-neutral-200 bg-white p-5 sm:p-8" aria-label="Add product to collection">
          <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
            <div><p className="text-[10px] uppercase tracking-[3px] text-black/40">Add to {collection.name}</p><h2 className="mt-2 text-2xl tracking-tight">Create a product</h2><p className="mt-2 text-sm text-neutral-600">The collection is preselected. Choose a subcollection, then complete the product steps without leaving this page.</p></div>
            <Button type="button" variant="outline" onClick={() => setShowProductFlow(false)} className="h-10 rounded-none px-4">Close</Button>
          </div>
          <ProductForm
            embedded
            initialCollectionId={collection.id}
            initialSubcollectionId={initialProductSubcollectionId}
            onCancel={() => setShowProductFlow(false)}
            onSaved={() => { setShowProductFlow(false); setInitialProductSubcollectionId(''); }}
          />
        </section>}

        <div>
          <h2 className="text-2xl mb-6 tracking-tight">Products by subcollection</h2>
          {collectionSubcollections.map(subcollection => {
            const items = collectionProducts.filter(product => product.subcollectionId === subcollection.id);
            return <section key={subcollection.id} className="mb-10">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-lg font-medium">{subcollection.name}</h3><p className="text-xs text-neutral-500">{items.length} products</p></div><Button variant="outline" onClick={() => openProductFlow(subcollection.id)} className="h-10 rounded-none px-4"><Plus className="mr-2 h-4 w-4" />Add product</Button></div>
              <div className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4">{items.map(product => (
              <div
                key={product.id}
                className="group cursor-pointer"
                onClick={() => navigate(`/admin/products/${product.id}/edit`)}
              >
                <div className="aspect-[3/4] bg-neutral-100 mb-3 overflow-hidden">
                  <ImageWithFallback
                    src={product.images[0]}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <h3 className="text-sm mb-1 truncate">{product.name}</h3>
                <p className="text-sm text-neutral-600">${product.price}</p>
              </div>
              ))}</div>
            </section>;
          })}
          {collectionProducts.some(product => !product.subcollectionId || !collectionSubcollections.some(item => item.id === product.subcollectionId)) && <section className="mb-10"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-lg font-medium">Unassigned products</h3><p className="text-xs text-neutral-500">Products without a subcollection</p></div><Button variant="outline" onClick={() => openProductFlow()} className="h-10 rounded-none px-4"><Plus className="mr-2 h-4 w-4" />Add product</Button></div><div className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4">{collectionProducts.filter(product => !product.subcollectionId || !collectionSubcollections.some(item => item.id === product.subcollectionId)).map(product => <div key={product.id} className="group cursor-pointer" onClick={() => navigate(`/admin/products/${product.id}/edit`)}><div className="mb-3 aspect-[3/4] overflow-hidden bg-neutral-100"><ImageWithFallback src={product.images[0]} alt={product.name} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" /></div><h3 className="mb-1 truncate text-sm">{product.name}</h3><p className="text-sm text-neutral-600">${product.price}</p></div>)}</div></section>}
          {collectionProducts.length === 0 && <p className="border border-dashed border-neutral-300 p-8 text-sm text-neutral-600">No products yet. Create a subcollection above, then add products from its section to keep the lookbook organized.</p>}
        </div>
      </div>
    </div>
  );
}
