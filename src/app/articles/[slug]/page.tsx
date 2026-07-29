import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getAllArticleSlugs,
  getArticleBySlug,
  getRelatedArticles,
} from "@/lib/data/articles";
import { ArticleGrid } from "@/components/article-grid";
import { PublicPage } from "@/components/public-page";
import { Tag } from "@/components/tag";

export const revalidate = 60;

/**
 * Prerender the articles that exist at build time; new ones render on first request.
 *
 * A database blip must not fail the whole deploy, so a failure here degrades to
 * prerendering nothing — every article then renders on first request and is cached
 * from that point, which is a slower first hit rather than a broken build.
 */
export async function generateStaticParams() {
  try {
    const slugs = await getAllArticleSlugs();
    return slugs.map((slug) => ({ slug }));
  } catch (error) {
    console.warn(
      "Could not load article slugs for prerendering; they will be generated on demand.",
      error,
    );
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);

  if (!article) return { title: "Article not found — TopGoals" };

  return {
    title: `${article.title} — TopGoals`,
    description: article.excerpt,
    openGraph: {
      title: article.title,
      description: article.excerpt,
      type: "article",
      publishedTime: article.publishedAt,
      images: article.imageUrl ? [article.imageUrl] : undefined,
    },
  };
}

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "long",
  timeStyle: "short",
});

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);

  if (!article) notFound();

  const related = await getRelatedArticles(article.slug, article.category);

  return (
    <PublicPage>
      <article className="mx-auto max-w-[68ch]">
        <Link
          href={article.category === "Transfer" ? "/transfers" : "/news"}
          className="mb-5 inline-block text-[13px] font-bold text-pitch-bright hover:underline"
        >
          ← {article.category === "Transfer" ? "All transfers" : "All news"}
        </Link>

        <Tag tag={article.category} />

        <h1 className="mb-3 mt-3 font-display text-[clamp(1.9rem,4.5vw,2.9rem)] uppercase leading-[1.05] tracking-wide">
          {article.title}
        </h1>

        <p className="mb-4 text-[16px] leading-relaxed text-floodlight-dim">{article.excerpt}</p>

        <p className="mb-7 font-mono text-[11px] uppercase tracking-wide text-floodlight-faint">
          <time dateTime={article.publishedAt}>
            {dateFormatter.format(new Date(article.publishedAt))}
          </time>{" "}
          · {article.time}
        </p>

        {article.imageUrl ? (
          <div className="mb-8 overflow-hidden rounded-xl border border-line">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={article.imageUrl} alt="" className="w-full object-cover" />
          </div>
        ) : null}

        <div className="flex flex-col gap-5 text-[16px] leading-[1.75] text-floodlight">
          {article.paragraphs.map((paragraph, i) => (
            <p key={i}>{paragraph}</p>
          ))}
        </div>
      </article>

      {related.length > 0 ? (
        <section className="mt-14 border-t border-dashed border-line pt-8">
          <h2 className="mb-4 font-display text-2xl uppercase tracking-wide">Read next</h2>
          <ArticleGrid articles={related} />
        </section>
      ) : null}
    </PublicPage>
  );
}
