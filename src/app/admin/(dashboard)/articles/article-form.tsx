"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { createArticle, updateArticle } from "@/lib/actions/articles";
import { EMPTY_FORM_STATE } from "@/lib/form-state";
import type { Media } from "@/lib/schemas/shared";
import {
  CheckboxField,
  FormAlert,
  SelectField,
  SubmitButton,
  TextAreaField,
  TextField,
} from "@/components/form-fields";
import { MediaUpload } from "@/components/admin/media-upload";

const CATEGORY_OPTIONS = [
  { value: "News", label: "News" },
  { value: "Transfer", label: "Transfer news" },
];

export type ArticleFormValues = {
  id: string;
  category: string;
  title: string;
  excerpt: string;
  body: string;
  publishedAt: string;
  image: Media | null;
  featured: boolean;
  heroEyebrow: string;
  heroHeadline: string;
  heroHeadlineAccent: string;
  heroDescription: string;
  heroPrimaryCtaLabel: string;
  heroPrimaryCtaHref: string;
  heroSecondaryCtaLabel: string;
  heroSecondaryCtaHref: string;
};

export function ArticleForm({
  article,
  defaultPublishedAt,
  defaultCategory = "News",
  featuredElsewhere,
}: {
  article?: ArticleFormValues;
  defaultPublishedAt: string;
  defaultCategory?: string;
  /** Title of the currently featured article, when it isn't this one. */
  featuredElsewhere?: string | null;
}) {
  const isEdit = Boolean(article);
  const [state, formAction] = useActionState(
    isEdit ? updateArticle : createArticle,
    EMPTY_FORM_STATE,
  );

  // Prefer what the user just submitted over the stored value: React clears
  // uncontrolled inputs after a form action, so without this a validation error
  // would discard everything they typed.
  const v = (field: string, fallback?: string | number) =>
    state.values[field] ?? (fallback === undefined ? undefined : String(fallback));
  const [featured, setFeatured] = useState(article?.featured ?? false);

  return (
    <form action={formAction} className="flex max-w-2xl flex-col gap-4">
      {isEdit ? <input type="hidden" name="id" value={article!.id} /> : null}

      <FormAlert state={state} />

      <SelectField
        name="category"
        label="Category"
        required
        defaultValue={v("category", article?.category ?? defaultCategory)}
        options={CATEGORY_OPTIONS}
        error={state.fieldErrors.category}
      />

      <TextField
        name="title"
        label="Headline"
        required
        defaultValue={v("title", article?.title)}
        error={state.fieldErrors.title}
        placeholder="Mbappé completes move to Real Madrid"
      />

      <TextAreaField
        name="excerpt"
        label="Summary"
        required
        rows={2}
        defaultValue={v("excerpt", article?.excerpt)}
        error={state.fieldErrors.excerpt}
        hint="One or two sentences. Shown on cards and in search results."
      />

      <TextAreaField
        name="body"
        label="Article"
        required
        rows={14}
        defaultValue={v("body", article?.body)}
        error={state.fieldErrors.body}
        hint="Leave a blank line between paragraphs."
      />

      <MediaUpload
        name="image"
        label="Lead image"
        resourceType="image"
        initial={article?.image ?? null}
        error={state.fieldErrors.image}
        hint="Used on cards and at the top of the article."
      />

      <TextField
        name="publishedAt"
        label="Published"
        type="datetime-local"
        required
        defaultValue={v("publishedAt", article?.publishedAt ?? defaultPublishedAt)}
        error={state.fieldErrors.publishedAt}
      />

      <div className="mt-2 border-t border-line pt-5">
        <CheckboxField
          name="featured"
          label="Feature this on the homepage hero"
          defaultChecked={featured}
          onChange={(event) => setFeatured(event.currentTarget.checked)}
          hint={
            featuredElsewhere
              ? `“${featuredElsewhere}” is featured right now — turning this on will replace it.`
              : "Only one article can be featured at a time."
          }
        />

        {featured ? (
          <div className="mt-4 flex flex-col gap-4 rounded-lg border border-[rgba(245,185,66,0.25)] bg-[rgba(245,185,66,0.04)] p-4">
            <p className="text-[11px] uppercase tracking-wide text-torch">Hero content</p>

            <TextField
              name="heroEyebrow"
              label="Label above the headline"
              defaultValue={v("heroEyebrow", article?.heroEyebrow)}
              error={state.fieldErrors.heroEyebrow}
              placeholder="Matchday · 76' Live"
            />

            <TextField
              name="heroHeadline"
              label="Hero headline"
              defaultValue={v("heroHeadline", article?.heroHeadline)}
              error={state.fieldErrors.heroHeadline}
              placeholder="Arsenal on the brink of a statement win"
              hint="Can differ from the article headline. Don't add line breaks — it wraps automatically."
            />

            <TextField
              name="heroHeadlineAccent"
              label="Words to highlight in gold"
              defaultValue={v("heroHeadlineAccent", article?.heroHeadlineAccent)}
              error={state.fieldErrors.heroHeadlineAccent}
              placeholder="statement win"
              hint="Must be part of the hero headline above."
            />

            <TextAreaField
              name="heroDescription"
              label="Hero text"
              rows={3}
              defaultValue={v("heroDescription", article?.heroDescription)}
              error={state.fieldErrors.heroDescription}
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextField
                name="heroPrimaryCtaLabel"
                label="Main button"
                defaultValue={v("heroPrimaryCtaLabel", article?.heroPrimaryCtaLabel)}
                error={state.fieldErrors.heroPrimaryCtaLabel}
                placeholder="Watch Highlights"
              />
              <TextField
                name="heroPrimaryCtaHref"
                label="Main button link"
                defaultValue={v("heroPrimaryCtaHref", article?.heroPrimaryCtaHref)}
                error={state.fieldErrors.heroPrimaryCtaHref}
                placeholder="/highlights"
              />
              <TextField
                name="heroSecondaryCtaLabel"
                label="Second button"
                defaultValue={v("heroSecondaryCtaLabel", article?.heroSecondaryCtaLabel)}
                error={state.fieldErrors.heroSecondaryCtaLabel}
                placeholder="Read Match Report"
              />
              <TextField
                name="heroSecondaryCtaHref"
                label="Second button link"
                defaultValue={v("heroSecondaryCtaHref", article?.heroSecondaryCtaHref)}
                error={state.fieldErrors.heroSecondaryCtaHref}
                hint="Leave blank to link to this article."
              />
            </div>
          </div>
        ) : null}
      </div>

      <div className="mt-2 flex items-center gap-3">
        <SubmitButton>{isEdit ? "Save changes" : "Publish article"}</SubmitButton>
        <Link
          href="/admin/articles"
          className="text-[13px] font-semibold text-floodlight-dim hover:text-floodlight"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
