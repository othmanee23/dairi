import { ChevronRight, CreditCard, RotateCcw, Truck, User, Shirt } from "lucide-react";
import { useState } from "react";

import { StoreFooter } from "../../components/store/StoreFooter";
import { StoreHeader } from "../../components/store/StoreHeader";
import { useApp } from "../../context/AppContext";
import { usePageSeo } from "../../lib/seo";

const categories = [
  { label: "Delivery and order tracking", icon: Truck },
  { label: "Returns, exchanges and refunds", icon: RotateCcw },
  { label: "Payments and promotions", icon: CreditCard },
  { label: "Information on sizes and products", icon: Shirt },
  { label: "Personal data and notifications", icon: User },
];

const helpTopics: Record<string, { question: string; answer: string }[]> = {
  "Delivery and order tracking": [
    { question: "Where can I check my order status?", answer: "Sign in to your DAIRI customer account and open My Orders. Tracking details appear there after the studio marks an order as shipped. For a guest order, send the studio your order number using the contact form below." },
    { question: "When will tracking information be available?", answer: "The studio adds tracking when the parcel is ready to ship. You can then follow the carrier link from your account or the shipment email." },
    { question: "Can I change my delivery address?", answer: "Contact the studio as soon as possible and include your order number. Address changes depend on whether the order has shipped." },
  ],
  "Returns, exchanges and refunds": [
    { question: "What is the return or exchange policy?", answer: "DAIRI’s return and exchange terms need the client’s final approval before they can be published. Contact the studio before sending an item back so they can advise you." },
    { question: "How do I report an incorrect or damaged item?", answer: "Use the contact form below with your order number and a short description. The studio will review the details and respond with next steps." },
  ],
  "Payments and promotions": [
    { question: "Can I pay online?", answer: "Online payment is not enabled yet. Checkout submits an unpaid order for studio review; no payment is collected." },
    { question: "How are shipping and tax confirmed?", answer: "Checkout shows configured estimates where available. Any unconfigured shipping or tax amount is confirmed by the studio before payment." },
    { question: "How do discount codes work?", answer: "Enter an active code at checkout. The studio validates it against the order before saving the unpaid order." },
  ],
  "Information on sizes and products": [
    { question: "How do I choose a size?", answer: "Open a product page and select Size Chart for a general guide. Product measurements and fit notes should be checked against each item’s description." },
    { question: "How can I ask about a fabric or product detail?", answer: "Send the product name or style number through the contact form below and the studio can confirm the details." },
  ],
  "Personal data and notifications": [
    { question: "How do I contact DAIRI about my personal data?", answer: "Use the contact form below and state what account or email address your request concerns. The studio will follow up directly." },
    { question: "How do I join or update email notifications?", answer: "Use the private list form in the store header or footer to subscribe. To change or remove a subscription, contact the studio using the form below." },
    { question: "Where are the privacy and terms policies?", answer: "The final privacy policy and terms of service must be supplied and approved by DAIRI before launch." },
  ],
};

export function Support() {
  usePageSeo({ title: 'Customer Support | DAIRI', description: 'Get help with DAIRI order tracking, wholesale, product details, delivery, and account questions.', path: '/store/support' });
  const [activeCategory, setActiveCategory] = useState(categories[0].label);
  const [openQuestion, setOpenQuestion] = useState(helpTopics[categories[0].label][0].question);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const { submitSupportRequest } = useApp();
  const currentTopics = helpTopics[activeCategory];
  const handleSubmit = async (event: React.FormEvent) => { event.preventDefault(); setSubmitting(true); setSubmitError(""); try { await submitSupportRequest(email, message); setSent(true); setEmail(""); setMessage(""); } catch (error) { setSubmitError(error instanceof Error ? error.message : "Could not send your request. Please try again."); } finally { setSubmitting(false); } };

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
                  onClick={() => { setActiveCategory(category.label); setOpenQuestion(helpTopics[category.label][0]?.question ?? ""); }}
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
            <h2 className="text-4xl mb-7">How can we help?</h2>
            <p className="max-w-[760px] leading-7 mb-20">Choose a topic for guidance, or contact the DAIRI studio below. Signed-in customers can review order status and shipment tracking in their account.</p>

            <h3 className="text-2xl mb-8">{activeCategory}</h3>
            <div className="max-w-[820px]">
              {currentTopics.map(({ question, answer }) => (
                <div key={question} className="border-b border-black/15">
                  <button
                    className="w-full flex items-center justify-between py-5 text-left"
                    onClick={() => setOpenQuestion(openQuestion === question ? "" : question)}
                  >
                    <span>{question}</span>
                    <ChevronRight size={18} className={openQuestion === question ? "rotate-90 transition-transform" : "transition-transform"} />
                  </button>
                  {openQuestion === question && (
                    <p className="pb-5 text-sm leading-6 text-black/65">{answer}</p>
                  )}
                </div>
              ))}
            </div>
            <form onSubmit={handleSubmit} className="max-w-[820px] mt-16 border-t border-black/10 pt-8 space-y-4">
              <h3 className="text-2xl">Contact the DAIRI team</h3>
              <label className="block text-sm">Email address<input required type="email" value={email} onChange={e=>setEmail(e.target.value)} className="block w-full border border-black/20 p-3 mt-2"/></label>
              <label className="block text-sm">How can we help?<textarea required minLength={8} value={message} onChange={e=>setMessage(e.target.value)} className="block w-full border border-black/20 p-3 mt-2 min-h-32"/></label>
              <button disabled={submitting} className="bg-black text-white px-6 py-3 text-sm disabled:opacity-50">{submitting ? "Sending…" : "Send request"}</button>
              {submitError && <p role="alert" className="text-sm text-red-700">{submitError}</p>}
              {sent && <p role="status" className="text-sm">Your request is saved. The studio will follow up at your email.</p>}
            </form>
          </section>
        </div>
      </main>

      <StoreFooter />
    </div>
  );
}
