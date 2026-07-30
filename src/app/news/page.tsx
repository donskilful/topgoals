import type { Metadata } from "next";
import { getArticlesByCategory } from "@/lib/data/articles";
import { ArticleGrid } from "@/components/article-grid";
import { EmptyNotice, PageIntro, PublicPage } from "@/components/public-page";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Latest Football News — TopGoals",
  description:
    "Football news, match reports and analysis from the Premier League and Europe's major leagues.",
};

export default async function NewsPage() {
  const articles = await getArticlesByCategory("News", 30);

  return (
    <PublicPage>
      <PageIntro
        title="Latest News"
        description="Match reports, analysis and the stories shaping the season."
      />
      {articles.length === 0 ? (
        <EmptyNotice>No news published yet.</EmptyNotice>
      ) : (
        <ArticleGrid articles={articles} />
      )}
    </PublicPage>
  );
}
