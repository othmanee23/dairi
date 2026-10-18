import { Link } from "react-router";
import { useState } from "react";
import dairiLogo from "../../../imports/dairi-logo.svg";

const footerColumns = [
  {
    title: "Contact Us",
    links: ["+1 (844) 326-6000", "Email Us", "Mon-Fri 9am-3pm PT"],
  },
  {
    title: "Customers",
    links: ["Start a Return", "Return Policy", "FAQ", "Catalogs and Mailers", "About Group Gifting"],
  },
  {
    title: "Company",
    links: ["About Us", "Sustainability", "Discover Revive", "Careers", "Privacy Policy", "Terms"],
  },
];

export function StoreFooter() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = () => {
    if (!email.trim()) return;
    setSubscribed(true);
    setEmail("");
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
              <img src={dairiLogo} alt="DAIRI" className="block h-auto w-[190px] brightness-0 invert" />
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
            />
            <p className="text-[11px] leading-5 mb-4 text-white/52">
              By signing up, you agree to our{" "}
              <Link to="/store/support" className="underline underline-offset-2 hover:text-white">Privacy Policy</Link>{" "}
              and{" "}
              <Link to="/store/support" className="underline underline-offset-2 hover:text-white">Terms of Service</Link>.
            </p>
            <button className="store-button-motion bg-white text-black px-5 py-2.5 text-xs font-medium hover:bg-[#d9d2c8]" onClick={handleSubscribe}>Subscribe</button>
            {subscribed && (
              <p className="text-xs mt-4 text-white/60">Thank you. You are on the list.</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr_1fr_1.7fr] gap-10 lg:gap-16 pt-12">
          {footerColumns.map((column) => (
            <div key={column.title}>
              <h3 className="text-[11px] uppercase tracking-[0.28em] text-white/42 mb-6">{column.title}</h3>
              <ul className="space-y-3">
                {column.links.map((item) => (
                  <li key={item}>
                    <Link to={item.includes("Policy") || item === "FAQ" ? "/store/support" : "/store/journal"} className="text-sm text-white/75 hover:text-white">
                      {item}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div className="lg:text-right">
            <p className="text-sm leading-7 text-white/60">
              850 S Broadway, Los Angeles
              <br />
              care@dairifashion.com
              <br />
              Mon-Fri 9am-3pm PT
            </p>
          </div>
        </div>

        <div className="mt-16 flex flex-col gap-4 border-t border-white/15 pt-8 text-xs text-white/42 md:flex-row md:items-center md:justify-between">
          <p>©DAIRI</p>
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
