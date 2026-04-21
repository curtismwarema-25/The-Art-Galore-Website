import StatusBadge from "@/components/common/StatusBadge";

type ConfirmationBannerProps = {
  title: string;
  message: string;
  tone: "approved" | "pending" | "failed";
};

export default function ConfirmationBanner({ title, message, tone }: ConfirmationBannerProps) {
  return (
    <div className="rounded-lg border border-border bg-secondary/20 p-4 md:p-5">
      <div className="flex items-start gap-3">
        <StatusBadge tone={tone} />
        <div>
          <h3 className="font-display text-sm text-foreground mb-1">{title}</h3>
          <p className="text-xs md:text-sm text-foreground-secondary">{message}</p>
        </div>
      </div>
    </div>
  );
}
