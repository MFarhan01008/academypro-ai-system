"use client";

import { ChangeEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type TeacherPhotoUploadProps = {
  defaultUrl?: string | null;
  inputName?: string;
};

function getFileExt(fileName: string) {
  const parts = fileName.split(".");
  return parts.length > 1 ? parts.pop() || "jpg" : "jpg";
}

export function TeacherPhotoUpload({
  defaultUrl = "",
  inputName = "photo_url",
}: TeacherPhotoUploadProps) {
  const [photoUrl, setPhotoUrl] = useState(defaultUrl || "");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setError("");

    if (!file.type.startsWith("image/")) {
      setError("Please sirf image file select karein.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Image size 5MB se kam honi chahiye.");
      return;
    }

    try {
      setUploading(true);
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError("Please pehle login karein.");
        return;
      }

      const ext = getFileExt(file.name);
      const safeExt = ext.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
      const filePath = `${user.id}/${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}.${safeExt}`;

      const { error: uploadError } = await supabase.storage
        .from("teacher-photos")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type,
        });

      if (uploadError) {
        setError(uploadError.message);
        return;
      }

      const { data } = supabase.storage
        .from("teacher-photos")
        .getPublicUrl(filePath);

      setPhotoUrl(data.publicUrl);
    } catch (uploadError: any) {
      setError(uploadError?.message || "Image upload failed.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="md:col-span-2">
      <label className="mb-2 block text-sm font-semibold text-slate-950">
        Teacher Photo
      </label>

      <div className="rounded-2xl border border-slate-300 bg-white p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
            {photoUrl ? (
              <img
                src={photoUrl}
                alt="Teacher photo"
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="px-3 text-center text-xs font-medium text-slate-500">
                No photo selected
              </span>
            )}
          </div>

          <div className="flex-1">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/jpg"
              onChange={handleUpload}
              disabled={uploading}
              className="block w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            />

            <input type="hidden" name={inputName} value={photoUrl} readOnly />

            <p className="mt-2 text-xs text-slate-500">
              JPG, PNG ya WEBP upload karein. Max size 5MB.
            </p>

            {uploading ? (
              <p className="mt-2 text-sm font-semibold text-blue-600">
                Uploading...
              </p>
            ) : null}

            {error ? (
              <p className="mt-2 text-sm font-semibold text-red-600">
                {error}
              </p>
            ) : null}

            {photoUrl ? (
              <button
                type="button"
                onClick={() => setPhotoUrl("")}
                className="mt-3 rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"
              >
                Remove Photo
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
