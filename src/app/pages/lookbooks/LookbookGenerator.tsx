import { useEffect, useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { useNavigate, useSearchParams } from 'react-router';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Checkbox } from '../../components/ui/checkbox';
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
import { Lookbook, LookbookSection, Product } from '../../types';
import dairiLogo from '../../../imports/dairi-logo.svg';
import { readOptimizedImage } from '../../utils/image';

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
      ref={(node) => { if (node) drag(drop(node)); }}
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
  const { products, collections, subcollections, addLookbook, settings, catalogLoadStatus } = useApp();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [lookbookName, setLookbookName] = useState('');
  const [coverTitle, setCoverTitle] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [selectedCollectionIds, setSelectedCollectionIds] = useState<string[]>([]);
  const [selectedSubcollectionIds, setSelectedSubcollectionIds] = useState<string[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [selectionInitialized, setSelectionInitialized] = useState(false);
  const [isCoverDragActive, setIsCoverDragActive] = useState(false);

  const parentCollectionId = (product: Product) => product.collectionId || collections.find(collection => collection.name === product.collection)?.id || '';
  const collectionProducts = (collectionId: string) => products.filter(product => parentCollectionId(product) === collectionId);
  const filteredProducts = useMemo(() => products.filter(product => {
    const parentId = product.collectionId || collections.find(collection => collection.name === product.collection)?.id || '';
    return product.subcollectionId ? selectedSubcollectionIds.includes(product.subcollectionId) : selectedCollectionIds.includes(parentId);
  }), [products, collections, selectedCollectionIds, selectedSubcollectionIds]);

  useEffect(() => {
    if (selectionInitialized || catalogLoadStatus === 'loading') return;
    const requestedCollection = searchParams.get('collection');
    const collection = requestedCollection ? collections.find(item => item.id === requestedCollection || item.name === requestedCollection) : undefined;
    if (collection) {
      const children = subcollections.filter(item => item.collectionId === collection.id);
      setSelectedCollectionIds([collection.id]);
      setSelectedSubcollectionIds(children.map(item => item.id));
      setSelectedProducts(collectionProducts(collection.id).map(product => product.id));
      setLookbookName(collection.name);
      setCoverTitle(collection.name);
      setCoverImage(collection.image || '');
    }
    setSelectionInitialized(true);
  }, [catalogLoadStatus, collections, searchParams, selectedCollectionIds.length, selectionInitialized, subcollections, products]);

  const toggleCollection = (collectionId: string) => {
    const children = subcollections.filter(item => item.collectionId === collectionId);
    const currentlySelected = children.length ? children.every(item => selectedSubcollectionIds.includes(item.id)) : selectedCollectionIds.includes(collectionId);
    const productIds = collectionProducts(collectionId).map(product => product.id);
    if (currentlySelected) {
      setSelectedCollectionIds(current => current.filter(id => id !== collectionId));
      setSelectedSubcollectionIds(current => current.filter(id => !children.some(item => item.id === id)));
      setSelectedProducts(current => current.filter(id => !productIds.includes(id)));
      return;
    }
    setSelectedCollectionIds(current => current.includes(collectionId) ? current : [...current, collectionId]);
    setSelectedSubcollectionIds(current => [...new Set([...current, ...children.map(item => item.id)])]);
    setSelectedProducts(current => [...new Set([...current, ...productIds])]);
    const collection = collections.find(item => item.id === collectionId);
    if (!coverImage.trim() && collection?.image) setCoverImage(collection.image);
  };

  const toggleSubcollection = (subcollectionId: string) => {
    const subcollection = subcollections.find(item => item.id === subcollectionId);
    if (!subcollection) return;
    const siblings = subcollections.filter(item => item.collectionId === subcollection.collectionId);
    const productIds = products.filter(product => product.subcollectionId === subcollectionId).map(product => product.id);
    const removing = selectedSubcollectionIds.includes(subcollectionId);
    setSelectedSubcollectionIds(current => removing ? current.filter(id => id !== subcollectionId) : [...current, subcollectionId]);
    const nextIds = new Set(selectedSubcollectionIds);
    if (removing) nextIds.delete(subcollectionId); else nextIds.add(subcollectionId);
    const allSelected = siblings.length > 0 && siblings.every(item => nextIds.has(item.id));
    setSelectedCollectionIds(current => allSelected ? [...new Set([...current, subcollection.collectionId])] : current.filter(id => id !== subcollection.collectionId));
    setSelectedProducts(current => removing ? current.filter(id => !productIds.includes(id)) : [...new Set([...current, ...productIds])]);
  };

  const buildSections = (): LookbookSection[] => {
    const sections: LookbookSection[] = [];
    for (const collection of collections) {
      const children = subcollections.filter(item => item.collectionId === collection.id).sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
      for (const subcollection of children) {
        if (!selectedSubcollectionIds.includes(subcollection.id)) continue;
        const productIds = selectedProducts.filter(id => products.find(product => product.id === id)?.subcollectionId === subcollection.id);
        if (productIds.length) sections.push({ collectionId: collection.id, collectionName: collection.name, subcollectionId: subcollection.id, subcollectionName: subcollection.name, productIds });
      }
      if (selectedCollectionIds.includes(collection.id)) {
        const productIds = selectedProducts.filter(id => {
          const product = products.find(item => item.id === id);
          return product && parentCollectionId(product) === collection.id && !product.subcollectionId;
        });
        if (productIds.length) sections.push({ collectionId: collection.id, collectionName: collection.name, subcollectionName: children.length ? 'Unassigned products' : collection.name, productIds });
      }
    }
    return sections;
  };

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

    readOptimizedImage(file, 1600).then(image => { setCoverImage(image); toast.success('Cover image uploaded'); }).catch(error => toast.error(error instanceof Error ? error.message : 'Could not read selected image'));
  };

  const handleCoverDrop = (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsCoverDragActive(false);
    handleCoverImageUpload(event.dataTransfer.files?.[0]);
  };

  const handlePreview = async () => {
    const sections = buildSections();
    const productIds = sections.flatMap(section => section.productIds);
    if (productIds.length === 0) {
      toast.error('Please select at least one product');
      return;
    }

    const selectedCollectionNames = [...new Set(sections.map(section => section.collectionName))];
    const generatedName = lookbookName.trim() || selectedCollectionNames.join(' · ') || 'Untitled Lookbook';

    const lookbook: Lookbook = {
      id: Date.now().toString(),
      name: generatedName,
      createdAt: new Date().toISOString().split('T')[0],
      productIds,
      sections,
      layout: settings.defaultLayout,
      coverTitle: coverTitle.trim() || generatedName,
      coverImage: coverImage.trim() || undefined,
      format: settings.defaultFormat,
    };

    try {
      await addLookbook(lookbook);
      navigate(`/admin/lookbooks/${lookbook.id}/preview`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save lookbook');
    }
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
                  <div className="space-y-3">
                    <Input
                      id="coverImage"
                      value={coverImage.startsWith('data:') ? 'Uploaded from device' : coverImage}
                      onChange={(e) => setCoverImage(e.target.value)}
                      className="h-12 border-neutral-300 rounded-none"
                      placeholder="Paste image URL for the lookbook cover"
                    />
                    <label
                      onDragOver={(event) => { event.preventDefault(); setIsCoverDragActive(true); }}
                      onDragLeave={() => setIsCoverDragActive(false)}
                      onDrop={handleCoverDrop}
                      className={`flex min-h-24 cursor-pointer flex-col items-center justify-center gap-2 border border-dashed px-5 py-4 text-sm transition-colors ${isCoverDragActive ? 'border-black bg-neutral-100' : 'border-neutral-300 hover:border-black'}`}
                    >
                      <Upload className="h-5 w-5" />
                      <span>{isCoverDragActive ? 'Drop cover image here' : 'Drop an image here or choose a file'}</span>
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
                      The cover places your DAIRI logo and title above the image. The export uses your saved {settings.defaultFormat.toUpperCase()} format and {settings.defaultLayout} layout defaults.
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

            {/* PDF Format */}
            <div className="admin-panel p-6">
              <h2 className="text-lg mb-4 tracking-tight">PDF Format</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border-2 border-black bg-neutral-50 p-5">
                  <FileText className="w-8 h-8 mb-4" />
                  <h3 className="text-sm font-medium mb-1">{settings.defaultFormat.toUpperCase()} · {settings.defaultLayout}</h3>
                  <p className="text-xs text-neutral-600">This lookbook uses the format and layout saved in Settings.</p>
                </div>
                <div className="border border-neutral-200 p-5 flex flex-col justify-center">
                  <p className="text-sm text-neutral-600 leading-6">
                    To change defaults, update PDF Defaults in Settings before creating your lookbook.
                  </p>
                </div>
              </div>
            </div>

            {/* Product Selection */}
            <div className="admin-panel p-6">
              <div className="mb-5">
                <h2 className="text-lg tracking-tight">Choose collections and subcollections</h2>
                <p className="mt-1 text-sm text-neutral-600">Selected subcollections become lookbook sections. Each section starts on a new page and continues after every 9 products.</p>
              </div>
              <div className="mb-6 space-y-3">
                {collections.map(collection => {
                  const children = subcollections.filter(item => item.collectionId === collection.id).sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
                  const standaloneProducts = collectionProducts(collection.id).filter(product => !product.subcollectionId || !children.some(item => item.id === product.subcollectionId));
                  return <section key={collection.id} className="border border-neutral-200">
                    <label className="flex cursor-pointer items-center gap-3 bg-neutral-50 px-4 py-3">
                      <Checkbox checked={selectedCollectionIds.includes(collection.id)} onCheckedChange={() => toggleCollection(collection.id)} />
                      <span className="font-medium">{collection.name}</span>
                      <span className="ml-auto text-xs text-neutral-500">{collectionProducts(collection.id).length} products</span>
                    </label>
                    {(children.length > 0 || standaloneProducts.length > 0) && <div className="grid gap-x-6 gap-y-2 px-4 py-3 sm:grid-cols-2">
                      {children.map(subcollection => <label key={subcollection.id} className="flex cursor-pointer items-center gap-2 text-sm">
                        <Checkbox checked={selectedSubcollectionIds.includes(subcollection.id)} onCheckedChange={() => toggleSubcollection(subcollection.id)} />
                        <span>{subcollection.name}</span>
                        <span className="ml-auto text-xs text-neutral-500">{products.filter(product => product.subcollectionId === subcollection.id).length}</span>
                      </label>)}
                      {standaloneProducts.length > 0 && <p className="text-xs text-neutral-500 sm:col-span-2">{standaloneProducts.length} unassigned product{standaloneProducts.length === 1 ? '' : 's'} will be included when this collection is selected.</p>}
                    </div>}
                  </section>;
                })}
                {collections.length === 0 && <p className="border border-dashed border-neutral-300 p-5 text-sm text-neutral-600">Create a collection first, then choose which subcollections to include.</p>}
              </div>

              <div className="mb-3 flex items-baseline justify-between">
                <h3 className="text-base font-medium">Products in selected sections</h3>
                <span className="text-xs text-neutral-500">{filteredProducts.filter(product => selectedProducts.includes(product.id)).length} available</span>
              </div>
              <div className="grid grid-cols-3 gap-4 md:grid-cols-4">
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
              {filteredProducts.length === 0 && <p className="py-8 text-center text-sm text-neutral-500">Choose a collection or subcollection to see its products.</p>}
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
