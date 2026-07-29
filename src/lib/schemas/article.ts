import { z } from "zod";
import { ARTICLE_CATEGORIES } from "@/lib/constants";
import {
  checkboxField,
  dateTimeField,
  objectIdField,
  optionalMediaField,
  text,
} from "@/lib/schemas/shared";

const optionalText = (max = 200) =>
  z
    .union([z.string(), z.null(), z.undefined()])
    .transform((value) => {
      const trimmed = (value ?? "").trim();
      return trimmed === "" ? null : trimmed;
    })
    .refine((value) => value === null || value.length <= max, {
      message: `Must be under ${max} characters.`,
    });

const articleFields = z.object({
  category: z.enum(ARTICLE_CATEGORIES, { message: "Choose a category." }),
  title: text("Title", { min: 4, max: 160 }),
  excerpt: text("Summary", { min: 20, max: 300 }),
  body: text("Article", { min: 50, max: 20_000 }),
  publishedAt: dateTimeField,
  image: optionalMediaField,

  featured: checkboxField,
  heroEyebrow: optionalText(60),
  heroHeadline: optionalText(120),
  heroHeadlineAccent: optionalText(60),
  heroDescription: optionalText(400),
  heroPrimaryCtaLabel: optionalText(40),
  heroPrimaryCtaHref: optionalText(200),
  heroSecondaryCtaLabel: optionalText(40),
  heroSecondaryCtaHref: optionalText(200),
});

type HeroCheckable = {
  featured: boolean;
  heroHeadline: string | null;
  heroHeadlineAccent: string | null;
  heroDescription: string | null;
};

/**
 * When an article is featured it becomes the homepage hero, which renders the
 * headline and description directly — so those two stop being optional. The accent
 * must also actually appear in the headline, since it's highlighted by substring.
 */
function checkHeroFields(data: HeroCheckable, ctx: z.RefinementCtx) {
  if (!data.featured) return;

  if (!data.heroHeadline) {
    ctx.addIssue({
      code: "custom",
      path: ["heroHeadline"],
      message: "A featured article needs a hero headline.",
    });
  }

  if (!data.heroDescription) {
    ctx.addIssue({
      code: "custom",
      path: ["heroDescription"],
      message: "A featured article needs hero text.",
    });
  }

  if (
    data.heroHeadlineAccent &&
    data.heroHeadline &&
    !data.heroHeadline.toLowerCase().includes(data.heroHeadlineAccent.toLowerCase())
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["heroHeadlineAccent"],
      message: "The highlighted words must appear in the hero headline.",
    });
  }
}

export const createArticleSchema = articleFields.superRefine(checkHeroFields);
export const updateArticleSchema = articleFields
  .extend({ id: objectIdField })
  .superRefine(checkHeroFields);

export type ArticleInput = z.infer<typeof createArticleSchema>;
