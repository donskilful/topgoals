import { dbConnect } from "@/lib/db";
import { Article } from "@/lib/models/article";
import { relativeTime } from "@/lib/format";
import type { ArticleCategory } from "@/lib/constants";

/**
 * Read helpers for the public site.
 *
 * Everything returns plain, serialisable objects with `id: string` rather than
 * Mongoose documents: ObjectIds and hydrated docs can't cross into a Client
 * Component, and keeping the mapping here means UI props stay decoupled from the
 * database shape.
 */

export type NewsCard = {
  id: string;
  slug: string;
  tag: ArticleCategory;
  title: string;
  excerpt: string;
  time: string;
  imageUrl: string | null;
};

export type HeroContent = {
  slug: string;
  eyebrow: string;
  headline: string;
  headlineAccent: string | null;
  description: string;
  primaryCta: { label: string; href: string };
  secondaryCta: { label: string; href: string };
  imageUrl: string | null;
};

export async function getFeaturedArticle(): Promise<HeroContent | null> {
  await dbConnect();

  const article = await Article.findOne({ featured: true }).lean();
  if (!article) return null;

  return {
    slug: article.slug,
    eyebrow: article.heroEyebrow ?? article.category,
    // The hero fields are required when featuring, but fall back to the article's
    // own copy so a hand-edited database row can't render a blank hero.
    headline: article.heroHeadline ?? article.title,
    headlineAccent: article.heroHeadlineAccent ?? null,
    description: article.heroDescription ?? article.excerpt,
    primaryCta: {
      label: article.heroPrimaryCtaLabel || "Read more",
      href: article.heroPrimaryCtaHref || `/articles/${article.slug}`,
    },
    secondaryCta: {
      label: article.heroSecondaryCtaLabel || "Latest news",
      href: article.heroSecondaryCtaHref || `/articles/${article.slug}`,
    },
    imageUrl: article.image?.secureUrl ?? null,
  };
}

function toNewsCard(article: {
  _id: unknown;
  slug: string;
  category: ArticleCategory;
  title: string;
  excerpt: string;
  publishedAt: Date;
  image?: { secureUrl: string } | null;
}): NewsCard {
  return {
    id: String(article._id),
    slug: article.slug,
    tag: article.category,
    title: article.title,
    excerpt: article.excerpt,
    time: relativeTime(article.publishedAt),
    imageUrl: article.image?.secureUrl ?? null,
  };
}

/** The "Right Now" teasers beside the hero — the newest stories that aren't the hero. */
export async function getHeroSideStories(limit = 2): Promise<NewsCard[]> {
  await dbConnect();

  const articles = await Article.find({ featured: { $ne: true } })
    .sort({ publishedAt: -1 })
    .limit(limit)
    .lean();

  return articles.map(toNewsCard);
}

export async function getLatestNews(limit = 4): Promise<NewsCard[]> {
  await dbConnect();

  const articles = await Article.find().sort({ publishedAt: -1 }).limit(limit).lean();
  return articles.map(toNewsCard);
}

export async function getArticlesByCategory(
  category: ArticleCategory,
  limit = 20,
): Promise<NewsCard[]> {
  await dbConnect();

  const articles = await Article.find({ category }).sort({ publishedAt: -1 }).limit(limit).lean();
  return articles.map(toNewsCard);
}
