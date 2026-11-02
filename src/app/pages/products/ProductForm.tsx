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
import { ArrowLeft, Check, ChevronLeft, ChevronRight, ImagePlus, PackageCheck, Plus, X } from 'lucide-react';
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
  const [activeStep, setActiveStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const steps = [
    { title: 'Details', caption: 'Name and product info' },
    { title: 'Images', caption: 'Add product photos' },
    { title: 'Variants', caption: 'Sizes, SKUs and stock' },
    { title: 'Review', caption: 'Visibility and save' },
  ];

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

  const normalizedVariants = () => formData.variants.map(variant => ({
    ...variant,
    sku: variant.sku.trim() || `${formData.styleNumber.trim()}-${variant.color}-${variant.size}`.replace(/[^a-zA-Z0-9-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').toUpperCase(),
    color: variant.color.trim(),
    size: variant.size.trim(),
  }));

  const validateStep = (step: number) => {
    if (step === 0) {
      if (!formData.name.trim()) { toast.error('Add a product name to continue.'); return false; }
      if (!formData.styleNumber.trim()) { toast.error('Add a style number to continue.'); return false; }
      if (!Number.isFinite(Number(formData.price)) || Number(formData.price) <= 0) { toast.error('Enter a price greater than $0.'); return false; }
      if (!formData.category) { toast.error('Choose a product category to continue.'); return false; }
      if (!formData.collection) { toast.error('Choose a collection to continue.'); return false; }
    }
    if (step === 2) {
      const variants = normalizedVariants();
      if (!variants.length || variants.some(variant => !variant.size || !Number.isInteger(variant.inventoryQuantity) || variant.inventoryQuantity < 0)) {
        toast.error('Add a size and valid stock quantity for each variant.'); return false;
      }
      if (new Set(variants.map(variant => variant.sku.toLowerCase())).size !== variants.length) {
        toast.error('Each variant needs a unique SKU. Change the SKU or size/color combination.'); return false;
      }
      if (new Set(variants.map(variant => `${variant.color.toLowerCase()}|${variant.size.toLowerCase()}`)).size !== variants.length) {
        toast.error('Each color and size combination must be unique.'); return false;
      }
    }
    return true;
  };

  const goToNextStep = () => {
    if (!validateStep(activeStep)) return;
    setActiveStep(step => Math.min(step + 1, steps.length - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (activeStep < steps.length - 1) { goToNextStep(); return; }
    for (const step of [0, 2]) {
      if (!validateStep(step)) { setActiveStep(step); return; }
    }
    const styleNumber = formData.styleNumber.trim();
    const variants = normalizedVariants();

    const product: Product = {
      id: isEditing ? id! : `dairi-${Date.now().toString(36)}`,
      styleNumber,
      name: formData.name.trim(),
      price: parseFloat(formData.price),
      category: formData.category,
      collection: formData.collection,
      description: formData.description.trim(),
      tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
      status: formData.status,
      showOnWebsite: formData.showOnWebsite,
      images: formData.images.length > 0 ? formData.images : [defaultProductImage],
      createdAt: existingProduct?.createdAt || new Date().toISOString().split('T')[0],
      color: variants[0]?.color ?? '',
      colorHex: variants[0]?.colorHex ?? '#111111',
      details: formData.details.split(',').map(value => value.trim()).filter(Boolean),
      material: formData.material.trim(),
      fit: formData.fit.trim(),
      care: formData.care.trim(),
      sizes: Array.from(new Set<string>(variants.map(variant => variant.size))),
      variants,
    };

    setSaving(true);
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
    } finally {
      setSaving(false);
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

  const generatedSku = (variant: ProductVariant) => `${formData.styleNumber.trim()}-${variant.color}-${variant.size}`.replace(/[^a-zA-Z0-9-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').toUpperCase();
  const stepTitles = ['Product details', 'Product photos', 'Sizes and inventory', 'Review and publish'];

  return (
    <div className="admin-page min-h-full px-5 py-7 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-5xl">
        <Link to="/admin/products" className="mb-7 inline-flex items-center gap-2 text-sm text-neutral-600 transition-colors hover:text-black">
          <ArrowLeft className="h-4 w-4" /> Products
        </Link>

        <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-2 text-[10px] uppercase tracking-[3px] text-black/40">Inventory setup</p>
            <h1 className="text-3xl tracking-tight sm:text-4xl">{isEditing ? 'Edit product' : 'Add a product'}</h1>
            <p className="mt-2 text-sm text-neutral-600">{isEditing ? 'Update the product in four short steps.' : 'Add the essentials first. You can refine the details before publishing.'}</p>
          </div>
          <span className="text-xs text-neutral-500">Step {activeStep + 1} of {steps.length}</span>
        </header>

        <nav aria-label="Product setup progress" className="mb-8 grid grid-cols-4 border-y border-neutral-200 bg-white">
          {steps.map((step, index) => {
            const complete = index < activeStep;
            const current = index === activeStep;
            return <div key={step.title} aria-current={current ? 'step' : undefined} className={`flex min-w-0 items-center gap-3 px-3 py-4 sm:px-5 ${current ? 'bg-neutral-50' : ''}`}>
              <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs ${complete ? 'border-black bg-black text-white' : current ? 'border-black text-black' : 'border-neutral-300 text-neutral-400'}`}>{complete ? <Check className="h-3.5 w-3.5" /> : index + 1}</span>
              <span className="min-w-0"><span className={`block truncate text-xs font-medium sm:text-sm ${current ? 'text-black' : 'text-neutral-500'}`}>{step.title}</span><span className="hidden truncate text-[11px] text-neutral-400 lg:block">{step.caption}</span></span>
            </div>;
          })}
        </nav>

        <form onSubmit={handleSubmit} noValidate>
          <section className="min-h-[440px] border border-neutral-200 bg-white p-5 sm:p-8">
            <div className="mb-7 border-b border-neutral-100 pb-5">
              <h2 className="text-xl font-medium">{stepTitles[activeStep]}</h2>
              <p className="mt-1 text-sm text-neutral-500">
                {activeStep === 0 && 'Start with the details customers and your team need to identify this item.'}
                {activeStep === 1 && 'Use clear portrait photos. Images are optional now and can be added or changed later.'}
                {activeStep === 2 && 'Add each size or color option and its current stock. SKUs are generated when left blank.'}
                {activeStep === 3 && 'Check the product details and choose whether it should be visible in the storefront.'}
              </p>
            </div>

            {activeStep === 0 && <div className="space-y-7">
              <div className="grid gap-5 md:grid-cols-2">
                <div><Label htmlFor="name">Product name <span className="text-red-600">*</span></Label><Input id="name" autoFocus required maxLength={160} value={formData.name} onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))} className="mt-2 h-12 rounded-none border-neutral-300" placeholder="e.g. Structured Midi Dress" /></div>
                <div><Label htmlFor="styleNumber">Style number <span className="text-red-600">*</span></Label><Input id="styleNumber" required maxLength={80} value={formData.styleNumber} onChange={e => setFormData(prev => ({ ...prev, styleNumber: e.target.value }))} className="mt-2 h-12 rounded-none border-neutral-300" placeholder="e.g. DF-2601" /></div>
              </div>
              <div className="grid gap-5 md:grid-cols-3">
                <div><Label htmlFor="price">Retail price (USD) <span className="text-red-600">*</span></Label><div className="mt-2 flex h-12 items-center border border-neutral-300 bg-white"><span className="pl-3 text-sm text-neutral-500">$</span><Input id="price" type="number" inputMode="decimal" step="0.01" min="0.01" required value={formData.price} onChange={e => setFormData(prev => ({ ...prev, price: e.target.value }))} className="h-full rounded-none border-0" placeholder="0.00" /></div></div>
                <div><Label htmlFor="category">Category <span className="text-red-600">*</span></Label><Select value={formData.category} onValueChange={value => setFormData(prev => ({ ...prev, category: value }))}><SelectTrigger id="category" className="mt-2 h-12 rounded-none border-neutral-300"><SelectValue placeholder="Choose category" /></SelectTrigger><SelectContent><SelectItem value="Women's Tops">Women's Tops</SelectItem><SelectItem value="Dresses">Dresses</SelectItem><SelectItem value="Pants or skirts">Pants or skirts</SelectItem><SelectItem value="Jackets or coats">Jackets or coats</SelectItem><SelectItem value="Scarves or shawls">Scarves or shawls</SelectItem><SelectItem value="Natural-Fiber Clothing">Natural-Fiber Clothing</SelectItem><SelectItem value="Handwoven Collection">Handwoven Collection</SelectItem><SelectItem value="Leather Belts">Leather Belts</SelectItem></SelectContent></Select></div>
                <div><Label htmlFor="collection">Collection <span className="text-red-600">*</span></Label><Select value={formData.collection} onValueChange={value => setFormData(prev => ({ ...prev, collection: value }))}><SelectTrigger id="collection" className="mt-2 h-12 rounded-none border-neutral-300"><SelectValue placeholder="Choose collection" /></SelectTrigger><SelectContent>{collections.filter(collection => collection.name?.trim()).map(collection => { const name = collection.name.trim(); return <SelectItem key={collection.id} value={name}>{name}</SelectItem>; })}</SelectContent></Select></div>
              </div>
              {collections.filter(collection => collection.name?.trim()).length === 0 && <p className="border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Create a collection before adding a product. <Link to="/admin/collections/new" className="underline">Create collection</Link></p>}
              <div><Label htmlFor="description">Description <span className="font-normal text-neutral-400">(optional)</span></Label><Textarea id="description" maxLength={3000} value={formData.description} onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))} className="mt-2 min-h-28 rounded-none border-neutral-300" placeholder="Describe the piece, fit, and feel…" /><p className="mt-1 text-right text-[11px] text-neutral-400">{formData.description.length}/3000</p></div>
              <details className="border-t border-neutral-100 pt-5"><summary className="cursor-pointer text-sm font-medium">More product details <span className="font-normal text-neutral-400">(optional)</span></summary><div className="mt-5 grid gap-4 sm:grid-cols-2"><div><Label htmlFor="material">Fabric / material</Label><Input id="material" value={formData.material} onChange={e => setFormData(prev => ({ ...prev, material: e.target.value }))} className="mt-2 h-11 rounded-none border-neutral-300" placeholder="e.g. Cotton blend" /></div><div><Label htmlFor="fit">Fit</Label><Input id="fit" value={formData.fit} onChange={e => setFormData(prev => ({ ...prev, fit: e.target.value }))} className="mt-2 h-11 rounded-none border-neutral-300" placeholder="e.g. Relaxed" /></div><div><Label htmlFor="care">Care instructions</Label><Input id="care" value={formData.care} onChange={e => setFormData(prev => ({ ...prev, care: e.target.value }))} className="mt-2 h-11 rounded-none border-neutral-300" /></div><div><Label htmlFor="details">Additional details</Label><Input id="details" value={formData.details} onChange={e => setFormData(prev => ({ ...prev, details: e.target.value }))} className="mt-2 h-11 rounded-none border-neutral-300" placeholder="Separate details with commas" /></div></div></details>
            </div>}

            {activeStep === 1 && <div>
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-neutral-600">{formData.images.length} of 6 photos added</p><p className="text-xs text-neutral-400">Portrait 3:4 photos work best</p></div>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {formData.images.map((image, index) => <div key={`${image}-${index}`} className="relative aspect-[3/4] overflow-hidden bg-neutral-100"><img src={image} alt={`${formData.name || 'Product'} photo ${index + 1}`} className="h-full w-full object-cover" /><button type="button" onClick={() => removeImage(index)} aria-label={`Remove photo ${index + 1}`} className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white text-black shadow-sm hover:bg-neutral-100"><X className="h-4 w-4" /></button><span className="absolute bottom-2 left-2 bg-white/90 px-2 py-1 text-[10px]">Photo {index + 1}{index === 0 ? ' · Cover' : ''}</span></div>)}
                {formData.images.length < 6 && <label className={`flex aspect-[3/4] flex-col items-center justify-center border border-dashed border-neutral-300 bg-neutral-50 text-center transition-colors hover:border-neutral-500 hover:bg-neutral-100 ${uploadingImages ? 'cursor-wait opacity-60' : 'cursor-pointer'}`}><span className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-white"><ImagePlus className="h-5 w-5 text-neutral-600" /></span><span className="text-sm font-medium">{uploadingImages ? 'Uploading photos…' : 'Add photos'}</span><span className="mt-1 px-3 text-[11px] text-neutral-500">JPG, PNG or WebP · up to 6</span><input type="file" multiple accept="image/*" onChange={handleImageUpload} disabled={uploadingImages} className="sr-only" /></label>}
              </div>
              {!formData.images.length && <p className="mt-5 border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-600">You can continue without photos and add them later. A temporary placeholder will be used until product photos are uploaded.</p>}
            </div>}

            {activeStep === 2 && <div className="space-y-4">
              <div className="mb-5 flex items-center justify-between gap-3"><div><p className="text-sm font-medium">Product options</p><p className="mt-1 text-xs text-neutral-500">Each size or color combination is a separate option.</p></div><Button type="button" variant="outline" onClick={() => setFormData(prev => ({ ...prev, variants: [...prev.variants, { id: crypto.randomUUID(), sku: '', color: '', colorHex: '#111111', size: '', inventoryQuantity: 0, isActive: true }] }))} className="rounded-none"><Plus className="mr-2 h-4 w-4" />Add option</Button></div>
              {formData.variants.map((variant, index) => <div key={variant.id} className="border border-neutral-200 p-4 sm:p-5">
                <div className="mb-4 flex items-center justify-between"><p className="text-xs font-medium uppercase tracking-wider text-neutral-500">Option {String(index + 1).padStart(2, '0')}</p><Button type="button" variant="ghost" aria-label={`Remove option ${index + 1}`} disabled={formData.variants.length === 1} onClick={() => setFormData(prev => ({ ...prev, variants: prev.variants.filter((_, i) => i !== index) }))} className="h-8 px-2 text-xs text-neutral-500"><X className="mr-1 h-3.5 w-3.5" />Remove</Button></div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div><Label htmlFor={`variant-size-${index}`}>Size <span className="text-red-600">*</span></Label><Input id={`variant-size-${index}`} required value={variant.size} onChange={e => setFormData(prev => ({ ...prev, variants: prev.variants.map((item, i) => i === index ? { ...item, size: e.target.value } : item) }))} className="mt-2 h-11 rounded-none border-neutral-300" placeholder="e.g. S or One size" /></div>
                  <div><Label htmlFor={`variant-color-${index}`}>Color</Label><Input id={`variant-color-${index}`} value={variant.color} onChange={e => setFormData(prev => ({ ...prev, variants: prev.variants.map((item, i) => i === index ? { ...item, color: e.target.value } : item) }))} className="mt-2 h-11 rounded-none border-neutral-300" placeholder="e.g. Indigo" /></div>
                  <div><Label htmlFor={`variant-sku-${index}`}>SKU <span className="font-normal text-neutral-400">(optional)</span></Label><Input id={`variant-sku-${index}`} value={variant.sku} onChange={e => setFormData(prev => ({ ...prev, variants: prev.variants.map((item, i) => i === index ? { ...item, sku: e.target.value } : item) }))} className="mt-2 h-11 rounded-none border-neutral-300" placeholder={generatedSku(variant) || 'Generated from style, color and size'} /></div>
                  <div><Label htmlFor={`variant-stock-${index}`}>Stock quantity <span className="text-red-600">*</span></Label><Input id={`variant-stock-${index}`} type="number" inputMode="numeric" min="0" step="1" required value={variant.inventoryQuantity} onChange={e => setFormData(prev => ({ ...prev, variants: prev.variants.map((item, i) => i === index ? { ...item, inventoryQuantity: Number(e.target.value) } : item) }))} className="mt-2 h-11 rounded-none border-neutral-300" /></div>
                </div>
                <div className="mt-4 flex items-center gap-3"><Label htmlFor={`variant-color-hex-${index}`} className="text-xs text-neutral-500">Swatch color</Label><Input id={`variant-color-hex-${index}`} type="color" value={variant.colorHex ?? '#111111'} onChange={e => setFormData(prev => ({ ...prev, variants: prev.variants.map((item, i) => i === index ? { ...item, colorHex: e.target.value } : item) }))} className="h-8 w-12 cursor-pointer border-0 p-0" /></div>
                <details className="mt-4 border-t border-neutral-100 pt-4" open={variant.retailPrice != null || variant.wholesalePrice != null}><summary className="cursor-pointer text-xs font-medium text-neutral-600">Optional price overrides</summary><div className="mt-4 grid gap-4 sm:grid-cols-2"><div><Label htmlFor={`variant-retail-${index}`}>Retail price (USD)</Label><div className="mt-2 flex h-10 items-center border border-neutral-300"><span className="pl-3 text-sm text-neutral-500">$</span><Input id={`variant-retail-${index}`} type="number" min="0" step="0.01" value={variant.retailPrice ?? ''} onChange={e => setFormData(prev => ({ ...prev, variants: prev.variants.map((item, i) => i === index ? { ...item, retailPrice: e.target.value === '' ? undefined : Number(e.target.value) } : item) }))} placeholder={`Use product price ($${formData.price || '0.00'})`} className="h-full rounded-none border-0" /></div></div><div><Label htmlFor={`variant-wholesale-${index}`}>Wholesale price (USD)</Label><div className="mt-2 flex h-10 items-center border border-neutral-300"><span className="pl-3 text-sm text-neutral-500">$</span><Input id={`variant-wholesale-${index}`} type="number" min="0" step="0.01" value={variant.wholesalePrice ?? ''} onChange={e => setFormData(prev => ({ ...prev, variants: prev.variants.map((item, i) => i === index ? { ...item, wholesalePrice: e.target.value === '' ? undefined : Number(e.target.value) } : item) }))} placeholder="Optional" className="h-full rounded-none border-0" /></div></div></div></details>
              </div>)}
              <p className="flex items-start gap-2 border border-neutral-200 bg-neutral-50 p-4 text-xs leading-5 text-neutral-600"><PackageCheck className="mt-0.5 h-4 w-4 shrink-0" />Leave SKU blank to generate it automatically from the style number, color and size. Stock can be zero when an option is sold out.</p>
            </div>}

            {activeStep === 3 && <div className="space-y-6">
              <div className="grid gap-5 md:grid-cols-[180px_1fr]">
                <div className="aspect-[3/4] overflow-hidden bg-neutral-100"><img src={formData.images[0] || defaultProductImage} alt="Product preview" className="h-full w-full object-cover" /></div>
                <div className="space-y-5">
                  <div className="flex items-start justify-between gap-4"><div><p className="text-lg font-medium">{formData.name || 'Untitled product'}</p><p className="mt-1 text-sm text-neutral-500">Style {formData.styleNumber || '—'} · {formData.category || 'No category'} · {formData.collection || 'No collection'}</p></div><button type="button" onClick={() => setActiveStep(0)} className="text-xs underline">Edit details</button></div>
                  <p className="text-2xl">${Number(formData.price || 0).toFixed(2)}</p>
                  {formData.description && <p className="max-w-2xl text-sm leading-6 text-neutral-600">{formData.description}</p>}
                  <div className="border-t border-neutral-200 pt-4"><div className="mb-3 flex items-center justify-between"><p className="text-sm font-medium">{formData.variants.length} option{formData.variants.length === 1 ? '' : 's'}</p><button type="button" onClick={() => setActiveStep(2)} className="text-xs underline">Edit options</button></div><div className="divide-y divide-neutral-100">{normalizedVariants().map(variant => <div key={variant.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm"><span>{[variant.color, variant.size].filter(Boolean).join(' · ') || 'Option needs a size'} <span className="text-xs text-neutral-400">{variant.sku}</span></span><span className="text-neutral-600">{variant.inventoryQuantity} in stock</span></div>)}</div></div>
                  <div className="flex items-center justify-between border-t border-neutral-200 pt-4"><div><p className="text-sm font-medium">Product photos</p><p className="mt-1 text-xs text-neutral-500">{formData.images.length ? `${formData.images.length} added` : 'No photos · placeholder image will be used'}</p></div><button type="button" onClick={() => setActiveStep(1)} className="text-xs underline">Edit photos</button></div>
                </div>
              </div>
              <div className="border-t border-neutral-200 pt-6"><h3 className="mb-4 text-sm font-medium">Store visibility</h3><div className="grid gap-3 sm:grid-cols-2"><button type="button" aria-pressed={formData.status === 'draft'} onClick={() => setFormData(prev => ({ ...prev, status: 'draft', showOnWebsite: false }))} className={`border p-4 text-left transition-colors ${formData.status === 'draft' ? 'border-black bg-neutral-50' : 'border-neutral-200'}`}><span className="block text-sm font-medium">Save as draft</span><span className="mt-1 block text-xs leading-5 text-neutral-500">Only administrators can see this product.</span></button><button type="button" aria-pressed={formData.status === 'published'} onClick={() => setFormData(prev => ({ ...prev, status: 'published' }))} className={`border p-4 text-left transition-colors ${formData.status === 'published' ? 'border-black bg-neutral-50' : 'border-neutral-200'}`}><span className="block text-sm font-medium">Publish product</span><span className="mt-1 block text-xs leading-5 text-neutral-500">Make it available for customers to view.</span></button></div>
                <div className="mt-4 flex items-center justify-between gap-4 border border-neutral-200 p-4"><div><Label htmlFor="showOnWebsite" className="text-sm font-medium">Show in storefront</Label><p className="mt-1 text-xs text-neutral-500">Customers can find this product when it is published.</p></div><Switch id="showOnWebsite" checked={formData.showOnWebsite} onCheckedChange={checked => setFormData(prev => ({ ...prev, showOnWebsite: checked }))} /></div>
                {formData.showOnWebsite && formData.status !== 'published' && <p className="mt-3 text-xs text-amber-800">The product is marked to show in the store but stays hidden until its status is published.</p>}
                <div className="mt-5"><Label htmlFor="tags">Search tags <span className="font-normal text-neutral-400">(optional)</span></Label><Input id="tags" value={formData.tags} onChange={e => setFormData(prev => ({ ...prev, tags: e.target.value }))} className="mt-2 h-11 rounded-none border-neutral-300" placeholder="e.g. summer, featured, closeout" /><p className="mt-1 text-xs text-neutral-500">Use commas between tags. Add “closeout” to feature a published item in Closeout Sale.</p></div>
              </div>
            </div>}
          </section>

          <footer className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <Button type="button" variant="outline" onClick={() => activeStep === 0 ? navigate('/admin/products') : setActiveStep(step => Math.max(step - 1, 0))} className="h-11 rounded-none border-neutral-300 px-5"><ChevronLeft className="mr-1 h-4 w-4" />{activeStep === 0 ? 'Cancel' : 'Back'}</Button>
            <p className="hidden text-xs text-neutral-400 sm:block">Your changes are saved when you finish this setup.</p>
            {activeStep < steps.length - 1 ? <Button type="button" onClick={goToNextStep} className="h-11 rounded-none bg-black px-6 text-white hover:bg-neutral-800">Continue<ChevronRight className="ml-2 h-4 w-4" /></Button> : <Button type="submit" disabled={saving} className="h-11 rounded-none bg-black px-6 text-white hover:bg-neutral-800 disabled:opacity-50">{saving ? 'Saving…' : isEditing ? 'Save changes' : formData.status === 'published' ? 'Publish product' : 'Create draft'}<Check className="ml-2 h-4 w-4" /></Button>}
          </footer>
        </form>
      </div>
    </div>
  );
}
