import { requireRole } from "@/lib/auth-helpers";
import { dbConnect } from "@/lib/db";
import { Article } from "@/lib/models/article";
import { ARTICLE_CATEGORIES, type ArticleCategory } from "@/lib/constants";
import { toDateTimeLocal } from "@/lib/schemas/shared";
import { PageHeader } from "@/components/admin/page-header";
import { ArticleForm } from "../article-form";

function isCategory(value: string | undefined): value is ArticleCategory {
  return ARTICLE_CATEGORIES.includes(value as ArticleCategory);
}

export default async function NewArticlePage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  await requireRole();
  const { category: raw } = await searchParams;
  await dbConnect();

  // Preselect whichever section the user came from, so "New transfer story"
  // doesn't open a form defaulted to News.
  const category: ArticleCategory = isCategory(raw) ? raw : "News";

  const featured = await Article.findOne({ featured: true }).select("title").lean();

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title={category === "Transfer" ? "New transfer story" : "New article"}
        description="Publish to the site straight away."
      />
      <ArticleForm
        defaultCategory={category}
        defaultPublishedAt={toDateTimeLocal(new Date())}
        featuredElsewhere={featured?.title ?? null}
      />
    </div>
  );
}
