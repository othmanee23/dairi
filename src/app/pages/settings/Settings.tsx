import { FormEvent, useEffect, useState } from 'react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { Upload, Save, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useApp } from '../../context/AppContext';
import { readOptimizedImage } from '../../utils/image';
import { supabase } from '../../lib/supabase';
import defaultProductImage from '../../../imports/image-1.webp';

type CommerceZone = { id: string; country_code: string; region_code: string; shipping_amount: number | null; free_shipping_threshold: number | null; tax_rate: number | null; tax_shipping: boolean; active: boolean };
type DiscountCode = { id: string; code: string; discount_type: 'percentage'|'fixed'; amount: number; minimum_subtotal: number; starts_at: string | null; expires_at: string | null; max_redemptions: number | null; redemption_count: number; applies_to: 'retail'|'wholesale'|'all'; active: boolean };

export function Settings() {
  const { settings, updateSettings, addProduct, changePassword } = useApp();
  const [brandName, setBrandName] = useState(settings.brandName);
  const [logo, setLogo] = useState(settings.logo);
  const [primaryColor, setPrimaryColor] = useState(settings.primaryColor);
  const [secondaryColor, setSecondaryColor] = useState(settings.secondaryColor);
  const [fontFamily, setFontFamily] = useState(settings.fontFamily);
  const [defaultFormat, setDefaultFormat] = useState(settings.defaultFormat);
  const [defaultLayout, setDefaultLayout] = useState(settings.defaultLayout);
  const [email, setEmail] = useState(settings.email);
  const [name, setName] = useState(settings.name);
  const [commerceZones, setCommerceZones] = useState<CommerceZone[]>([]);
  const [zoneCountry, setZoneCountry] = useState(''); const [zoneRegion, setZoneRegion] = useState('');
  const [zoneShipping, setZoneShipping] = useState(''); const [zoneFreeThreshold, setZoneFreeThreshold] = useState(''); const [zoneTaxRate, setZoneTaxRate] = useState('');
  const [zoneTaxShipping, setZoneTaxShipping] = useState(false); const [savingZone, setSavingZone] = useState(false);
  const [discountCodes, setDiscountCodes] = useState<DiscountCode[]>([]);
  const [discountCode, setDiscountCode] = useState(''); const [discountType, setDiscountType] = useState<'percentage'|'fixed'>('percentage');
  const [discountAmount, setDiscountAmount] = useState(''); const [discountMinimum, setDiscountMinimum] = useState('0');
  const [discountMaxUses, setDiscountMaxUses] = useState(''); const [discountStarts, setDiscountStarts] = useState(''); const [discountExpires, setDiscountExpires] = useState('');
  const [discountAppliesTo, setDiscountAppliesTo] = useState<'retail'|'wholesale'|'all'>('retail'); const [savingDiscount, setSavingDiscount] = useState(false);
  const [passwordFormOpen, setPasswordFormOpen] = useState(false);
  const [newPassword, setNewPassword] = useState(''); const [confirmPassword, setConfirmPassword] = useState(''); const [savingPassword, setSavingPassword] = useState(false);
  useEffect(() => { setBrandName(settings.brandName); setLogo(settings.logo); setPrimaryColor(settings.primaryColor); setSecondaryColor(settings.secondaryColor); setFontFamily(settings.fontFamily); setDefaultFormat(settings.defaultFormat); setDefaultLayout(settings.defaultLayout); setEmail(settings.email); setName(settings.name); }, [settings]);
  useEffect(() => { if (!supabase) return; let active = true; void supabase.from('commerce_zones').select('*').order('country_code').order('region_code').then(({ data, error }) => { if (!active) return; if (error) toast.error(`Could not load shipping and tax rules: ${error.message}`); else setCommerceZones((data ?? []) as CommerceZone[]); }); return () => { active = false; }; }, []);
  useEffect(() => { if (!supabase) return; let active = true; void supabase.from('discount_codes').select('*').order('created_at', { ascending: false }).then(({ data, error }) => { if (!active) return; if (error) toast.error(`Could not load discount codes: ${error.message}`); else setDiscountCodes((data ?? []) as DiscountCode[]); }); return () => { active = false; }; }, []);

  const saveCommerceZone = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase) { toast.error('Supabase is not configured'); return; }
    if (!/^[A-Za-z]{2}$/.test(zoneCountry)) { toast.error('Enter a two-letter ISO country code'); return; }
    if ((zoneShipping && (!Number.isFinite(Number(zoneShipping)) || Number(zoneShipping) < 0)) || (zoneFreeThreshold && (!Number.isFinite(Number(zoneFreeThreshold)) || Number(zoneFreeThreshold) < 0)) || (zoneTaxRate && (!Number.isFinite(Number(zoneTaxRate)) || Number(zoneTaxRate) < 0 || Number(zoneTaxRate) > 100))) { toast.error('Enter valid non-negative amounts and a tax rate from 0 to 100'); return; }
    setSavingZone(true);
    const row = { country_code: zoneCountry.toUpperCase(), region_code: zoneRegion.trim().toUpperCase(), shipping_amount: zoneShipping === '' ? null : Number(zoneShipping), free_shipping_threshold: zoneFreeThreshold === '' ? null : Number(zoneFreeThreshold), tax_rate: zoneTaxRate === '' ? null : Number(zoneTaxRate), tax_shipping: zoneTaxShipping, active: true };
    const { data, error } = await supabase.from('commerce_zones').upsert(row, { onConflict: 'country_code,region_code' }).select('*').single();
    setSavingZone(false);
    if (error) { toast.error(`Could not save rule: ${error.message}`); return; }
    setCommerceZones(current => [...current.filter(zone => zone.id !== data.id && !(zone.country_code === data.country_code && zone.region_code === data.region_code)), data as CommerceZone]);
    setZoneCountry(''); setZoneRegion(''); setZoneShipping(''); setZoneFreeThreshold(''); setZoneTaxRate(''); setZoneTaxShipping(false);
    toast.success('Destination rule saved');
  };

  const deleteCommerceZone = async (id: string) => {
    if (!supabase) return;
    const { error } = await supabase.from('commerce_zones').delete().eq('id', id);
    if (error) toast.error(`Could not remove rule: ${error.message}`);
    else setCommerceZones(current => current.filter(zone => zone.id !== id));
  };

  const createDiscountCode = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase) { toast.error('Supabase is not configured'); return; }
    const code = discountCode.trim().toUpperCase();
    const amount = Number(discountAmount); const minimum = Number(discountMinimum || 0); const maximum = discountMaxUses ? Number(discountMaxUses) : null;
    if (!/^[A-Z0-9][A-Z0-9_-]{2,39}$/.test(code)) { toast.error('Use 3–40 letters, numbers, hyphens, or underscores for the code'); return; }
    if (!Number.isFinite(amount) || amount <= 0 || (discountType === 'percentage' && amount > 100) || !Number.isFinite(minimum) || minimum < 0 || (maximum != null && (!Number.isInteger(maximum) || maximum < 1))) { toast.error('Check the discount amount, minimum, and redemption limit'); return; }
    const startsAt = discountStarts ? new Date(discountStarts).toISOString() : null; const expiresAt = discountExpires ? new Date(discountExpires).toISOString() : null;
    if (startsAt && expiresAt && new Date(expiresAt) <= new Date(startsAt)) { toast.error('Expiration must be after the start date'); return; }
    setSavingDiscount(true);
    const { data, error } = await supabase.from('discount_codes').insert({ code, discount_type: discountType, amount, minimum_subtotal: minimum, max_redemptions: maximum, starts_at: startsAt, expires_at: expiresAt, applies_to: discountAppliesTo }).select('*').single();
    setSavingDiscount(false);
    if (error) { toast.error(error.code === '23505' ? 'That discount code already exists' : `Could not create discount code: ${error.message}`); return; }
    setDiscountCodes(current => [data as DiscountCode, ...current]); setDiscountCode(''); setDiscountAmount(''); setDiscountMinimum('0'); setDiscountMaxUses(''); setDiscountStarts(''); setDiscountExpires('');
    toast.success('Discount code created');
  };

  const toggleDiscountCode = async (discount: DiscountCode) => {
    if (!supabase) return;
    const { error } = await supabase.from('discount_codes').update({ active: !discount.active }).eq('id', discount.id);
    if (error) toast.error(`Could not update code: ${error.message}`);
    else setDiscountCodes(current => current.map(code => code.id === discount.id ? { ...code, active: !code.active } : code));
  };

  const handleSave = async () => {
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { toast.error('Enter a valid studio contact email address'); return; }
    try {
      await updateSettings({ brandName, logo, primaryColor, secondaryColor, fontFamily, defaultFormat: defaultFormat as typeof settings.defaultFormat, defaultLayout: defaultLayout as typeof settings.defaultLayout, email: email.trim(), name });
      toast.success('Settings saved successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save settings');
    }
  };

  const handlePasswordChange = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (newPassword.length < 8 || newPassword.length > 72) { toast.error('Use a password between 8 and 72 characters'); return; }
    if (newPassword !== confirmPassword) { toast.error('The passwords do not match'); return; }
    setSavingPassword(true);
    try {
      await changePassword(newPassword);
      setNewPassword(''); setConfirmPassword(''); setPasswordFormOpen(false);
      toast.success('Password updated');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not update password');
    } finally { setSavingPassword(false); }
  };

  const handleCsvImport = async (file?: File) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.csv') || file.size > 10 * 1024 * 1024) { toast.error('Choose a CSV file smaller than 10 MB'); return; }
    const rows = (await file.text()).split(/\r?\n/).filter(Boolean);
    if (rows.length < 2) { toast.error('The CSV needs a header and at least one product row'); return; }
    const parseRow = (row: string) => row.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map(cell => cell.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));
    const headers = parseRow(rows[0]).map(header => header.toLowerCase().replace(/[^a-z]/g, ''));
    const imported = rows.slice(1).map(parseRow).map((cells, index) => {
      const get = (...keys: string[]) => { const i = headers.findIndex(header => keys.includes(header)); return i >= 0 ? cells[i] ?? '' : ''; };
      const name = get('name', 'productname'); const price = Number(get('price')); if (!name || !Number.isFinite(price) || price <= 0) return null;
      const status = get('status').toLowerCase() === 'published' ? 'published' as const : 'draft' as const;
      const image = get('image', 'imageurl');
      return { id: `import-${Date.now().toString(36)}-${index}`, name, price, category: get('category') || 'Sets', collection: get('collection') || 'DAIRI Edit', description: get('description'), tags: get('tags').split(/[;,]/).map(tag=>tag.trim()).filter(Boolean), status, showOnWebsite: status === 'published', images: image ? [image] : [defaultProductImage], createdAt: new Date().toISOString().slice(0,10) };
    }).filter((row): row is NonNullable<typeof row> => Boolean(row));
    if (!imported.length) { toast.error('No valid products found. Include Name and Price columns.'); return; }
    let saved = 0;
    try {
      for (const product of imported) { await addProduct(product); saved += 1; }
      toast.success(`${saved} products imported`);
    } catch (error) {
      toast.error(`${saved} of ${imported.length} products imported. ${error instanceof Error ? error.message : 'Import stopped.'}`);
    }
  };

  return (
    <div className="admin-page p-8 lg:p-10">
      <div className="max-w-4xl mx-auto">
        <div className="mb-12">
          <h1 className="text-4xl mb-2 tracking-tight">Settings</h1>
          <p className="text-neutral-600">Manage your brand and account settings</p>
        </div>

        <div className="space-y-12">
          {/* Brand Identity */}
          <section>
            <h2 className="text-xl mb-6 tracking-tight">Brand Identity</h2>
            <div className="admin-panel p-6 space-y-6">
              {/* Logo Upload */}
              <div>
                <Label className="text-sm uppercase tracking-wider text-neutral-600 mb-3 block">
                  Brand Logo
                </Label>
                <div className="flex items-center gap-6">
                  <div className="w-24 h-24 bg-black text-white flex items-center justify-center text-xs tracking-wider">
                    {logo ? <img src={logo} alt={`${brandName} logo`} className="max-w-full max-h-full object-contain"/> : brandName}
                  </div>
                  <label className="cursor-pointer">
                    <div className="flex items-center gap-2 px-4 py-2 border border-neutral-300 hover:bg-neutral-50 transition-colors">
                      <Upload className="w-4 h-4" />
                      <span className="text-sm">Upload Logo</span>
                    </div>
                    <input type="file" accept="image/*" className="hidden" onChange={async e=>{const file=e.target.files?.[0]; if(file){try { setLogo(await readOptimizedImage(file, 800)); } catch { toast.error('Could not process the logo image'); }}}} />
                  </label>
                </div>
              </div>

              {/* Brand Name */}
              <div>
                <Label className="text-sm uppercase tracking-wider text-neutral-600 mb-2 block">
                  Brand Name
                </Label>
                <Input
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  className="h-12 border-neutral-300 rounded-none max-w-md"
                />
              </div>

              {/* Colors */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label className="text-sm uppercase tracking-wider text-neutral-600 mb-2 block">
                    Primary Color
                  </Label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="w-12 h-12 border border-neutral-300 cursor-pointer"
                    />
                    <Input
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="h-12 border-neutral-300 rounded-none flex-1"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-sm uppercase tracking-wider text-neutral-600 mb-2 block">
                    Secondary Color
                  </Label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      className="w-12 h-12 border border-neutral-300 cursor-pointer"
                    />
                    <Input
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      className="h-12 border-neutral-300 rounded-none flex-1"
                    />
                  </div>
                </div>
              </div>

              {/* Typography */}
              <div>
                <Label className="text-sm uppercase tracking-wider text-neutral-600 mb-2 block">
                  Typography
                </Label>
                <Select value={fontFamily} onValueChange={setFontFamily}>
                  <SelectTrigger className="h-12 border-neutral-300 rounded-none max-w-md">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="inter">Inter</SelectItem>
                    <SelectItem value="helvetica">Helvetica Neue</SelectItem>
                    <SelectItem value="garamond">EB Garamond</SelectItem>
                    <SelectItem value="playfair">Playfair Display</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </section>

          {/* PDF Styling Defaults */}
          <section>
            <h2 className="text-xl mb-6 tracking-tight">PDF Defaults</h2>
            <div className="admin-panel p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label className="text-sm uppercase tracking-wider text-neutral-600 mb-2 block">
                    Default Format
                  </Label>
                  <Select value={defaultFormat} onValueChange={setDefaultFormat}>
                    <SelectTrigger className="h-12 border-neutral-300 rounded-none">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="a4">A4 (210 × 297 mm)</SelectItem>
                      <SelectItem value="square">Square (210 × 210 mm)</SelectItem>
                      <SelectItem value="portrait">Portrait (148 × 210 mm)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm uppercase tracking-wider text-neutral-600 mb-2 block">
                    Default Layout
                  </Label>
                  <Select value={defaultLayout} onValueChange={setDefaultLayout}>
                    <SelectTrigger className="h-12 border-neutral-300 rounded-none">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="minimal">Minimal Grid</SelectItem>
                      <SelectItem value="editorial">Editorial</SelectItem>
                      <SelectItem value="magazine">Magazine Style</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Preview */}
              <div>
                <Label className="text-sm uppercase tracking-wider text-neutral-600 mb-3 block">
                  Cover Preview
                </Label>
                <div className="w-48 aspect-[210/297] bg-black text-white flex flex-col items-center justify-center p-4">
                  <p className="text-[8px] uppercase tracking-[0.3em] text-neutral-400 mb-2">
                    {brandName}
                  </p>
                  <p className="text-sm tracking-tight text-center">Collection Title</p>
                  <div className="w-8 h-px bg-neutral-600 my-2" />
                  <p className="text-[8px] uppercase tracking-wider text-neutral-400">
                    2026
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Destination-based shipping and tax estimates */}
          <section>
            <h2 className="text-xl mb-2 tracking-tight">Shipping &amp; Tax Rules</h2>
            <p className="text-sm text-neutral-600 mb-6">Rates are manually configured by destination. Use ISO 3166-1 alpha-2 country codes (for example US or MA). Leave a rate blank when the studio must confirm it. Enter 0 to explicitly configure a zero rate.</p>
            <div className="admin-panel p-6 space-y-6">
              <form onSubmit={saveCommerceZone} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="text-sm">Country code<Input required maxLength={2} value={zoneCountry} onChange={event => setZoneCountry(event.target.value.toUpperCase())} placeholder="US" className="mt-2 h-11 rounded-none" /></label>
                <label className="text-sm">Region code (blank applies to the whole country)<Input value={zoneRegion} onChange={event => setZoneRegion(event.target.value.toUpperCase())} placeholder="CA, NY, etc." className="mt-2 h-11 rounded-none" /></label>
                <label className="text-sm">Flat shipping in USD<Input type="number" min="0" step="0.01" value={zoneShipping} onChange={event => setZoneShipping(event.target.value)} placeholder="Blank = studio quote" className="mt-2 h-11 rounded-none" /></label>
                <label className="text-sm">Free shipping minimum in USD<Input type="number" min="0" step="0.01" value={zoneFreeThreshold} onChange={event => setZoneFreeThreshold(event.target.value)} placeholder="Optional" className="mt-2 h-11 rounded-none" /></label>
                <label className="text-sm">Tax rate (%)<Input type="number" min="0" max="100" step="0.0001" value={zoneTaxRate} onChange={event => setZoneTaxRate(event.target.value)} placeholder="Blank = studio confirms" className="mt-2 h-11 rounded-none" /></label>
                <label className="flex items-center gap-3 text-sm pt-6"><input type="checkbox" checked={zoneTaxShipping} onChange={event => setZoneTaxShipping(event.target.checked)} />Include shipping in the tax basis</label>
                <div className="md:col-span-2"><Button type="submit" disabled={savingZone} className="bg-black text-white rounded-none h-11 px-6">{savingZone ? 'Saving…' : 'Save destination rule'}</Button></div>
              </form>
              {commerceZones.length ? <div className="divide-y border-t border-neutral-200">{commerceZones.map(zone => <div key={zone.id} className="flex flex-wrap items-center justify-between gap-4 py-4 text-sm"><div><p className="font-medium">{zone.country_code}{zone.region_code ? ` · ${zone.region_code}` : ' · all regions'}</p><p className="mt-1 text-xs text-neutral-600">Shipping: {zone.shipping_amount == null ? 'studio quote' : `$${Number(zone.shipping_amount).toFixed(2)}${zone.free_shipping_threshold == null ? '' : ` · free over $${Number(zone.free_shipping_threshold).toFixed(2)}`}`} · Tax: {zone.tax_rate == null ? 'studio confirmation' : `${Number(zone.tax_rate)}%`}{zone.tax_shipping ? ' (shipping taxable)' : ''}</p></div><button type="button" onClick={() => void deleteCommerceZone(zone.id)} aria-label={`Delete ${zone.country_code} ${zone.region_code} destination rule`} className="p-2 text-neutral-600 hover:text-red-700"><Trash2 className="w-4 h-4" /></button></div>)}</div> : <p className="border-t pt-4 text-sm text-neutral-500">No destination rules configured. Checkout will request a studio quote.</p>}
              <p className="text-xs text-neutral-500">These are manual estimates, not carrier quotes or tax advice. The server recalculates and snapshots charges when an unpaid order is created. Add more specific region rules to override country-wide rules.</p>
            </div>
          </section>

          {/* Required client brief feature: customer discount codes */}
          <section>
            <h2 className="text-xl mb-2 tracking-tight">Discount Codes</h2>
            <p className="text-sm text-neutral-600 mb-6">Codes are validated and redeemed by the server when an unpaid order is placed. Discounts reduce the taxable merchandise amount.</p>
            <div className="admin-panel p-6 space-y-6">
              <form onSubmit={createDiscountCode} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="text-sm">Code<Input required maxLength={40} value={discountCode} onChange={event => setDiscountCode(event.target.value.toUpperCase())} placeholder="WELCOME10" className="mt-2 h-11 rounded-none" /></label>
                <label className="text-sm">Discount type<select value={discountType} onChange={event => setDiscountType(event.target.value as 'percentage'|'fixed')} className="mt-2 h-11 w-full border border-neutral-300 bg-white px-3"><option value="percentage">Percentage</option><option value="fixed">Fixed amount (USD)</option></select></label>
                <label className="text-sm">Amount{discountType === 'percentage' ? ' (%)' : ' (USD)'}<Input required type="number" min="0.01" max={discountType === 'percentage' ? 100 : undefined} step="0.01" value={discountAmount} onChange={event => setDiscountAmount(event.target.value)} className="mt-2 h-11 rounded-none" /></label>
                <label className="text-sm">Minimum merchandise subtotal (USD)<Input type="number" min="0" step="0.01" value={discountMinimum} onChange={event => setDiscountMinimum(event.target.value)} className="mt-2 h-11 rounded-none" /></label>
                <label className="text-sm">Maximum redemptions (blank = unlimited)<Input type="number" min="1" step="1" value={discountMaxUses} onChange={event => setDiscountMaxUses(event.target.value)} className="mt-2 h-11 rounded-none" /></label>
                <label className="text-sm">Applies to<select value={discountAppliesTo} onChange={event => setDiscountAppliesTo(event.target.value as 'retail'|'wholesale'|'all')} className="mt-2 h-11 w-full border border-neutral-300 bg-white px-3"><option value="retail">Retail customers</option><option value="wholesale">Approved wholesale customers</option><option value="all">Retail and wholesale</option></select></label>
                <label className="text-sm">Starts at (optional)<Input type="datetime-local" value={discountStarts} onChange={event => setDiscountStarts(event.target.value)} className="mt-2 h-11 rounded-none" /></label>
                <label className="text-sm">Expires at (optional)<Input type="datetime-local" value={discountExpires} onChange={event => setDiscountExpires(event.target.value)} className="mt-2 h-11 rounded-none" /></label>
                <div className="md:col-span-2"><Button type="submit" disabled={savingDiscount} className="bg-black text-white rounded-none h-11 px-6">{savingDiscount ? 'Creating…' : 'Create discount code'}</Button></div>
              </form>
              {discountCodes.length ? <div className="divide-y border-t border-neutral-200">{discountCodes.map(code => <div key={code.id} className="flex flex-wrap items-center justify-between gap-4 py-4 text-sm"><div><p className="font-medium">{code.code} <span className="font-normal text-neutral-600">· {code.discount_type === 'percentage' ? `${Number(code.amount)}% off` : `$${Number(code.amount).toFixed(2)} off`}</span></p><p className="mt-1 text-xs text-neutral-600">{code.applies_to} · redeemed {code.redemption_count}{code.max_redemptions == null ? '' : ` / ${code.max_redemptions}`} · minimum ${Number(code.minimum_subtotal).toFixed(2)}{code.expires_at ? ` · expires ${new Date(code.expires_at).toLocaleString()}` : ''}</p></div><button type="button" onClick={() => void toggleDiscountCode(code)} className={`border px-3 py-2 text-xs ${code.active ? 'border-emerald-700 text-emerald-800' : 'border-neutral-400 text-neutral-600'}`}>{code.active ? 'Active · deactivate' : 'Inactive · activate'}</button></div>)}</div> : <p className="border-t pt-4 text-sm text-neutral-500">No discount codes created yet.</p>}
              <p className="text-xs text-neutral-500">Codes never collect payment. The usage counter increments only when an unpaid order successfully commits; failed orders do not consume a redemption.</p>
            </div>
          </section>

          {/* Account Settings */}
          <section>
            <h2 className="text-xl mb-6 tracking-tight">Account</h2>
            <div className="admin-panel p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label className="text-sm uppercase tracking-wider text-neutral-600 mb-2 block">
                    Name
                  </Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-12 border-neutral-300 rounded-none"
                  />
                </div>
                <div>
                  <Label className="text-sm uppercase tracking-wider text-neutral-600 mb-2 block">
                    Studio contact email
                  </Label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-12 border-neutral-300 rounded-none"
                  />
                </div>
              </div>

              <div>
                <Label className="text-sm uppercase tracking-wider text-neutral-600 mb-2 block">
                  Password
                </Label>
                {passwordFormOpen ? <form onSubmit={handlePasswordChange} className="max-w-md space-y-3">
                  <Input type="password" required minLength={8} maxLength={72} autoComplete="new-password" aria-label="New password" placeholder="New password" value={newPassword} onChange={event => setNewPassword(event.target.value)} className="h-12 border-neutral-300 rounded-none" />
                  <Input type="password" required minLength={8} maxLength={72} autoComplete="new-password" aria-label="Confirm new password" placeholder="Confirm new password" value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} className="h-12 border-neutral-300 rounded-none" />
                  <div className="flex gap-3">
                    <Button type="submit" disabled={savingPassword} className="bg-black text-white rounded-none h-11 px-5">{savingPassword ? 'Updating…' : 'Update password'}</Button>
                    <Button type="button" variant="outline" disabled={savingPassword} onClick={() => { setPasswordFormOpen(false); setNewPassword(''); setConfirmPassword(''); }} className="border-neutral-300 rounded-none h-11 px-5">Cancel</Button>
                  </div>
                </form> : <Button type="button" variant="outline" className="border-neutral-300 rounded-none h-12 px-6" onClick={() => setPasswordFormOpen(true)}>Change Password</Button>}
              </div>
            </div>
          </section>

          {/* Import System */}
          <section>
            <h2 className="text-xl mb-6 tracking-tight">Import Products</h2>
            <div className="admin-panel p-6">
              <p className="text-sm text-neutral-600 mb-6">
                Import products from a CSV file. Column names are matched to product fields automatically.
              </p>
              <label onDragOver={event=>event.preventDefault()} onDrop={event=>{event.preventDefault(); void handleCsvImport(event.dataTransfer.files[0]);}} className="block border-2 border-dashed border-neutral-300 p-12 text-center hover:border-neutral-400 transition-colors cursor-pointer">
                <Upload className="w-10 h-10 mx-auto mb-4 text-neutral-400" />
                <p className="text-sm mb-1">Drop your CSV file here or click to browse</p>
                <p className="text-xs text-neutral-500">
                  Supports CSV · Max 10MB
                </p>
                <input type="file" accept=".csv,text/csv" className="sr-only" onChange={event => handleCsvImport(event.target.files?.[0])} />
              </label>

              <div className="mt-6 p-4 bg-neutral-50 border border-neutral-200">
                <h3 className="text-sm mb-3">Field Mapping</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  {['Name', 'Price', 'Category', 'Collection', 'Description', 'Tags', 'Image URL', 'Status'].map(
                    (field) => (
                      <div
                        key={field}
                        className="admin-card flex items-center gap-2 p-2"
                      >
                        <span className="text-neutral-600">{field}</span>
                        <span className="text-neutral-400">→</span>
                        <span className="text-neutral-400">Column</span>
                      </div>
                    )
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Save */}
          <div className="flex items-center gap-4 pb-12">
            <Button
              onClick={handleSave}
              className="bg-black text-white hover:bg-neutral-800 rounded-none h-12 px-8"
            >
              <Save className="w-4 h-4 mr-2" />
              Save Settings
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
