import { useState } from "react";
import { useNavigate, Link } from "react-router";
import { useApp } from "../../context/AppContext";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { ArrowRight } from "lucide-react";
import heroImage from "../../../imports/image.png";

export function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { login } = useApp();
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="flex h-screen">
      <div className="hidden lg:block flex-1 relative overflow-hidden">
        <img
          src={heroImage}
          alt="DAIRI Fashion"
          className="w-full h-full object-cover"
          style={{ objectPosition: "64% center" }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to top, rgba(0,0,0,0.48) 0%, rgba(0,0,0,0.08) 55%, rgba(0,0,0,0.08) 100%)",
          }}
        />
        <div className="absolute left-12 top-10">
          <p className="text-4xl font-semibold uppercase tracking-[0.04em] text-white">
            DAIRI
          </p>
          <p className="mt-1 text-[9px] uppercase tracking-[3px] text-white/60">
            Admin Studio
          </p>
        </div>
        <div className="absolute bottom-12 left-12 max-w-md">
          <p className="mb-3 text-[10px] uppercase tracking-[4px] text-white/70">
            Catalog Management
          </p>
          <p className="text-4xl font-medium leading-tight text-white">
            Fashion operations, edited with restraint.
          </p>
        </div>
      </div>

      <div
        className="flex-1 flex flex-col items-center justify-center border-l border-black/10 bg-[#f4f4f2] p-8 lg:p-12"
      >
        <div className="w-full max-w-[430px]">
          <div className="mb-12">
            <h1 className="mb-1 text-4xl font-semibold uppercase tracking-[0.05em] text-black">
              DAIRI
            </h1>
            <p className="text-[9px] uppercase tracking-[3px] text-black/45">
              Admin Access
            </p>
          </div>

          <div className="mb-9 border-b border-black/10 pb-7">
            <p className="mb-3 text-[10px] uppercase tracking-[3px] text-black/40">
              Sign in
            </p>
            <h2 className="mb-2 text-3xl font-medium tracking-tight text-black">
              Welcome back
            </h2>
            <p className="text-sm leading-6 text-black/55">
              Manage products, collections, lookbooks, and the DAIRI storefront.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <Label
                htmlFor="email"
                className="text-[10px] tracking-[2px] uppercase block mb-2 text-black/55"
              >
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-12 rounded-none border-black/20 bg-white text-sm focus:border-black focus:ring-0"
                placeholder="your@email.com"
              />
            </div>

            <div>
              <Label
                htmlFor="password"
                className="text-[10px] tracking-[2px] uppercase block mb-2 text-black/55"
              >
                Password
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-12 rounded-none border-black/20 bg-white text-sm focus:border-black focus:ring-0"
                placeholder="••••••••"
              />
            </div>

            <div className="flex justify-end">
              <Link
                to="/auth/forgot-password"
                className="text-[10px] tracking-[1px] text-black/50 transition-opacity hover:opacity-60"
              >
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              className="admin-button mt-2 flex h-12 w-full items-center justify-center gap-3 bg-black text-xs uppercase tracking-[3px] text-white hover:bg-neutral-800"
            >
              Sign In <ArrowRight size={13} />
            </button>
          </form>

          <div className="mt-10 border-t border-black/10 pt-8 text-center">
            <p className="text-[10px] text-black/35">
              Demo: Use any email and password to sign in
            </p>
          </div>

          <div className="mt-6 text-center">
            <Link
              to="/store"
              className="text-[10px] uppercase tracking-[2px] text-black/55 transition-opacity hover:opacity-60"
            >
              ← Visit Store
            </Link>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
