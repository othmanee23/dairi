import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useApp } from '../../context/AppContext';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { toast } from 'sonner';
import collectionImage from '../../../imports/image-1.webp';

export function CollectionForm() {
  const { id } = useParams();
  const { collections, addCollection, updateCollection } = useApp();
  const existing = collections.find(c => c.id === id);
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', description: '', season: '', image: '' });
  useEffect(() => { if (existing) setForm({ name: existing.name, description: existing.description, season: existing.season, image: existing.image }); }, [existing]);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const payload = { ...form, image: form.image.trim() || existing?.image || collectionImage, productCount: existing?.productCount ?? 0 };
    try {
      if (id) await updateCollection(id, payload);
      else await addCollection({ id: `collection-${Date.now().toString(36)}`, ...payload });
      toast.success(id ? 'Collection saved' : 'Collection created');
      navigate('/collections');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save collection');
    }
  };
  return <div className="admin-page p-8 lg:p-10"><div className="max-w-3xl mx-auto"><Link to="/collections" className="text-sm text-neutral-600 underline">← Collections</Link><h1 className="text-4xl mt-6 mb-8">{id ? 'Edit collection' : 'New collection'}</h1><form onSubmit={submit} className="admin-panel p-6 space-y-5"><div><Label>Name</Label><Input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})} className="mt-2 h-12 rounded-none"/></div><div><Label>Season</Label><Input required value={form.season} onChange={e=>setForm({...form,season:e.target.value})} className="mt-2 h-12 rounded-none" placeholder="Spring 2027"/></div><div><Label>Description</Label><Textarea required value={form.description} onChange={e=>setForm({...form,description:e.target.value})} className="mt-2 rounded-none"/></div><div><Label>Image URL</Label><Input value={form.image} onChange={e=>setForm({...form,image:e.target.value})} className="mt-2 h-12 rounded-none" placeholder="https://…"/></div><Button type="submit" className="admin-button bg-black text-white rounded-none">Save collection</Button></form></div></div>;
}
