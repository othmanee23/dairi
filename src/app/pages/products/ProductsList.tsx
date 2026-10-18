import { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { useNavigate } from 'react-router';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Checkbox } from '../../components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { 
  Plus, 
  Search, 
  Grid3x3, 
  List, 
  Trash2,
  Eye,
  EyeOff 
} from 'lucide-react';
import { ImageWithFallback } from '../../components/figma/ImageWithFallback';
import { toast } from 'sonner';

type ViewMode = 'grid' | 'table';

export function ProductsList() {
  const { products, deleteProducts, updateProduct } = useApp();
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [collectionFilter, setCollectionFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);

  // Get unique categories and collections
  const categories = useMemo(() => {
    const cats = new Set(products.map(p => p.category));
    return ['all', ...Array.from(cats)];
  }, [products]);

  const collections = useMemo(() => {
    const cols = new Set(products.map(p => p.collection));
    return ['all', ...Array.from(cols)];
  }, [products]);

  // Filter products
  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter;
      const matchesCollection = collectionFilter === 'all' || product.collection === collectionFilter;
      const matchesStatus = statusFilter === 'all' || product.status === statusFilter;
      
      return matchesSearch && matchesCategory && matchesCollection && matchesStatus;
    });
  }, [products, searchQuery, categoryFilter, collectionFilter, statusFilter]);

  const handleSelectAll = () => {
    if (selectedProducts.length === filteredProducts.length) {
      setSelectedProducts([]);
    } else {
      setSelectedProducts(filteredProducts.map(p => p.id));
    }
  };

  const handleSelectProduct = (id: string) => {
    setSelectedProducts(prev =>
      prev.includes(id) ? prev.filter(pid => pid !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = () => {
    if (window.confirm(`Delete ${selectedProducts.length} products?`)) {
      deleteProducts(selectedProducts);
      setSelectedProducts([]);
      toast.success(`${selectedProducts.length} products deleted`);
    }
  };

  const handleBulkPublish = () => {
    selectedProducts.forEach(id => {
      updateProduct(id, { status: 'published', showOnWebsite: true });
    });
    setSelectedProducts([]);
    toast.success(`${selectedProducts.length} products published`);
  };

  return (
    <div className="admin-page p-8 lg:p-10">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="mb-2 text-[10px] uppercase tracking-[3px] text-black/40">Inventory</p>
            <h1 className="text-4xl mb-2 font-medium tracking-tight">Products</h1>
            <p className="text-neutral-600">{filteredProducts.length} products</p>
          </div>
          <Button
            onClick={() => navigate('/products/new')}
            className="admin-button bg-black text-white hover:bg-neutral-800 rounded-none h-12 px-6"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Product
          </Button>
        </div>

        {/* Filters and Search */}
        <div className="mb-8 space-y-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-neutral-400" />
              <Input
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-12 border-neutral-300 rounded-none"
              />
            </div>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full lg:w-48 h-12 border-neutral-300 rounded-none">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat}>
                    {cat === 'all' ? 'All Categories' : cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={collectionFilter} onValueChange={setCollectionFilter}>
              <SelectTrigger className="w-full lg:w-48 h-12 border-neutral-300 rounded-none">
                <SelectValue placeholder="Collection" />
              </SelectTrigger>
              <SelectContent>
                {collections.map(col => (
                  <SelectItem key={col} value={col}>
                    {col === 'all' ? 'All Collections' : col}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full lg:w-48 h-12 border-neutral-300 rounded-none">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {selectedProducts.length > 0 && (
                <>
                  <span className="text-sm text-neutral-600">
                    {selectedProducts.length} selected
                  </span>
                  <Button
                    onClick={handleBulkPublish}
                    variant="outline"
                    size="sm"
                    className="rounded-none"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Publish
                  </Button>
                  <Button
                    onClick={handleBulkDelete}
                    variant="outline"
                    size="sm"
                    className="rounded-none text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </Button>
                </>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="rounded-none"
              >
                <Grid3x3 className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'table' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('table')}
                className="rounded-none"
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Grid View */}
        {viewMode === 'grid' && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredProducts.map((product) => (
              <div key={product.id} className="admin-card group relative p-3">
                <div
                  className="cursor-pointer"
                  onClick={() => navigate(`/products/${product.id}/edit`)}
                >
                  <div className="aspect-[3/4] bg-neutral-100 mb-3 overflow-hidden relative">
                    <ImageWithFallback
                      src={product.images[0]}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-3 right-3">
                      <Checkbox
                        checked={selectedProducts.includes(product.id)}
                        onCheckedChange={() => handleSelectProduct(product.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="bg-white"
                      />
                    </div>
                  </div>
                  <h3 className="text-sm mb-1 truncate">{product.name}</h3>
                  <p className="text-sm text-neutral-600 mb-2">${product.price}</p>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs px-2 py-1 ${
                        product.status === 'published'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-orange-100 text-orange-800'
                      }`}
                    >
                      {product.status}
                    </span>
                    {product.showOnWebsite && (
                      <Eye className="w-3 h-3 text-green-600" />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Table View */}
        {viewMode === 'table' && (
          <div className="border border-neutral-200">
            <table className="w-full">
              <thead className="bg-neutral-50 border-b border-neutral-200">
                <tr>
                  <th className="p-4 text-left">
                    <Checkbox
                      checked={selectedProducts.length === filteredProducts.length && filteredProducts.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </th>
                  <th className="p-4 text-left text-xs uppercase tracking-wider text-neutral-600">
                    Product
                  </th>
                  <th className="p-4 text-left text-xs uppercase tracking-wider text-neutral-600">
                    Price
                  </th>
                  <th className="p-4 text-left text-xs uppercase tracking-wider text-neutral-600">
                    Category
                  </th>
                  <th className="p-4 text-left text-xs uppercase tracking-wider text-neutral-600">
                    Collection
                  </th>
                  <th className="p-4 text-left text-xs uppercase tracking-wider text-neutral-600">
                    Status
                  </th>
                  <th className="p-4 text-left text-xs uppercase tracking-wider text-neutral-600">
                    Website
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {filteredProducts.map((product) => (
                  <tr
                    key={product.id}
                    className="hover:bg-neutral-50 cursor-pointer"
                    onClick={() => navigate(`/products/${product.id}/edit`)}
                  >
                    <td className="p-4" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedProducts.includes(product.id)}
                        onCheckedChange={() => handleSelectProduct(product.id)}
                      />
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-16 bg-neutral-100 flex-shrink-0">
                          <ImageWithFallback
                            src={product.images[0]}
                            alt={product.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <span className="text-sm">{product.name}</span>
                      </div>
                    </td>
                    <td className="p-4 text-sm">${product.price}</td>
                    <td className="p-4 text-sm text-neutral-600">{product.category}</td>
                    <td className="p-4 text-sm text-neutral-600">{product.collection}</td>
                    <td className="p-4">
                      <span
                        className={`text-xs px-2 py-1 inline-block ${
                          product.status === 'published'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-orange-100 text-orange-800'
                        }`}
                      >
                        {product.status}
                      </span>
                    </td>
                    <td className="p-4">
                      {product.showOnWebsite ? (
                        <Eye className="w-4 h-4 text-green-600" />
                      ) : (
                        <EyeOff className="w-4 h-4 text-neutral-400" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {filteredProducts.length === 0 && (
          <div className="text-center py-16 text-neutral-600">
            <Package className="w-12 h-12 mx-auto mb-4 text-neutral-400" />
            <p>No products found</p>
          </div>
        )}
      </div>
    </div>
  );
}
