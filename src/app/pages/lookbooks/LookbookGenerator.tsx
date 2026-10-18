import { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { useNavigate } from 'react-router';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Checkbox } from '../../components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { 
  Eye,
  FileText,
  GripVertical,
  Image,
  Upload,
  X
} from 'lucide-react';
import { ImageWithFallback } from '../../components/figma/ImageWithFallback';
import { toast } from 'sonner';
import { Lookbook } from '../../types';
import dairiLogo from '../../../imports/dairi-logo.svg';

const ItemType = {
  PRODUCT: 'product',
};

interface DraggableProductProps {
  productId: string;
  index: number;
  moveProduct: (dragIndex: number, hoverIndex: number) => void;
  removeProduct: (id: string) => void;
}

function DraggableProduct({ productId, index, moveProduct, removeProduct }: DraggableProductProps) {
  const { products } = useApp();
  const product = products.find(p => p.id === productId);

  const [{ isDragging }, drag] = useDrag({
    type: ItemType.PRODUCT,
    item: { index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [, drop] = useDrop({
    accept: ItemType.PRODUCT,
    hover: (item: { index: number }) => {
      if (item.index !== index) {
        moveProduct(item.index, index);
        item.index = index;
      }
    },
  });

  if (!product) return null;

  return (
    <div
      ref={(node) => drag(drop(node))}
      className={`admin-card flex items-center gap-3 p-3 cursor-move ${
        isDragging ? 'opacity-50' : ''
      }`}
    >
      <GripVertical className="w-4 h-4 text-neutral-400 flex-shrink-0" />
      <div className="w-12 h-16 bg-neutral-100 flex-shrink-0">
        <ImageWithFallback
          src={product.images[0]}
          alt={product.name}
          className="w-full h-full object-cover"
        />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm truncate">{product.name}</p>
        <p className="text-xs text-neutral-600">${product.price}</p>
      </div>
      <button
        onClick={() => removeProduct(productId)}
        className="text-neutral-400 hover:text-black flex-shrink-0"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

function LookbookGeneratorContent() {
  const { products, collections, addLookbook } = useApp();
  const navigate = useNavigate();

  const [lookbookName, setLookbookName] = useState('');
  const [coverTitle, setCoverTitle] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [collectionFilter, setCollectionFilter] = useState('all');
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);

  const filteredProducts = useMemo(() => {
    if (collectionFilter === 'all') return products;
    return products.filter(p => p.collection === collectionFilter);
  }, [products, collectionFilter]);

  const toggleProduct = (id: string) => {
    setSelectedProducts(prev =>
      prev.includes(id) ? prev.filter(pid => pid !== id) : [...prev, id]
    );
  };

  const moveProduct = (dragIndex: number, hoverIndex: number) => {
    const draggedProduct = selectedProducts[dragIndex];
    const newProducts = [...selectedProducts];
    newProducts.splice(dragIndex, 1);
    newProducts.splice(hoverIndex, 0, draggedProduct);
    setSelectedProducts(newProducts);
  };

  const removeProduct = (id: string) => {
    setSelectedProducts(prev => prev.filter(pid => pid !== id));
  };

  const handleCoverImageUpload = (file: File | undefined) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setCoverImage(reader.result);
        toast.success('Cover image uploaded');
      }
    };
    reader.onerror = () => {
      toast.error('Could not read the selected image');
    };
    reader.readAsDataURL(file);
  };

  const handlePreview = () => {
    if (selectedProducts.length === 0) {
      toast.error('Please select at least one product');
      return;
    }

    const lookbook: Lookbook = {
      id: Date.now().toString(),
      name: lookbookName || 'Untitled Lookbook',
      createdAt: new Date().toISOString().split('T')[0],
      productIds: selectedProducts,
      layout: 'editorial',
      coverTitle: coverTitle || lookbookName || 'Untitled',
      coverImage: coverImage.trim() || undefined,
      format: 'a4',
    };

    addLookbook(lookbook);
    navigate(`/lookbooks/${lookbook.id}/preview`);
  };

  return (
    <div className="admin-page p-8 lg:p-10">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <p className="mb-2 text-[10px] uppercase tracking-[3px] text-black/40">Editorial Tools</p>
          <h1 className="text-4xl mb-2 font-medium tracking-tight">Lookbook Generator</h1>
          <p className="text-neutral-600">Create professional PDF lookbooks</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Configuration */}
          <div className="lg:col-span-2 space-y-8">
            {/* Basic Info */}
            <div className="admin-panel p-6">
              <h2 className="text-lg mb-4 tracking-tight">Lookbook Details</h2>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="lookbookName" className="text-sm uppercase tracking-wider text-neutral-600 mb-2 block">
                    Lookbook Name
                  </Label>
                  <Input
                    id="lookbookName"
                    value={lookbookName}
                    onChange={(e) => setLookbookName(e.target.value)}
                    className="h-12 border-neutral-300 rounded-none"
                    placeholder="e.g. Summer Collection 2026"
                  />
                </div>
                <div>
                  <Label htmlFor="coverTitle" className="text-sm uppercase tracking-wider text-neutral-600 mb-2 block">
                    Cover Title
                  </Label>
                  <Input
                    id="coverTitle"
                    value={coverTitle}
                    onChange={(e) => setCoverTitle(e.target.value)}
                    className="h-12 border-neutral-300 rounded-none"
                    placeholder="e.g. Summer 2026"
                  />
                </div>
                <div>
                  <Label htmlFor="coverImage" className="text-sm uppercase tracking-wider text-neutral-600 mb-2 block">
                    Cover Image
                  </Label>
                  <div className="flex flex-col gap-3 md:flex-row">
                    <Input
                      id="coverImage"
                      value={coverImage.startsWith('data:') ? 'Uploaded from device' : coverImage}
                      onChange={(e) => setCoverImage(e.target.value)}
                      className="h-12 border-neutral-300 rounded-none"
                      placeholder="Paste image URL for the lookbook cover"
                    />
                    <label className="admin-button inline-flex h-12 cursor-pointer items-center justify-center gap-2 border border-black bg-black px-5 text-sm text-white hover:bg-neutral-800">
                      <Upload className="h-4 w-4" />
                      Upload from device
                      <input
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        onChange={(event) => {
                          handleCoverImageUpload(event.target.files?.[0]);
                          event.target.value = '';
                        }}
                      />
                    </label>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] gap-4 items-stretch">
                  <div className="lookbook-cover-mini">
                    <div className="lookbook-cover-mini-masthead">
                      <img src={dairiLogo} alt="DAIRI" />
                      <span>{coverTitle || lookbookName || 'Collection title'}</span>
                    </div>
                    <div className="lookbook-cover-mini-image">
                      {coverImage.trim() ? (
                        <ImageWithFallback
                          src={coverImage.trim()}
                          alt="Lookbook cover preview"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="lookbook-cover-mini-placeholder">
                          <Image className="w-6 h-6 mb-2" />
                          <span>Add cover image</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="border border-neutral-200 bg-neutral-50 p-5 flex flex-col justify-center">
                    <p className="text-sm font-medium mb-2">Cover page</p>
                    <p className="text-sm text-neutral-600 leading-6">
                      The cover places your DAIRI logo and title above the image. Every PDF includes this cover, followed by A4 catalog pages with 9 numbered products and prices.
                    </p>
                    {coverImage.trim() && (
                      <button
                        type="button"
                        onClick={() => setCoverImage('')}
                        className="mt-5 inline-flex w-fit text-sm underline underline-offset-4 hover:text-neutral-500"
                      >
                        Remove image
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Fixed PDF Format */}
            <div className="admin-panel p-6">
              <h2 className="text-lg mb-4 tracking-tight">PDF Format</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border-2 border-black bg-neutral-50 p-5">
                  <FileText className="w-8 h-8 mb-4" />
                  <h3 className="text-sm font-medium mb-1">A4 Catalog Layout</h3>
                  <p className="text-xs text-neutral-600">210 × 297 mm · 3 columns × 3 rows · 9 products per page</p>
                </div>
                <div className="border border-neutral-200 p-5 flex flex-col justify-center">
                  <p className="text-sm text-neutral-600 leading-6">
                    Layout and page format are fixed so every generated lookbook matches the approved catalog design.
                  </p>
                </div>
              </div>
            </div>

            {/* Product Selection */}
            <div className="admin-panel p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg tracking-tight">Select Products</h2>
                <Select value={collectionFilter} onValueChange={setCollectionFilter}>
                  <SelectTrigger className="w-48 border-neutral-300 rounded-none">
                    <SelectValue placeholder="Filter by collection" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Collections</SelectItem>
                    {collections.map(col => (
                      <SelectItem key={col.id} value={col.name}>
                        {col.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-3 md:grid-cols-4 gap-4">
                {filteredProducts.map((product) => {
                  const isSelected = selectedProducts.includes(product.id);
                  return (
                    <div
                      key={product.id}
                      className="relative cursor-pointer group"
                      onClick={() => toggleProduct(product.id)}
                    >
                      <div className={`aspect-[3/4] bg-neutral-100 overflow-hidden border-2 transition-all ${
                        isSelected ? 'border-black' : 'border-transparent'
                      }`}>
                        <ImageWithFallback
                          src={product.images[0]}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-2 right-2">
                          <Checkbox checked={isSelected} className="bg-white" />
                        </div>
                      </div>
                      <p className="text-xs mt-2 truncate">{product.name}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column - Selected Products */}
          <div className="lg:col-span-1">
            <div className="admin-panel p-6 sticky top-8">
              <h2 className="text-lg mb-4 tracking-tight">
                Selected Products ({selectedProducts.length})
              </h2>

              {selectedProducts.length > 0 ? (
                <>
                  <div className="space-y-2 mb-6 max-h-96 overflow-y-auto">
                    {selectedProducts.map((productId, index) => (
                      <DraggableProduct
                        key={productId}
                        productId={productId}
                        index={index}
                        moveProduct={moveProduct}
                        removeProduct={removeProduct}
                      />
                    ))}
                  </div>

                  <div className="space-y-3">
                    <Button
                      onClick={handlePreview}
                      className="admin-button w-full bg-black text-white hover:bg-neutral-800 rounded-none h-12"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Preview & Export
                    </Button>
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-neutral-600">
                  <p className="text-sm">No products selected</p>
                  <p className="text-xs mt-2">Click products to add them</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function LookbookGenerator() {
  return (
    <DndProvider backend={HTML5Backend}>
      <LookbookGeneratorContent />
    </DndProvider>
  );
}
