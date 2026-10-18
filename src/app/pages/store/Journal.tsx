import { Link } from "react-router";

import { StoreFooter } from "../../components/store/StoreFooter";
import { StoreHeader } from "../../components/store/StoreHeader";
import { journalPosts } from "../../data/journal";
import heroImage from "../../../imports/image.png";

export function Journal() {
  const [featured, ...posts] = journalPosts;

  return (
    <div className="store-page min-h-screen bg-white" style={{ fontFamily: "Inter, sans-serif" }}>
      <StoreHeader />

      <main>
        <section className="relative h-[640px] overflow-hidden bg-[#e6e4e1]">
          <img src={heroImage} alt="DAIRI journal hero" className="store-hero-image absolute inset-0 h-full w-full object-cover object-top" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/35 via-black/5 to-transparent" />
          <div className="relative z-10 h-full flex items-end px-8 lg:px-10 pb-16">
            <h1 className="text-white text-3xl max-w-[360px] leading-tight">We are DAIRI. We create fashion.</h1>
          </div>
        </section>

        <section className="px-8 lg:px-10 py-12">
          <h2 className="text-2xl font-semibold mb-8">Last News</h2>
          <Link to={`/store/journal/${featured.id}`} className="store-card relative block overflow-hidden mb-12">
            <img src={featured.image} alt={featured.title} className="w-full h-[520px] object-cover object-center" />
            <div className="absolute left-16 top-16 bg-white max-w-[560px] p-14">
              <p className="text-[11px] uppercase tracking-wide text-black/55 mb-6">{featured.category}</p>
              <h3 className="text-2xl leading-tight mb-3">{featured.title}</h3>
              <p className="text-xs text-black/55">{featured.date}</p>
            </div>
          </Link>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-14">
            {posts.map((post) => (
              <Link key={post.id} to={`/store/journal/${post.id}`} className="store-card block">
                <img src={post.image} alt={post.title} className="aspect-[4/3] w-full object-cover object-top mb-5 bg-[#f4f4f4]" />
                <p className="text-[11px] uppercase tracking-wide text-black/55 mb-3">{post.category}</p>
                <h3 className="text-2xl leading-tight mb-2">{post.title}</h3>
                <p className="text-xs text-black/45">{post.date}</p>
              </Link>
            ))}
          </div>
        </section>
      </main>

      <StoreFooter />
    </div>
  );
}
