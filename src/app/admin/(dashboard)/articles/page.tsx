import Link from "next/link";
import { requireRole } from "@/lib/auth-helpers";
import { dbConnect } from "@/lib/db";
import { Article } from "@/lib/models/article";
import { deleteArticle } from "@/lib/actions/articles";
import { dateTimeFormatter } from "@/lib/format";
import { ARTICLE_CATEGORIES, type ArticleCategory } from "@/lib/constants";
import { EmptyState, PageHeader } from "@/components/admin/page-header";
import { DeleteRowForm } from "@/components/admin/delete-row-form";
import { SavedBanner } from "@/components/admin/saved-banner";


const COPY: Record<ArticleCategory, { title: string; description: string; newLabel: string }> = {
  News: {
    title: "News",
    description: "Match reports, analysis and general football news.",
    newLabel: "New article",
  },
  Transfer: {
    title: "Transfer News",
    description: "Completed deals, contract renewals and moves in progress.",
    newLabel: "New transfer story",
  },
};

function isCategory(value: string | undefined): value is ArticleCategory {
  return ARTICLE_CATEGORIES.includes(value as ArticleCategory);
}

export default async function ArticlesPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; category?: string }>;
}) {
  await requireRole();
  const { saved, category: raw } = await searchParams;
  await dbConnect();

  // No category means the News view — the default landing spot for articles.
  const category: ArticleCategory = isCategory(raw) ? raw : "News";
  const copy = COPY[category];

  const [articles, counts] = await Promise.all([
    Article.find({ category }).sort({ publishedAt: -1 }).lean(),
    Article.aggregate<{ _id: ArticleCategory; count: number }>([
      { $group: { _id: "$category", count: { $sum: 1 } } },
    ]),
  ]);

  const countFor = (c: ArticleCategory) => counts.find((row) => row._id === c)?.count ?? 0;

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title={copy.title}
        description={copy.description}
        action={{ label: copy.newLabel, href: `/admin/articles/new?category=${category}` }}
      />

      <SavedBanner show={Boolean(saved)} />

      {/* Both categories are the same underlying model, so switching is just a filter. */}
      <div className="mb-5 flex gap-1 rounded-lg border border-line bg-charcoal p-1">
        {ARTICLE_CATEGORIES.map((option) => {
          const active = option === category;
          return (
            <Link
              key={option}
              href={`/admin/articles?category=${option}`}
              aria-current={active ? "page" : undefined}
              className={`flex-1 rounded-md px-3 py-2 text-center text-[13px] font-semibold transition-colors ${
                active
                  ? "bg-charcoal-3 text-floodlight"
                  : "text-floodlight-dim hover:text-floodlight"
              }`}
            >
              {COPY[option].title}
              <span className="ml-1.5 font-mono text-[11px] text-floodlight-faint">
                {countFor(option)}
              </span>
            </Link>
          );
        })}
      </div>

      {articles.length === 0 ? (
        <EmptyState
          message={`Nothing in ${copy.title.toLowerCase()} yet.`}
          action={{
            label: copy.newLabel,
            href: `/admin/articles/new?category=${category}`,
          }}
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line bg-charcoal">
          <table className="w-full min-w-[620px] border-collapse text-sm">
            <thead>
              <tr>
                {["Headline", "Published", ""].map((heading) => (
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
                        /articles/{article.slug}
                      </span>
                    </td>
                    <td className={`px-4 py-3 font-mono text-[11px] text-floodlight-dim ${border}`}>
                      {dateTimeFormatter.format(article.publishedAt)}
                    </td>
                    <td className={`px-4 py-3 ${border}`}>
                      <div className="flex items-center justify-end gap-3">
                        <Link
                          href={`/articles/${article.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-bold text-floodlight-dim hover:text-floodlight"
                        >
                          View ↗
                        </Link>
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
