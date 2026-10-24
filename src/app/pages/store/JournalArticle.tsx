import { Link, useParams } from "react-router";

import { StoreFooter } from "../../components/store/StoreFooter";
import { StoreHeader } from "../../components/store/StoreHeader";
import { journalPosts } from "../../data/journal";
import { usePageSeo } from "../../lib/seo";

export function JournalArticle() {
  const { id } = useParams();
  const article = journalPosts.find((post) => post.id === id) ?? journalPosts[0];
  usePageSeo({ title: `${article.title} | DAIRI Journal`, description: `${article.title} — notes from the DAIRI studio on fashion, materials, and considered design.`, path: `/store/journal/${article.id}`, image: article.image });
  const latest = journalPosts.filter((post) => post.id !== article.id).slice(0, 4);

  return (
    <div className="store-page min-h-screen bg-white" style={{ fontFamily: "Inter, sans-serif" }}>
      <StoreHeader />

      <main className="px-8 lg:px-16 py-16">
        <section className="max-w-[1180px] mx-auto">
          <p className="text-[11px] uppercase tracking-wide text-black/55 mb-5">{article.category}</p>
          <h1 className="text-3xl lg:text-4xl leading-tight max-w-[900px] mb-2">{article.title}</h1>
          <p className="text-xs uppercase text-black/45 mb-14">{article.date}</p>
          <img src={article.image} alt={article.title} className="w-full max-h-[520px] object-cover object-center mb-20" />
        </section>

        <article className="max-w-[720px] mx-auto text-sm leading-6 space-y-6">
          <p>
            DAIRI is moving forward in its journey towards sustainability and conscious design. We believe a wardrobe should
            be built from fewer, better pieces that are beautiful, long lasting, and responsible from fiber to finish.
          </p>
          <p>
            To achieve this, our teams continue to refine materials, sourcing, and product development with a focus on
            traceability. Each collection is designed to reduce excess and invite a more intentional way of getting dressed.
          </p>
          <p>
            The commitment to include more sustainable fibers and more responsible processes is a key pillar of DAIRI's
            value proposal. We work with partners who share our standards for quality, durability, and care for people.
          </p>
          <p>
            These initiatives are part of a longer vision: clothing that feels modern today and remains relevant for years.
            That is the foundation of our aesthetic, our product philosophy, and our promise to customers.
          </p>
        </article>

        <section className="max-w-[1180px] mx-auto mt-28">
          <h2 className="text-center text-2xl mb-12">Discover the latest</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {latest.map((post) => (
              <Link key={post.id} to={`/store/journal/${post.id}`} className="store-card block">
                <img src={post.image} alt={post.title} className="aspect-[4/5] object-cover object-top mb-4 bg-[#f4f4f4]" />
                <p className="text-[11px] uppercase tracking-wide text-black/55 mb-3">{post.category}</p>
                <h3 className="text-xl leading-tight mb-2">{post.title}</h3>
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
