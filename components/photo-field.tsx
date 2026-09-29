"use client";

import { Camera, ImageUp, Trash2 } from "lucide-react";
import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { toast } from "sonner";
import { Modal } from "./member-actions";
import { Avatar, btnDanger, btnPrimary, btnSecondary } from "./ui";

const SIZE = 512;

/** Centre-crops to a square of at most 512px and re-encodes as JPEG, which also drops metadata such as GPS. */
async function toJpeg(source: ImageBitmapSource) {
  const image = await createImageBitmap(source);
  const side = Math.min(image.width, image.height);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = Math.min(side, SIZE);
  const x = (image.width - side) / 2;
  const y = (image.height - side) / 2;
  canvas.getContext("2d")!.drawImage(image, x, y, side, side, 0, 0, canvas.width, canvas.height);
  image.close();
  return canvas.toDataURL("image/jpeg", 0.85);
}

type Props = { name: string; value: string; error?: string; onChange: (photo: string) => void };

/** value: "" (none), a JPEG data URL (new) or the saved photo's URL (unchanged). */
export function PhotoField({ name, value, error, onChange }: Props) {
  const fileInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  // Shows the webcam while the dialog is open and turns it off when it closes or the form goes away.
  useEffect(() => {
    if (video.current) video.current.srcObject = stream;
    return () => stream?.getTracks().forEach((track) => track.stop());
  }, [stream]);

  async function setPhoto(source: ImageBitmapSource) {
    try {
      onChange(await toJpeg(source));
    } catch {
      toast.error("Couldn't read that image. Please try another photo.");
    }
  }

  function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // picking the same file again should still fire change
    if (file) setPhoto(file);
  }

  async function takePhoto() {
    // Phones and tablets open their own camera app; laptops and desktops get the webcam in a dialog.
    if ("capture" in HTMLInputElement.prototype) return cameraInput.current?.click();
    try {
      setStream(await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } }));
    } catch {
      toast.error("Couldn't open the camera. Allow camera access or upload a photo instead.");
    }
  }

  async function capture() {
    if (!video.current?.videoWidth) return; // the preview hasn't started yet
    await setPhoto(video.current);
    setStream(null);
  }

  return (
    <fieldset>
      <legend className="mb-4 text-xs font-bold tracking-widest text-red-600 uppercase">Profile Photo</legend>
      <div className="flex items-center gap-4">
        <Avatar name={name} src={value || null} className="size-20 text-2xl ring-4 ring-red-50" />
        <div className="flex flex-wrap gap-2">
          <button type="button" className={btnSecondary} onClick={takePhoto}>
            <Camera className="size-4" aria-hidden /> Take Photo
          </button>
          <button
            id="photo"
            type="button"
            className={btnSecondary}
            aria-describedby={error ? "photo-error" : undefined}
            onClick={() => fileInput.current?.click()}
          >
            <ImageUp className="size-4" aria-hidden /> Upload Photo
          </button>
          {value && (
            <button type="button" className={btnDanger} onClick={() => onChange("")}>
              <Trash2 className="size-4" aria-hidden /> Remove
            </button>
          )}
        </div>
      </div>
      {error && (
        <p id="photo-error" className="mt-1.5 text-sm font-medium text-red-700">
          {error}
        </p>
      )}
      <input ref={fileInput} type="file" accept="image/*" hidden onChange={onFile} />
      <input ref={cameraInput} type="file" accept="image/*" capture="user" hidden onChange={onFile} />

      {stream && (
        <Modal title="Take Photo" onClose={() => setStream(null)}>
          <video
            ref={video}
            autoPlay
            playsInline
            muted
            aria-label="Camera preview"
            className="aspect-square w-full -scale-x-100 rounded-xl bg-neutral-900 object-cover"
          />
          <button type="button" className={`${btnPrimary} mt-4 w-full`} onClick={capture}>
            <Camera className="size-4" aria-hidden /> Capture
          </button>
        </Modal>
      )}
    </fieldset>
  );
}
