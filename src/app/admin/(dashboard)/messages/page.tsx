import { requireRole } from "@/lib/auth-helpers";
import { dbConnect } from "@/lib/db";
import { Message } from "@/lib/models/message";
import { dateTimeFormatter, relativeTime } from "@/lib/format";
import { EmptyState, PageHeader } from "@/components/admin/page-header";
import { MessageActions } from "./message-actions";


const TOPIC_BADGES: Record<string, string> = {
  Correction: "bg-[rgba(255,71,87,0.14)] text-whistle",
  "General enquiry": "bg-charcoal-3 text-floodlight-dim",
  Feedback: "bg-[rgba(34,201,116,0.14)] text-pitch-bright",
  Advertising: "bg-[rgba(245,185,66,0.14)] text-torch",
  Press: "bg-[rgba(245,185,66,0.14)] text-torch",
};

export default async function MessagesPage() {
  await requireRole();
  await dbConnect();

  // Unhandled first, then newest — the inbox should open on what still needs doing.
  const messages = await Message.find().sort({ handled: 1, createdAt: -1 }).limit(200).lean();
  const open = messages.filter((message) => !message.handled).length;

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Messages"
        description={
          open > 0
            ? `${open} message${open === 1 ? "" : "s"} still to deal with.`
            : "Everything from the contact form has been handled."
        }
      />

      {messages.length === 0 ? (
        <EmptyState message="No messages yet. Anything sent through the contact form lands here." />
      ) : (
        <ul className="flex flex-col gap-3">
          {messages.map((message) => (
            <li
              key={String(message._id)}
              className={`rounded-xl border bg-charcoal p-4 ${
                message.handled ? "border-line opacity-70" : "border-[rgba(245,185,66,0.25)]"
              }`}
            >
              <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ${
                        TOPIC_BADGES[message.topic] ?? "bg-charcoal-3 text-floodlight-dim"
                      }`}
                    >
                      {message.topic}
                    </span>
                    {message.handled ? (
                      <span className="font-mono text-[10px] uppercase tracking-wide text-floodlight-faint">
                        handled{message.handledBy ? ` by ${message.handledBy}` : ""}
                      </span>
                    ) : null}
                  </div>

                  <p className="text-sm font-bold">{message.name}</p>
                  <a
                    href={`mailto:${message.email}?subject=Re: ${encodeURIComponent(message.topic)} — TopGoals`}
                    className="font-mono text-[11px] text-pitch-bright hover:underline"
                  >
                    {message.email}
                  </a>
                </div>

                <MessageActions
                  id={String(message._id)}
                  handled={message.handled}
                  from={message.email}
                />
              </div>

              <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-floodlight-dim">
                {message.body}
              </p>

              <p className="mt-3 font-mono text-[10px] text-floodlight-faint">
                <time dateTime={message.createdAt.toISOString()}>
                  {dateTimeFormatter.format(message.createdAt)}
                </time>{" "}
                · {relativeTime(message.createdAt)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
