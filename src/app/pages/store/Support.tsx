import { ChevronRight, CreditCard, RotateCcw, Truck, User, Shirt } from "lucide-react";
import { useState } from "react";

import { StoreFooter } from "../../components/store/StoreFooter";
import { StoreHeader } from "../../components/store/StoreHeader";
import { useApp } from "../../context/AppContext";

const categories = [
  { label: "Delivery and order tracking", icon: Truck, active: true },
  { label: "Returns, exchanges and refunds", icon: RotateCcw },
  { label: "Payments and promotions", icon: CreditCard },
  { label: "Information on sizes and products", icon: Shirt },
  { label: "Personal data and notifications", icon: User },
];

const questions = [
  "Where is my order?",
  "What are the types of delivery and delivery times for a DAIRI order?",
  "Can I change the delivery address of an order?",
  "Can I cancel my order?",
  "What should I do if I have not received all the items in my purchase?",
  "What should I do if I have received an incorrect or defective item?",
];

export function Support() {
  const [activeCategory, setActiveCategory] = useState(categories[0].label);
  const [openQuestion, setOpenQuestion] = useState(questions[0]);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const { submitSupportRequest } = useApp();
  const handleSubmit = (event: React.FormEvent) => { event.preventDefault(); submitSupportRequest(email, message); setSent(true); setEmail(""); setMessage(""); };

  return (
    <div className="store-page min-h-screen bg-white" style={{ fontFamily: "Inter, sans-serif" }}>
      <StoreHeader />

      <main className="px-8 lg:px-40 py-24">
        <div className="grid grid-cols-1 lg:grid-cols-[310px_1fr] gap-20">
          <aside>
            <h1 className="text-2xl mb-10">Categories</h1>
            <div className="space-y-8">
              {categories.map((category) => (
                <button
                  key={category.label}
                  onClick={() => setActiveCategory(category.label)}
                  className="store-button-motion flex items-center gap-4 text-left"
                  style={{ color: activeCategory === category.label ? "#111" : "rgba(0,0,0,.5)" }}
                >
                  <category.icon size={20} />
                  <span className="text-base">{category.label}</span>
                </button>
              ))}
            </div>
          </aside>

          <section>
            <h2 className="text-4xl mb-7">Where is my order?</h2>
            <p className="max-w-[760px] leading-7 mb-20">
              Check the details of your in-store and online purchases, and know their status at any moment in My purchases.
              If you already have an account, log in with your e-mail address and password. If you purchased as a guest,
              enter your e-mail address and the order number you wish to consult.
            </p>

            <h3 className="text-2xl mb-8">{activeCategory}</h3>
            <div className="max-w-[820px]">
              {questions.map((question) => (
                <div key={question} className="border-b border-black/15">
                  <button
                    className="w-full flex items-center justify-between py-5 text-left"
                    onClick={() => setOpenQuestion(openQuestion === question ? "" : question)}
                  >
                    <span>{question}</span>
                    <ChevronRight size={18} className={openQuestion === question ? "rotate-90 transition-transform" : "transition-transform"} />
                  </button>
                  {openQuestion === question && (
                    <p className="pb-5 text-sm leading-6 text-black/65">
                      Sign in to your DAIRI account to view order status, delivery updates, and return options. Guest orders can be checked with the email address and order number used at checkout.
                    </p>
                  )}
                </div>
              ))}
            </div>
            <form onSubmit={handleSubmit} className="max-w-[820px] mt-16 border-t border-black/10 pt-8 space-y-4">
              <h3 className="text-2xl">Contact the DAIRI team</h3>
              <label className="block text-sm">Email address<input required type="email" value={email} onChange={e=>setEmail(e.target.value)} className="block w-full border border-black/20 p-3 mt-2"/></label>
              <label className="block text-sm">How can we help?<textarea required minLength={8} value={message} onChange={e=>setMessage(e.target.value)} className="block w-full border border-black/20 p-3 mt-2 min-h-32"/></label>
              <button className="bg-black text-white px-6 py-3 text-sm">Send request</button>
              {sent && <p role="status" className="text-sm">Your request is saved. The studio will follow up at your email.</p>}
            </form>
          </section>
        </div>
      </main>

      <StoreFooter />
    </div>
  );
}
