import PageHeader from "@/components/common/PageHeader";
import { usePublicSiteSettingsQuery } from "@/hooks/queries/usePublicSiteSettingsQuery";
import type { ReactNode } from "react";

type LegalPageProps = { title: string; description: string; field: "privacyPolicyContent" | "termsContent" | "refundPolicyContent"; fallback: string };

function renderInlineText(value: string): ReactNode[] {
  return value.split(/(\*\*[^*]+\*\*)/g).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={`${part}-${index}`}>{part.slice(2, -2)}</strong>;
    }

    return part;
  });
}

function renderLegalContent(content: string) {
  const blocks: Array<{ type: "heading" | "paragraph" | "list"; content: string | string[] }> = [];
  let paragraphLines: string[] = [];
  let listItems: string[] = [];

  const flushParagraph = () => {
    if (paragraphLines.length > 0) {
      blocks.push({ type: "paragraph", content: paragraphLines.join(" ").trim() });
      paragraphLines = [];
    }
  };

  const flushList = () => {
    if (listItems.length > 0) {
      blocks.push({ type: "list", content: listItems });
      listItems = [];
    }
  };

  content.trim().split(/\r?\n/).forEach((line) => {
    const trimmedLine = line.trim();

    if (!trimmedLine) {
      flushParagraph();
      flushList();
      return;
    }

    const heading = trimmedLine.match(/^#{2,6}\s+(.+)$/);
    if (heading) {
      flushParagraph();
      flushList();
      blocks.push({ type: "heading", content: heading[1] });
      return;
    }

    const listItem = trimmedLine.match(/^[-*]\s+(.+)$/);
    if (listItem) {
      flushParagraph();
      listItems.push(listItem[1]);
      return;
    }

    flushList();
    paragraphLines.push(trimmedLine);
  });

  flushParagraph();
  flushList();

  return blocks.map((block, index) => {
    if (block.type === "heading") {
      return <h2 key={`heading-${index}`} className="font-display text-xl text-foreground">{renderInlineText(block.content as string)}</h2>;
    }

    if (block.type === "list") {
      return (
        <ul key={`list-${index}`} className="list-disc space-y-2 pl-6">
          {(block.content as string[]).map((item, itemIndex) => <li key={`${item}-${itemIndex}`}>{renderInlineText(item)}</li>)}
        </ul>
      );
    }

    return <p key={`paragraph-${index}`}>{renderInlineText(block.content as string)}</p>;
  });
}

export default function LegalPage({ title, description, field, fallback }: LegalPageProps) {
  const { data: settings, isLoading, isError } = usePublicSiteSettingsQuery();
  const configuredContent = settings?.[field];
  const hasConfiguredContent = typeof configuredContent === "string" && configuredContent.trim().length > 0;
  const content = hasConfiguredContent ? configuredContent : fallback;

  return (
    <section className="section-padding">
      <div className="container-narrow max-w-3xl">
        <PageHeader eyebrow="Legal" title={title} description={description} />
        {isLoading ? (
          <p role="status" className="text-sm text-foreground-secondary">Loading legal information…</p>
        ) : isError ? (
          <div role="alert" className="rounded-md border border-border bg-background/75 p-6">
            <h2 className="font-display text-lg text-foreground">Legal information unavailable</h2>
            <p className="mt-2 text-sm text-foreground-secondary">We could not load this page right now. Please try again later.</p>
          </div>
        ) : (
          <>
            {!hasConfiguredContent && (
              <p role="status" className="mb-5 text-sm text-foreground-secondary">The editable policy content is not available yet. Showing the site fallback guidance.</p>
            )}
            <div className="text-body space-y-5">
              {renderLegalContent(content)}
            </div>
            <p className="mt-10 border-t border-border pt-4 text-xs text-foreground-secondary">This page contains working editorial content and should be reviewed by qualified legal counsel before being treated as approved legal advice.</p>
          </>
        )}
      </div>
    </section>
  );
}
