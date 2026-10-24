import { Link } from "react-router";
import { useState } from "react";
import dairiLogo from "../../../imports/dairi-logo.svg";
import { useApp } from "../../context/AppContext";

const footerColumns = [
  {
    title: "Contact Us",
    links: ["Contact Form"],
  },
  {
    title: "Customers",
    links: ["Start a Return", "Return Policy", "FAQ", "Catalogs and Mailers", "About Group Gifting"],
  },
  {
    title: "Company",
    links: ["About Us", "Sustainability", "Wholesale", "Discover Revive", "Careers", "Privacy Policy", "Terms"],
  },
];

export function StoreFooter() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const [subscribeError, setSubscribeError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { subscribe, settings } = useApp();

  const handleSubscribe = async () => {
    setSubmitting(true); setSubscribeError("");
    try { await subscribe(email); setSubscribed(true); setEmail(""); }
    catch (error) { setSubscribed(false); setSubscribeError(error instanceof Error ? error.message : "Could not subscribe. Please try again."); }
    finally { setSubmitting(false); }
  };

  return (
    <footer className="store-footer bg-black text-white">
      <div className="px-8 lg:px-10 py-16 lg:py-20">
        <div className="grid grid-cols-1 gap-10 border-b border-white/15 pb-12 lg:grid-cols-[1.2fr_.8fr] lg:items-start">
          <div>
            <Link
              to="/store"
              aria-label="DAIRI home"
              className="block max-w-[52vw]"
            >
              <img src={settings.logo || dairiLogo} alt={settings.brandName} className="block h-auto w-[190px] brightness-0 invert" />
            </Link>
          </div>

          <div className="max-w-[380px] lg:ml-auto">
            <h3 className="text-lg mb-4">Join the private list.</h3>
            <p className="mb-4 text-xs leading-5 text-white/55">
              Get collection notes, styling edits, and early access from the DAIRI studio.
            </p>
            <input
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setSubscribed(false);
              }}
              className="w-full bg-transparent border border-white/25 px-4 py-3 text-xs mb-3 text-white outline-none placeholder:text-white/35 focus:border-white"
              placeholder="Enter your email address"
              type="email"
            />
            <p className="text-[11px] leading-5 mb-4 text-white/52">
              By signing up, you agree to our{" "}
              <Link to="/store/support" className="underline underline-offset-2 hover:text-white">Privacy Policy</Link>{" "}
              and{" "}
              <Link to="/store/support" className="underline underline-offset-2 hover:text-white">Terms of Service</Link>.
            </p>
            <button disabled={submitting} className="store-button-motion bg-white text-black px-5 py-2.5 text-xs font-medium hover:bg-[#d9d2c8] disabled:opacity-50" onClick={handleSubscribe}>{submitting ? "Subscribing…" : "Subscribe"}</button>
            {subscribed && (
              <p className="text-xs mt-4 text-white/60">Thank you. You are on the list.</p>
            )}
            {subscribeError && <p role="alert" className="text-xs mt-4 text-red-300">{subscribeError}</p>}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr_1fr_1.7fr] gap-10 lg:gap-16 pt-12">
          {footerColumns.map((column) => (
            <div key={column.title}>
              <h3 className="text-[11px] uppercase tracking-[0.28em] text-white/42 mb-6">{column.title}</h3>
              <ul className="space-y-3">
                {column.links.map((item) => (
                  <li key={item}>
                    <Link to={item === "Wholesale" ? "/store/wholesale" : item === "Contact Form" || column.title === "Customers" || item.includes("Policy") || item === "FAQ" || item === "Terms" ? "/store/support" : "/store/journal"} className="text-sm text-white/75 hover:text-white">
                      {item}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div className="lg:text-right">
            <p className="text-sm leading-7 text-white/60">
              {settings.email && <a href={`mailto:${settings.email}`} className="hover:text-white">{settings.email}</a>}
            </p>
          </div>
        </div>

        <div className="mt-16 flex flex-col gap-4 border-t border-white/15 pt-8 text-xs text-white/42 md:flex-row md:items-center md:justify-between">
          <p>©{settings.brandName}</p>
          <div className="flex flex-wrap gap-5">
            <Link to="/store/support" className="hover:text-white">Privacy Policy</Link>
            <Link to="/store/support" className="hover:text-white">Terms</Link>
            <Link to="/store/support" className="hover:text-white">Accessibility</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
