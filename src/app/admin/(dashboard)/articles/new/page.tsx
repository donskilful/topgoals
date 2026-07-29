import { requireRole } from "@/lib/auth-helpers";
import { dbConnect } from "@/lib/db";
import { Article } from "@/lib/models/article";
import { toDateTimeLocal } from "@/lib/schemas/shared";
import { PageHeader } from "@/components/admin/page-header";
import { ArticleForm } from "../article-form";

export default async function NewArticlePage() {
  await requireRole();
  await dbConnect();

  const featured = await Article.findOne({ featured: true }).select("title").lean();

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="New article" description="Publish a news or transfer story." />
      <ArticleForm
        defaultPublishedAt={toDateTimeLocal(new Date())}
        featuredElsewhere={featured?.title ?? null}
      />
    </div>
  );
}
