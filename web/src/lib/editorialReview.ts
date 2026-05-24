import type { LocaleCode, Work } from "../types/content"

const REVIEW_LABELS: Record<
  string,
  { en: string; pt: string }
> = {
  manual_title_conflict: {
    en: "Title differs from structured `name:` metadata.",
    pt: "O título diverge do metadado estruturado `name:`.",
  },
  manual_date_conflict: {
    en: "Post date and body date diverge.",
    pt: "A data do post e a data do corpo divergem.",
  },
  manual_primary_category: {
    en: "Multiple categories require a manual primary category.",
    pt: "Há múltiplas categorias e a principal precisa de decisão manual.",
  },
  manual_umbrella_entity: {
    en: "Umbrella entity inference needs manual confirmation.",
    pt: "A inferência da umbrella entity precisa de confirmação manual.",
  },
  summary_secondary_source_used: {
    en: "Structured data was also rescued from the legacy summary.",
    pt: "Foram também resgatados dados estruturados a partir do summary legado.",
  },
}

export function needsEditorialReview(work: Work): boolean {
  return (work.reviewFlags?.length ?? 0) > 0
}

export function getEditorialReviewQueue(works: Work[]): Work[] {
  return works.filter(needsEditorialReview)
}

export function describeReviewFlag(
  flag: string,
  locale: LocaleCode,
): string {
  const labels = REVIEW_LABELS[flag]
  return labels ? labels[locale] : flag
}
