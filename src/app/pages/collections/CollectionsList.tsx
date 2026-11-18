import { useApp } from '../../context/AppContext';
import { useNavigate } from 'react-router';
import { Button } from '../../components/ui/button';
import { Plus, Layers } from 'lucide-react';
import { ImageWithFallback } from '../../components/figma/ImageWithFallback';

export function CollectionsList() {
  const { collections, products } = useApp();
  const navigate = useNavigate();

  return (
    <div className="admin-page p-8 lg:p-10">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="mb-2 text-[10px] uppercase tracking-[3px] text-black/40">Storefront</p>
            <h1 className="text-4xl mb-2 font-medium tracking-tight">Collections</h1>
            <p className="text-neutral-600">{collections.length} collections</p>
          </div>
          <Button
            onClick={() => navigate('/admin/collections/new')}
            className="admin-button bg-black text-white hover:bg-neutral-800 rounded-none h-12 px-6"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Collection
          </Button>
        </div>

        {/* Collections Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {collections.map((collection) => {
            const collectionProducts = products.filter(
              p => p.collectionId === collection.id || (!p.collectionId && p.collection === collection.name)
            );

            return (
              <div
                key={collection.id}
                className="admin-card group cursor-pointer p-3"
                onClick={() => navigate(`/admin/collections/${collection.id}`)}
              >
                <div className="aspect-[4/5] bg-neutral-100 mb-4 overflow-hidden">
                  <ImageWithFallback
                    src={collection.image}
                    alt={collection.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                
                <h2 className="text-xl mb-2 tracking-tight">{collection.name}</h2>
                <p className="text-sm text-neutral-600 mb-3">
                  {collection.description}
                </p>
                
                <div className="flex items-center gap-4 text-sm text-neutral-600">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4" />
                    <span>{collectionProducts.length} products</span>
                  </div>
                  <span>•</span>
                  <span>{collection.season}</span>
                </div>
              </div>
            );
          })}
        </div>

        {collections.length === 0 && (
          <div className="text-center py-16 text-neutral-600">
            <Layers className="w-12 h-12 mx-auto mb-4 text-neutral-400" />
            <p>No collections yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
