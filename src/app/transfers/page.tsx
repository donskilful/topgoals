import type { Metadata } from "next";
import { getArticlesByCategory } from "@/lib/data/articles";
import { ArticleGrid } from "@/components/article-grid";
import { EmptyNotice, PageIntro, PublicPage } from "@/components/public-page";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Football Transfer News — TopGoals",
  description:
    "Confirmed transfers, contract renewals and the deals in progress across Europe's major leagues.",
};

export default async function TransfersPage() {
  const articles = await getArticlesByCategory("Transfer", 30);

  return (
    <PublicPage>
      <PageIntro
        title="Transfers"
        description="Completed deals, new contracts, and the moves still being negotiated."
      />
      {articles.length === 0 ? (
        <EmptyNotice>No transfer news published yet.</EmptyNotice>
      ) : (
        <ArticleGrid articles={articles} />
      )}
    </PublicPage>
  );
}
