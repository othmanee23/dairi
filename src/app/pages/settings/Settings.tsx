import { useEffect, useState } from 'react';
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
import { Upload, Save } from 'lucide-react';
import { toast } from 'sonner';
import { useApp } from '../../context/AppContext';
import { readOptimizedImage } from '../../utils/image';
import defaultProductImage from '../../../imports/image-1.webp';

export function Settings() {
  const { settings, updateSettings, addProduct } = useApp();
  const [brandName, setBrandName] = useState(settings.brandName);
  const [logo, setLogo] = useState(settings.logo);
  const [primaryColor, setPrimaryColor] = useState(settings.primaryColor);
  const [secondaryColor, setSecondaryColor] = useState(settings.secondaryColor);
  const [fontFamily, setFontFamily] = useState(settings.fontFamily);
  const [defaultFormat, setDefaultFormat] = useState(settings.defaultFormat);
  const [defaultLayout, setDefaultLayout] = useState(settings.defaultLayout);
  const [email, setEmail] = useState(settings.email);
  const [name, setName] = useState(settings.name);
  useEffect(() => { setBrandName(settings.brandName); setLogo(settings.logo); setPrimaryColor(settings.primaryColor); setSecondaryColor(settings.secondaryColor); setFontFamily(settings.fontFamily); setDefaultFormat(settings.defaultFormat); setDefaultLayout(settings.defaultLayout); setEmail(settings.email); setName(settings.name); }, [settings]);

  const handleSave = () => {
    updateSettings({ brandName, logo, primaryColor, secondaryColor, fontFamily, defaultFormat: defaultFormat as typeof settings.defaultFormat, defaultLayout: defaultLayout as typeof settings.defaultLayout, email, name });
    toast.success('Settings saved successfully');
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
    imported.forEach(addProduct); toast.success(`${imported.length} products imported`);
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
                    Email
                  </Label>
                  <Input
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
                <Button
                  variant="outline"
                  className="border-neutral-300 rounded-none h-12 px-6"
                  onClick={() => toast.info('Password changes require a connected authentication provider.')}
                >
                  Change Password
                </Button>
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
