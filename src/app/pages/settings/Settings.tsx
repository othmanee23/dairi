import { useState } from 'react';
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

export function Settings() {
  const [brandName, setBrandName] = useState('ATELIER');
  const [primaryColor, setPrimaryColor] = useState('#000000');
  const [secondaryColor, setSecondaryColor] = useState('#f5f5f5');
  const [fontFamily, setFontFamily] = useState('inter');
  const [defaultFormat, setDefaultFormat] = useState('a4');
  const [defaultLayout, setDefaultLayout] = useState('editorial');
  const [email, setEmail] = useState('studio@atelier.com');
  const [name, setName] = useState('Creative Director');

  const handleSave = () => {
    toast.success('Settings saved successfully');
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
                    {brandName}
                  </div>
                  <label className="cursor-pointer">
                    <div className="flex items-center gap-2 px-4 py-2 border border-neutral-300 hover:bg-neutral-50 transition-colors">
                      <Upload className="w-4 h-4" />
                      <span className="text-sm">Upload Logo</span>
                    </div>
                    <input type="file" accept="image/*" className="hidden" />
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
                Import products from a CSV file or Google Sheets. Map your columns to the
                correct fields during import.
              </p>
              <div className="border-2 border-dashed border-neutral-300 p-12 text-center hover:border-neutral-400 transition-colors cursor-pointer">
                <Upload className="w-10 h-10 mx-auto mb-4 text-neutral-400" />
                <p className="text-sm mb-1">Drop your CSV file here or click to browse</p>
                <p className="text-xs text-neutral-500">
                  Supports: .csv, .xlsx — Max 10MB
                </p>
              </div>

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
