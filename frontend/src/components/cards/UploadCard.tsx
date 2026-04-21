import type { CommunityUpload } from "@/types/models";
import StatusBadge from "@/components/common/StatusBadge";

type UploadCardProps = {
  upload: CommunityUpload;
  eventTitle: string;
};

export default function UploadCard({ upload, eventTitle }: UploadCardProps) {
  return (
    <article className="rounded-md border border-border bg-background p-3">
      <img src={upload.image} alt={`Upload by ${upload.alias}`} className="w-full aspect-[4/5] object-cover mb-3" />
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-display text-sm text-foreground">{upload.alias}</p>
          <p className="text-xs text-foreground-secondary">{eventTitle}</p>
        </div>
        <StatusBadge tone={upload.status} />
      </div>
    </article>
  );
}
