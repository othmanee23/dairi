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
import { Product } from '../../types';
import { readOptimizedImage } from '../../utils/image';
import defaultProductImage from '../../../imports/image-1.webp';

export function ProductForm() {
  const { id } = useParams();
  const { products, collections, addProduct, updateProduct } = useApp();
  const navigate = useNavigate();
  const isEditing = !!id;

  const existingProduct = products.find(p => p.id === id);

  const [formData, setFormData] = useState({
    name: '',
    price: '',
    category: '',
    collection: '',
    description: '',
    tags: '',
    status: 'draft' as 'published' | 'draft',
    showOnWebsite: false,
    images: [] as string[],
  });

  useEffect(() => {
    if (existingProduct) {
      setFormData({
        name: existingProduct.name,
        price: existingProduct.price.toString(),
        category: existingProduct.category,
        collection: existingProduct.collection,
        description: existingProduct.description,
        tags: existingProduct.tags.join(', '),
        status: existingProduct.status,
        showOnWebsite: existingProduct.showOnWebsite,
        images: existingProduct.images,
      });
    }
  }, [existingProduct]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const product: Product = {
      id: isEditing ? id! : `dairi-${Date.now().toString(36)}`,
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
      color: existingProduct?.color ?? 'DAIRI',
      colorHex: existingProduct?.colorHex ?? '#111111',
      details: existingProduct?.details ?? [formData.description],
      material: existingProduct?.material ?? 'Details coming soon',
      fit: existingProduct?.fit ?? 'See product description',
      care: existingProduct?.care ?? 'Follow the care label',
      sizes: existingProduct?.sizes ?? ['XS', 'S', 'M', 'L', 'XL'],
    };

    if (isEditing) {
      updateProduct(id, product);
      toast.success('Product updated successfully');
    } else {
      addProduct(product);
      toast.success('Product created successfully');
    }

    navigate('/products');
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).filter(file => file.type.startsWith('image/')).slice(0, Math.max(0, 6 - formData.images.length));
    try { const images = await Promise.all(files.map(file => readOptimizedImage(file))); setFormData(prev => ({ ...prev, images: [...prev.images, ...images] })); }
    catch (error) { toast.error(error instanceof Error ? error.message : 'Could not process image'); }
    e.target.value = '';
  };

  const removeImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  return (
    <div className="admin-page p-8 lg:p-10">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <Link
          to="/products"
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
                  <span className="text-xs text-neutral-600">Upload Image</span>
                </div>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleImageUpload}
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
                  <SelectItem value="Sets">Sets</SelectItem>
                  <SelectItem value="Dresses">Dresses</SelectItem>
                  <SelectItem value="Tops">Tops</SelectItem>
                  <SelectItem value="Bottoms">Bottoms</SelectItem>
                  <SelectItem value="Outerwear">Outerwear</SelectItem>
                  <SelectItem value="Knitwear">Knitwear</SelectItem>
                  <SelectItem value="Accessories">Accessories</SelectItem>
                  <SelectItem value="Footwear">Footwear</SelectItem>
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
                  {collections.map(collection => <SelectItem key={collection.id} value={collection.name}>{collection.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
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
              placeholder="e.g. summer, featured, bestseller (comma-separated)"
            />
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
              onClick={() => navigate('/products')}
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
