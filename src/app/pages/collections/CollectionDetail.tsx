import { useApp } from '../../context/AppContext';
import { useParams, Link, useNavigate } from 'react-router';
import { Button } from '../../components/ui/button';
import { ArrowLeft, BookOpen, Pencil, Trash2 } from 'lucide-react';
import { ImageWithFallback } from '../../components/figma/ImageWithFallback';
import { toast } from 'sonner';

export function CollectionDetail() {
  const { id } = useParams();
  const { collections, products, deleteCollection } = useApp();
  const navigate = useNavigate();

  const collection = collections.find(c => c.id === id);
  const collectionProducts = products.filter(
    p => p.collection === collection?.name
  );

  const handleDelete = async () => {
    try {
      await deleteCollection(collection.id);
      navigate('/admin/collections');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not delete collection');
    }
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
            <div className="flex items-center gap-4">
              <Button variant="outline" onClick={() => navigate(`/admin/collections/${collection.id}/edit`)} className="rounded-none h-12 px-5"><Pencil className="w-4 h-4 mr-2" />Edit</Button>
              <Button
                onClick={() => navigate('/admin/lookbooks')}
                className="bg-black text-white hover:bg-neutral-800 rounded-none h-12 px-6"
              >
                <BookOpen className="w-4 h-4 mr-2" />
                Create Lookbook
              </Button>
              <Button variant="outline" onClick={() => { if (window.confirm(`Delete ${collection.name}? Products will remain in the catalog without a collection.`)) void handleDelete(); }} className="rounded-none h-12 px-5 text-red-700"><Trash2 className="w-4 h-4 mr-2" />Delete</Button>
              <p className="text-sm text-neutral-600">
                {collectionProducts.length} products in this collection
              </p>
            </div>
          </div>
        </div>

        {/* Products Grid */}
        <div>
          <h2 className="text-2xl mb-6 tracking-tight">Products</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {collectionProducts.map((product) => (
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
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
