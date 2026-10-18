import { Outlet, Link, useLocation, useNavigate } from "react-router";
import { useApp } from "../context/AppContext";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Package,
  Layers,
  BookOpen,
  Settings as SettingsIcon,
  LogOut,
  ExternalLink,
  Menu,
  X,
  ChevronRight,
  MessageCircle,
} from "lucide-react";
import dairiLogo from "../../imports/dairi-logo.svg";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Products", href: "/products", icon: Package },
  { name: "Collections", href: "/collections", icon: Layers },
  { name: "Lookbooks", href: "/lookbooks", icon: BookOpen },
  { name: "Client activity", href: "/activity", icon: MessageCircle },
  { name: "Settings", href: "/settings", icon: SettingsIcon },
];

export function RootLayout() {
  const { isAuthenticated, logout } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) navigate("/auth/login");
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  if (!isAuthenticated) return null;

  const currentPage = navigation.find((item) =>
    item.href === "/" ? location.pathname === "/" : location.pathname.startsWith(item.href)
  )?.name ?? "Admin Studio";

  const handleLogout = () => {
    logout();
    navigate("/auth/login");
  };

  return (
    <div className="admin-shell flex min-h-screen">
      {mobileNavOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          className="admin-sidebar-backdrop fixed inset-0 z-40 bg-black/35 lg:hidden"
          onClick={() => setMobileNavOpen(false)}
        />
      )}

      <aside className={`admin-sidebar fixed inset-y-0 left-0 z-50 flex w-[264px] flex-col border-r transition-transform duration-300 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${mobileNavOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="admin-brand flex h-[104px] items-center border-b px-7">
          <Link to="/" aria-label="DAIRI Admin home" className="block w-[150px]">
            <img src={dairiLogo} alt="DAIRI" className="block h-auto w-full" />
          </Link>
          <button
            type="button"
            aria-label="Close navigation"
            className="ml-auto inline-flex h-9 w-9 items-center justify-center text-black/55 hover:bg-black/5 lg:hidden"
            onClick={() => setMobileNavOpen(false)}
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 px-4 py-7" aria-label="Admin navigation">
          <p className="admin-nav-label mb-3 px-3">Workspace</p>
          <ul className="space-y-1">
            {navigation.map((item) => {
              const isActive = item.href === "/" ? location.pathname === "/" : location.pathname.startsWith(item.href);
              return (
                <li key={item.name}>
                  <Link to={item.href} aria-current={isActive ? "page" : undefined} className={`admin-nav-link group flex h-11 items-center gap-3 px-3 text-sm ${isActive ? "is-active" : ""}`}>
                    <item.icon className="h-[17px] w-[17px] shrink-0" strokeWidth={1.7} />
                    <span className="flex-1">{item.name}</span>
                    {isActive && <ChevronRight className="h-4 w-4 opacity-60" />}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="admin-sidebar-bottom border-t p-4">
          <Link to="/store" className="admin-nav-link flex h-11 items-center gap-3 px-3 text-sm">
            <ExternalLink className="h-[17px] w-[17px] shrink-0" strokeWidth={1.7} />
            <span>View Store</span>
          </Link>
          <button onClick={handleLogout} className="admin-nav-link flex h-11 w-full items-center gap-3 px-3 text-left text-sm">
            <LogOut className="h-[17px] w-[17px] shrink-0" strokeWidth={1.7} />
            <span>Sign out</span>
          </button>
          <div className="admin-session mt-4 flex items-center gap-3 border-t px-2 pt-4">
            <span className="admin-session-mark flex h-9 w-9 items-center justify-center text-xs font-semibold">D</span>
            <span className="min-w-0">
              <span className="block truncate text-xs font-medium">DAIRI Studio</span>
              <span className="mt-1 block text-[10px] text-black/45">Administrator</span>
            </span>
          </div>
        </div>
      </aside>

      <div className="admin-workspace flex min-h-screen min-w-0 flex-1 flex-col lg:min-h-0">
        <header className="admin-topbar sticky top-0 z-30 flex h-[64px] shrink-0 items-center justify-between border-b px-5 sm:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              aria-label="Open navigation"
              className="inline-flex h-9 w-9 items-center justify-center text-black/65 hover:bg-black/5 lg:hidden"
              onClick={() => setMobileNavOpen(true)}
            >
              <Menu size={19} />
            </button>
            <div className="flex min-w-0 items-center gap-2 text-sm">
              <span className="hidden text-black/40 sm:inline">DAIRI</span>
              <ChevronRight className="hidden h-3.5 w-3.5 text-black/30 sm:inline" />
              <span className="truncate font-medium">{currentPage}</span>
            </div>
          </div>
          <Link to="/store" className="admin-topbar-store inline-flex items-center gap-2 text-xs font-medium">
            <span>Open storefront</span>
            <ExternalLink size={14} />
          </Link>
        </header>
        <main className="admin-main min-w-0 flex-1 overflow-x-hidden overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
