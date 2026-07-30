import { notFound } from "next/navigation";
import mongoose from "mongoose";
import { requireRole } from "@/lib/auth-helpers";
import { dbConnect } from "@/lib/db";
import { Article } from "@/lib/models/article";
import { toDateTimeLocal } from "@/lib/schemas/shared";
import { PageHeader } from "@/components/admin/page-header";
import { ArticleForm } from "../../article-form";

export default async function EditArticlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole();
  const { id } = await params;

  if (!mongoose.Types.ObjectId.isValid(id)) notFound();

  await dbConnect();
  const article = await Article.findById(id).lean();
  if (!article) notFound();

  const otherFeatured = article.featured
    ? null
    : await Article.findOne({ featured: true }).select("title").lean();

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Edit article" description={article.title} />
      <ArticleForm
        defaultPublishedAt={toDateTimeLocal(article.publishedAt)}
        featuredElsewhere={otherFeatured?.title ?? null}
        article={{
          id: String(article._id),
          category: article.category,
          title: article.title,
          excerpt: article.excerpt,
          body: article.body,
          publishedAt: toDateTimeLocal(article.publishedAt),
          image: article.image
            ? { secureUrl: article.image.secureUrl, publicId: article.image.publicId }
            : null,
          featured: article.featured ?? false,
          heroEyebrow: article.heroEyebrow ?? "",
          heroHeadline: article.heroHeadline ?? "",
          heroHeadlineAccent: article.heroHeadlineAccent ?? "",
          heroDescription: article.heroDescription ?? "",
          heroPrimaryCtaLabel: article.heroPrimaryCtaLabel ?? "",
          heroPrimaryCtaHref: article.heroPrimaryCtaHref ?? "",
          heroSecondaryCtaLabel: article.heroSecondaryCtaLabel ?? "",
          heroSecondaryCtaHref: article.heroSecondaryCtaHref ?? "",
        }}
      />
    </div>
  );
}
