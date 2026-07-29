/** Confirmation shown after a create/update redirects back to a list page. */
export function SavedBanner({ show }: { show: boolean }) {
  if (!show) return null;

  return (
    <p
      role="status"
      className="mb-5 rounded-lg border border-[rgba(34,201,116,0.3)] bg-[rgba(34,201,116,0.1)] px-3 py-2.5 text-[13px] text-pitch-bright"
    >
      Saved. Your change is live on the site.
    </p>
  );
}
