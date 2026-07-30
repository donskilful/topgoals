import Link from "next/link";

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: { label: string; href: string };
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-display text-3xl uppercase tracking-wide">{title}</h1>
        {description ? <p className="mt-1 text-sm text-floodlight-dim">{description}</p> : null}
      </div>
      {action ? (
        <Link
          href={action.href}
          className="rounded-lg bg-torch px-4 py-2.5 text-[13px] font-extrabold text-ink transition-all hover:-translate-y-px hover:bg-[#ffc766]"
        >
          {action.label}
        </Link>
      ) : null}
    </div>
  );
}

/** Shown in place of a table when a collection has no documents yet. */
export function EmptyState({ message, action }: { message: string; action?: { label: string; href: string } }) {
  return (
    <div className="rounded-xl border border-dashed border-line bg-charcoal p-8 text-center">
      <p className="text-sm text-floodlight-dim">{message}</p>
      {action ? (
        <Link
          href={action.href}
          className="mt-4 inline-block rounded-lg bg-torch px-4 py-2 text-[13px] font-extrabold text-ink hover:bg-[#ffc766]"
        >
          {action.label}
        </Link>
      ) : null}
    </div>
  );
}
