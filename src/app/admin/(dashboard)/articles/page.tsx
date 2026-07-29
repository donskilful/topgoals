import Link from "next/link";
import { requireRole } from "@/lib/auth-helpers";
import { dbConnect } from "@/lib/db";
import { Article } from "@/lib/models/article";
import { deleteArticle } from "@/lib/actions/articles";
import { EmptyState, PageHeader } from "@/components/admin/page-header";
import { DeleteRowForm } from "@/components/admin/delete-row-form";
import { SavedBanner } from "@/components/admin/saved-banner";

const dateFormatter = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" });

export default async function ArticlesPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  await requireRole();
  const { saved } = await searchParams;
  await dbConnect();

  const articles = await Article.find().sort({ publishedAt: -1 }).lean();

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Articles"
        description="News and transfer stories. The featured article drives the homepage hero."
        action={{ label: "New article", href: "/admin/articles/new" }}
      />

      <SavedBanner show={Boolean(saved)} />

      {articles.length === 0 ? (
        <EmptyState
          message="No articles yet."
          action={{ label: "Write the first one", href: "/admin/articles/new" }}
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line bg-charcoal">
          <table className="w-full min-w-[680px] border-collapse text-sm">
            <thead>
              <tr>
                {["Headline", "Category", "Published", ""].map((heading) => (
                  <th
                    key={heading}
                    className="border-b border-line px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wide text-floodlight-faint"
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {articles.map((article, i) => {
                const border = i === articles.length - 1 ? "" : "border-b border-line";
                return (
                  <tr key={String(article._id)}>
                    <td className={`px-4 py-3 ${border}`}>
                      <span className="font-semibold">{article.title}</span>
                      {article.featured ? (
                        <span className="ml-2 rounded bg-[rgba(245,185,66,0.14)] px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wide text-torch">
                          hero
                        </span>
                      ) : null}
                      <span className="mt-0.5 block font-mono text-[10px] text-floodlight-faint">
                        /{article.slug}
                      </span>
                    </td>
                    <td className={`px-4 py-3 text-floodlight-dim ${border}`}>{article.category}</td>
                    <td className={`px-4 py-3 font-mono text-[11px] text-floodlight-dim ${border}`}>
                      {dateFormatter.format(article.publishedAt)}
                    </td>
                    <td className={`px-4 py-3 ${border}`}>
                      <div className="flex items-center justify-end gap-3">
                        <Link
                          href={`/admin/articles/${String(article._id)}/edit`}
                          className="text-xs font-bold text-pitch-bright hover:underline"
                        >
                          Edit
                        </Link>
                        <DeleteRowForm
                          action={deleteArticle}
                          id={String(article._id)}
                          confirmMessage={`Delete “${article.title}”? This cannot be undone.`}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
