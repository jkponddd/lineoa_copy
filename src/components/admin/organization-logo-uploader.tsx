"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { createClient } from "@/lib/supabase/client";
import { updateOrganizationLogo } from "@/app/[locale]/(admin)/admin/organization/actions";

export function OrganizationLogoUploader({
  organizationId,
  organizationName,
  logoUrl,
}: {
  organizationId: string;
  organizationName: string;
  logoUrl: string | null;
}) {
  const t = useTranslations("orgSettings");
  const router = useRouter();
  const [preview, setPreview] = useState<string | null>(logoUrl);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileSelected(file: File) {
    setError(null);
    setUploading(true);
    try {
      const extension = file.name.split(".").pop() || "png";
      // A unique filename per upload, not a fixed "logo.png" replaced via
      // upsert — Postgres RLS rejects `upsert: true` outright unless an
      // UPDATE policy is satisfiable, independent of whether a row
      // actually conflicts (confirmed live; see migration
      // 20260922032000). A plain INSERT with a unique path is the same,
      // already-proven approach used for line-media. The previous logo
      // object is simply left orphaned in storage rather than deleted —
      // an acceptable tradeoff to avoid a second, more complex write.
      const path = `${organizationId}/${crypto.randomUUID()}.${extension}`;

      const supabase = createClient();
      const { error: uploadError } = await supabase.storage
        .from("org-logos")
        .upload(path, file, { contentType: file.type || "image/png" });

      if (uploadError) {
        setError(t("logoUploadError"));
        return;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("org-logos").getPublicUrl(path);

      const result = await updateOrganizationLogo(publicUrl);
      if (result.error) {
        setError(t("logoUploadError"));
        return;
      }

      setPreview(publicUrl);
      router.refresh();
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex items-center gap-4">
      <Avatar size="lg">
        {preview ? <AvatarImage src={preview} alt={organizationName} /> : null}
        <AvatarFallback>{organizationName.slice(0, 1).toUpperCase()}</AvatarFallback>
      </Avatar>
      <div className="flex flex-col gap-1.5">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/svg+xml"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) void handleFileSelected(file);
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploading}
          className="gap-1.5"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="size-4" />
          {uploading ? t("logoUploading") : t("logoUploadButton")}
        </Button>
        {error ? <p className="text-xs text-destructive">{error}</p> : null}
      </div>
    </div>
  );
}
