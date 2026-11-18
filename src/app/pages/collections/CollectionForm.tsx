import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useApp } from '../../context/AppContext';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { ImagePlus, X } from 'lucide-react';
import { toast } from 'sonner';
import collectionImage from '../../../imports/image-1.webp';
import { readOptimizedImage } from '../../utils/image';

export function CollectionForm() {
  const { id } = useParams();
  const { collections, addCollection, updateCollection } = useApp();
  const existing = collections.find(c => c.id === id);
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', description: '', season: '', image: '' });
  const [processingImage, setProcessingImage] = useState(false);
  useEffect(() => { if (existing) setForm({ name: existing.name, description: existing.description, season: existing.season, image: existing.image }); }, [existing]);
  const chooseImage = async (file?: File) => {
    if (!file) return;
    setProcessingImage(true);
    try {
      const image = await readOptimizedImage(file, 1800);
      setForm(previous => ({ ...previous, image }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not read selected image');
    } finally { setProcessingImage(false); }
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const payload = { ...form, image: form.image.trim() || existing?.image || collectionImage, productCount: existing?.productCount ?? 0 };
    try {
      const collectionId = id ?? `collection-${Date.now().toString(36)}`;
      if (id) await updateCollection(id, payload);
      else await addCollection({ id: collectionId, ...payload });
      toast.success(id ? 'Collection saved' : 'Collection created');
      navigate(`/admin/collections/${collectionId}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save collection');
    }
  };
  return <div className="admin-page p-8 lg:p-10"><div className="max-w-3xl mx-auto"><Link to={id ? `/admin/collections/${id}` : '/admin/collections'} className="text-sm text-neutral-600 underline">← {id ? 'Collection' : 'Collections'}</Link><h1 className="text-4xl mt-6 mb-8">{id ? 'Edit collection' : 'New collection'}</h1><form onSubmit={submit} className="admin-panel p-6 space-y-5"><div><Label>Name</Label><Input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})} className="mt-2 h-12 rounded-none"/></div><div><Label>Season</Label><Input required value={form.season} onChange={e=>setForm({...form,season:e.target.value})} className="mt-2 h-12 rounded-none" placeholder="Spring 2027"/></div><div><Label>Description</Label><Textarea required value={form.description} onChange={e=>setForm({...form,description:e.target.value})} className="mt-2 rounded-none"/></div><div><Label>Collection image</Label><Input aria-label="Image URL" value={form.image.startsWith('data:') ? '' : form.image} onChange={e=>setForm({...form,image:e.target.value})} className="mt-2 h-12 rounded-none" placeholder="Paste an image URL (optional)"/><label className={`mt-3 flex min-h-24 cursor-pointer flex-col items-center justify-center gap-2 border border-dashed px-5 py-4 text-sm ${processingImage ? 'cursor-wait opacity-60' : 'border-neutral-300 hover:border-black'}`}><ImagePlus className="h-5 w-5"/><span>{processingImage ? 'Preparing image…' : 'Choose an image from your device'}</span><input type="file" accept="image/*" disabled={processingImage} className="sr-only" onChange={event=>{void chooseImage(event.target.files?.[0]);event.target.value='';}}/></label>{form.image && <div className="mt-4 flex items-start gap-4 border border-neutral-200 p-3"><img src={form.image} alt="Collection preview" className="h-28 w-24 object-cover"/><div className="flex-1"><p className="text-sm font-medium">Image preview</p><p className="mt-1 break-all text-xs text-neutral-500">{form.image.startsWith('data:') ? 'Uploaded image, optimized for the collection cover' : form.image}</p><button type="button" onClick={()=>setForm({...form,image:''})} className="mt-3 inline-flex items-center gap-1 text-xs underline"><X className="h-3 w-3"/>Remove image</button></div></div>}</div><Button type="submit" disabled={processingImage} className="admin-button rounded-none bg-black text-white">Save collection</Button></form></div></div>;
}
