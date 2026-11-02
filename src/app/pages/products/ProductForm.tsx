import { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useNavigate, useParams, Link } from 'react-router';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Switch } from '../../components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { ArrowLeft, Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import { Product, ProductVariant } from '../../types';
import { readOptimizedImage } from '../../utils/image';
import { supabase } from '../../lib/supabase';
import defaultProductImage from '../../../imports/image-1.webp';

export function ProductForm() {
  const { id } = useParams();
  const { products, collections, addProduct, updateProduct, catalogLoadStatus } = useApp();
  const navigate = useNavigate();
  const isEditing = !!id;

  const existingProduct = products.find(p => p.id === id);

  const [formData, setFormData] = useState({
    name: '',
    styleNumber: '',
    price: '',
    category: '',
    collection: '',
    description: '',
    tags: '',
    status: 'draft' as 'published' | 'draft',
    showOnWebsite: false,
    images: [] as string[],
    material: '',
    fit: '',
    care: '',
    details: '',
    variants: [{ id: crypto.randomUUID(), sku: '', color: '', colorHex: '#111111', size: '', inventoryQuantity: 0, isActive: true }] as ProductVariant[],
  });
  const [uploadingImages, setUploadingImages] = useState(false);

  useEffect(() => {
    if (existingProduct) {
      setFormData({
        name: existingProduct.name,
        styleNumber: existingProduct.styleNumber ?? '',
        price: existingProduct.price.toString(),
        category: existingProduct.category,
        collection: existingProduct.collection,
        description: existingProduct.description,
        tags: (existingProduct.tags ?? []).join(', '),
        status: existingProduct.status,
        showOnWebsite: existingProduct.showOnWebsite,
        images: existingProduct.images ?? [],
        material: existingProduct.material ?? '',
        fit: existingProduct.fit ?? '',
        care: existingProduct.care ?? '',
        details: (existingProduct.details ?? []).join(', '),
        variants: existingProduct.variants?.length ? existingProduct.variants : (existingProduct.sizes ?? []).map(size => ({ id: crypto.randomUUID(), sku: '', color: existingProduct.color ?? '', colorHex: existingProduct.colorHex, size, inventoryQuantity: 0, isActive: true })),
      });
    }
  }, [existingProduct]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const styleNumber = formData.styleNumber.trim();
    const variants = formData.variants.map(variant => ({
      ...variant,
      sku: variant.sku.trim() || `${styleNumber}-${variant.color}-${variant.size}`.replace(/[^a-zA-Z0-9-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').toUpperCase(),
      color: variant.color.trim(),
      size: variant.size.trim(),
    }));
    if (!styleNumber) { toast.error('Add a style number before saving.'); return; }
    if (!variants.length || variants.some(variant => !variant.size || !variant.sku || !Number.isInteger(variant.inventoryQuantity) || variant.inventoryQuantity < 0)) { toast.error('Add at least one valid size, SKU, and stock quantity.'); return; }
    if (new Set(variants.map(variant => variant.sku.toLowerCase())).size !== variants.length) { toast.error('Each variant needs a unique SKU.'); return; }
    if (new Set(variants.map(variant => `${variant.color.toLowerCase()}|${variant.size.toLowerCase()}`)).size !== variants.length) { toast.error('Each color and size combination must be unique.'); return; }

    const product: Product = {
      id: isEditing ? id! : `dairi-${Date.now().toString(36)}`,
      styleNumber,
      name: formData.name,
      price: parseFloat(formData.price),
      category: formData.category,
      collection: formData.collection,
      description: formData.description,
      tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
      status: formData.status,
      showOnWebsite: formData.showOnWebsite,
      images: formData.images.length > 0 ? formData.images : [defaultProductImage],
      createdAt: existingProduct?.createdAt || new Date().toISOString().split('T')[0],
      color: variants[0]?.color ?? '',
      colorHex: variants[0]?.colorHex ?? '#111111',
      details: formData.details.split(',').map(value => value.trim()).filter(Boolean),
      material: formData.material,
      fit: formData.fit,
      care: formData.care,
      sizes: Array.from(new Set<string>(variants.map(variant => variant.size))),
      variants,
    };

    try {
      if (isEditing) {
        await updateProduct(id!, product);
        toast.success('Product updated successfully');
      } else {
        await addProduct(product);
        toast.success('Product created successfully');
      }
      navigate('/admin/products');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save product');
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).filter(file => file.type.startsWith('image/')).slice(0, Math.max(0, 6 - formData.images.length));
    if (!files.length) { e.target.value = ''; return; }
    if (!supabase) { toast.error('Connect the Supabase backend before uploading product images.'); e.target.value = ''; return; }
    setUploadingImages(true);
    const uploadedPaths: string[] = [];
    try {
      const images: string[] = [];
      for (const file of files) {
        const optimized = await readOptimizedImage(file);
        const blob = await (await fetch(optimized)).blob();
        const path = `products/${crypto.randomUUID()}.jpg`;
        const { error } = await supabase!.storage.from('product-media').upload(path, blob, { contentType: 'image/jpeg', cacheControl: '31536000', upsert: false });
        if (error) throw error;
        uploadedPaths.push(path);
        images.push(supabase!.storage.from('product-media').getPublicUrl(path).data.publicUrl);
      }
      setFormData(prev => ({ ...prev, images: [...prev.images, ...images].slice(0, 6) }));
      toast.success(`${images.length} image${images.length === 1 ? '' : 's'} uploaded`);
    }
    catch (error) {
      if (uploadedPaths.length) await supabase.storage.from('product-media').remove(uploadedPaths);
      toast.error(error instanceof Error ? error.message : 'Could not upload image');
    }
    finally { setUploadingImages(false); e.target.value = ''; }
    e.target.value = '';
  };

  const removeImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  if (isEditing && !existingProduct && catalogLoadStatus === 'loading') {
    return <div className="admin-page p-8 lg:p-10"><div className="mx-auto max-w-4xl py-20 text-center text-sm text-neutral-600" role="status">Loading product…</div></div>;
  }

  if (isEditing && !existingProduct) {
    return <div className="admin-page p-8 lg:p-10"><div className="mx-auto max-w-4xl py-16"><Link to="/admin/products" className="text-sm underline">← Back to products</Link><h1 className="mt-6 text-3xl">Product not found</h1><p className="mt-3 text-sm text-neutral-600">This product may have been removed or is unavailable in the current catalog.</p></div></div>;
  }

  return (
    <div className="admin-page p-8 lg:p-10">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <Link
          to="/admin/products"
          className="inline-flex items-center gap-2 text-sm text-neutral-600 hover:text-black mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to products
        </Link>

        <div className="mb-8">
          <h1 className="text-4xl mb-2 tracking-tight">
            {isEditing ? 'Edit Product' : 'Add New Product'}
          </h1>
          <p className="text-neutral-600">
            {isEditing ? 'Update product details' : 'Create a new product'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Images */}
          <div>
            <Label className="text-sm uppercase tracking-wider text-neutral-600 mb-4 block">
              Product Images
            </Label>
            <div className="grid grid-cols-4 gap-4 mb-4">
              {formData.images.map((image, index) => (
                <div key={index} className="relative aspect-[3/4] bg-neutral-100">
                  <img
                    src={image}
                    alt={`Product ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute top-2 right-2 bg-black text-white p-1 rounded-full hover:bg-neutral-800"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <label className="aspect-[3/4] border-2 border-dashed border-neutral-300 hover:border-neutral-400 cursor-pointer flex items-center justify-center transition-colors">
                <div className="text-center">
                  <Upload className="w-8 h-8 mx-auto mb-2 text-neutral-400" />
                  <span className="text-xs text-neutral-600">{uploadingImages ? 'Uploading…' : 'Upload Image'}</span>
                </div>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={uploadingImages || formData.images.length >= 6}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="name" className="text-sm uppercase tracking-wider text-neutral-600 mb-2 block">
                Product Name *
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                required
                className="h-12 border-neutral-300 rounded-none"
                placeholder="e.g. Structured Midi Dress"
              />
            </div>

            <div>
              <Label htmlFor="price" className="text-sm uppercase tracking-wider text-neutral-600 mb-2 block">
                Price ($) *
              </Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0.01"
                value={formData.price}
                onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                required
                className="h-12 border-neutral-300 rounded-none"
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="category" className="text-sm uppercase tracking-wider text-neutral-600 mb-2 block">
                Category *
              </Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
              >
                <SelectTrigger className="h-12 border-neutral-300 rounded-none">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Women's Tops">Women's Tops</SelectItem>
                  <SelectItem value="Dresses">Dresses</SelectItem>
                  <SelectItem value="Pants or skirts">Pants or skirts</SelectItem>
                  <SelectItem value="Jackets or coats">Jackets or coats</SelectItem>
                  <SelectItem value="Scarves or shawls">Scarves or shawls</SelectItem>
                  <SelectItem value="Natural-Fiber Clothing">Natural-Fiber Clothing</SelectItem>
                  <SelectItem value="Handwoven Collection">Handwoven Collection</SelectItem>
                  <SelectItem value="Leather Belts">Leather Belts</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="collection" className="text-sm uppercase tracking-wider text-neutral-600 mb-2 block">
                Collection *
              </Label>
              <Select
                value={formData.collection}
                onValueChange={(value) => setFormData(prev => ({ ...prev, collection: value }))}
              >
                <SelectTrigger className="h-12 border-neutral-300 rounded-none">
                  <SelectValue placeholder="Select collection" />
                </SelectTrigger>
                <SelectContent>
                  {collections.filter(collection => collection.name?.trim()).map(collection => {
                    const name = collection.name.trim();
                    return <SelectItem key={collection.id} value={name}>{name}</SelectItem>;
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="styleNumber" className="text-sm uppercase tracking-wider text-neutral-600 mb-2 block">Style Number *</Label>
            <Input id="styleNumber" value={formData.styleNumber} onChange={e => setFormData(prev => ({ ...prev, styleNumber: e.target.value }))} required className="h-12 border-neutral-300 rounded-none" placeholder="e.g. DF-2601" />
          </div>

          <div className="border-t border-neutral-200 pt-8">
            <div className="flex items-end justify-between gap-4 mb-4"><div><h2 className="text-lg">Variants & inventory</h2><p className="text-sm text-neutral-600">Track stock separately for each color and size. New combinations start with zero stock.</p></div><Button type="button" variant="outline" onClick={() => setFormData(prev => ({ ...prev, variants: [...prev.variants, { id: crypto.randomUUID(), sku: '', color: '', colorHex: '#111111', size: '', inventoryQuantity: 0, isActive: true }] }))}>Add variant</Button></div>
            <div className="space-y-3">{formData.variants.map((variant, index) => <div key={variant.id} className="border border-neutral-200 p-4 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-[1.1fr_1fr_.6fr_1fr_.7fr_auto] gap-3 items-end">
                <div><Label>SKU *</Label><Input value={variant.sku} onChange={e => setFormData(prev => ({ ...prev, variants: prev.variants.map((item, i) => i === index ? { ...item, sku: e.target.value } : item) }))} placeholder="Auto from style, color & size" /></div>
                <div><Label>Color</Label><Input value={variant.color} onChange={e => setFormData(prev => ({ ...prev, variants: prev.variants.map((item, i) => i === index ? { ...item, color: e.target.value } : item) }))} placeholder="e.g. Indigo" /></div>
                <div><Label>Color swatch</Label><Input type="color" value={variant.colorHex ?? '#111111'} onChange={e => setFormData(prev => ({ ...prev, variants: prev.variants.map((item, i) => i === index ? { ...item, colorHex: e.target.value } : item) }))} className="h-10 p-1" /></div>
                <div><Label>Size *</Label><Input value={variant.size} onChange={e => setFormData(prev => ({ ...prev, variants: prev.variants.map((item, i) => i === index ? { ...item, size: e.target.value } : item) }))} required placeholder="One Size" /></div>
                <div><Label>In stock *</Label><Input type="number" min="0" step="1" value={variant.inventoryQuantity} onChange={e => setFormData(prev => ({ ...prev, variants: prev.variants.map((item, i) => i === index ? { ...item, inventoryQuantity: Number(e.target.value) } : item) }))} required /></div>
                <Button type="button" variant="ghost" aria-label={`Remove variant ${index + 1}`} disabled={formData.variants.length === 1} onClick={() => setFormData(prev => ({ ...prev, variants: prev.variants.filter((_, i) => i !== index) }))}>Remove</Button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><div><Label>Retail price override (optional)</Label><Input type="number" min="0" step="0.01" value={variant.retailPrice ?? ''} onChange={e => setFormData(prev => ({ ...prev, variants: prev.variants.map((item, i) => i === index ? { ...item, retailPrice: e.target.value === '' ? undefined : Number(e.target.value) } : item) }))} placeholder={`Use product price ($${formData.price || '0.00'})`} /></div><div><Label>Wholesale price (optional)</Label><Input type="number" min="0" step="0.01" value={variant.wholesalePrice ?? ''} onChange={e => setFormData(prev => ({ ...prev, variants: prev.variants.map((item, i) => i === index ? { ...item, wholesalePrice: e.target.value === '' ? undefined : Number(e.target.value) } : item) }))} placeholder="Set for approved wholesale accounts" /></div></div>
            </div>)}</div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div><Label htmlFor="material">Fabric / material</Label><Input id="material" value={formData.material} onChange={e => setFormData(prev => ({ ...prev, material: e.target.value }))} /></div>
            <div><Label htmlFor="fit">Fit</Label><Input id="fit" value={formData.fit} onChange={e => setFormData(prev => ({ ...prev, fit: e.target.value }))} /></div>
            <div><Label htmlFor="care">Care</Label><Input id="care" value={formData.care} onChange={e => setFormData(prev => ({ ...prev, care: e.target.value }))} /></div>
          </div>

          <div>
            <Label htmlFor="description" className="text-sm uppercase tracking-wider text-neutral-600 mb-2 block">
              Description
            </Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="min-h-32 border-neutral-300 rounded-none"
              placeholder="Describe the product..."
            />
          </div>

          <div>
            <Label htmlFor="tags" className="text-sm uppercase tracking-wider text-neutral-600 mb-2 block">
              Tags
            </Label>
            <Input
              id="tags"
              value={formData.tags}
              onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
              className="h-12 border-neutral-300 rounded-none"
              placeholder="e.g. summer, featured, bestseller, closeout (comma-separated)"
            />
            <p className="mt-2 text-xs text-neutral-500">Add the “closeout” tag to show a published product in the storefront Closeout Sale section.</p>
          </div>

          {/* Status and Visibility */}
          <div className="border-t border-neutral-200 pt-8">
            <h3 className="text-lg mb-6 tracking-tight">Publishing Options</h3>
            
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 border border-neutral-200">
                <div>
                  <Label htmlFor="status" className="text-sm mb-1 block">
                    Product Status
                  </Label>
                  <p className="text-sm text-neutral-600">
                    {formData.status === 'published' ? 'Product is published' : 'Product is in draft'}
                  </p>
                </div>
                <Select
                  value={formData.status}
                  onValueChange={(value: 'published' | 'draft') =>
                    setFormData(prev => ({ ...prev, status: value }))
                  }
                >
                  <SelectTrigger className="w-40 border-neutral-300 rounded-none">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between p-4 border border-neutral-200">
                <div>
                  <Label htmlFor="showOnWebsite" className="text-sm mb-1 block">
                    Show on Website
                  </Label>
                  <p className="text-sm text-neutral-600">
                    {formData.showOnWebsite
                      ? 'This product is visible on your website'
                      : 'This product is hidden from your website'}
                  </p>
                </div>
                <Switch
                  id="showOnWebsite"
                  checked={formData.showOnWebsite}
                  onCheckedChange={(checked) =>
                    setFormData(prev => ({ ...prev, showOnWebsite: checked }))
                  }
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-4 pt-8">
            <Button
              type="submit"
              className="bg-black text-white hover:bg-neutral-800 rounded-none h-12 px-8"
            >
              {isEditing ? 'Update Product' : 'Create Product'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/admin/products')}
              className="border-neutral-300 rounded-none h-12 px-8"
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
