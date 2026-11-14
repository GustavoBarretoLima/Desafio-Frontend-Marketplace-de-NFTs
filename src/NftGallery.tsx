import { Button } from "./components/ui/button";
import { useRef, useState } from "react";

export function NftGallery({ name, images }: { name: string; images: string[] }) {
  const [selected, setSelected] = useState(0);
  const dialog = useRef<HTMLDialogElement>(null);
  const image = images[selected] ?? images[0];
  if (!image) return null;

  return (
    <section aria-label={`Galeria de ${name}`} className="nft-gallery">
      <Button
        variant="ghost" size="bare" type="button"
        aria-label={`Ampliar arte de ${name}`}
        onClick={() => dialog.current?.showModal()}
        className="nft-gallery-preview relative block w-full rounded-xl text-left"
      >
        <img src={image} alt={`Arte de ${name}`} width={1254} height={1254}
          fetchPriority="high" className="aspect-square w-full rounded-xl object-contain" />
        <span aria-hidden="true" className="absolute right-3 top-3 rounded bg-stone-950/80 px-2 py-1 text-sm">
          Ampliar
        </span>
      </Button>

      {images.length > 1 && (
        <ul className="nft-gallery-thumbnails">
          {images.map((url, index) => (
              <li key={index}>
              <Button variant="outline" size="bare" type="button" aria-label={`Ver imagem ${index + 1}`} aria-pressed={selected === index}
                className="rounded-lg border border-transparent p-1 aria-pressed:border-amber-300"
                onClick={() => setSelected(index)}>
                <img src={url} alt="" width={64} height={64} loading="lazy" className="size-16 rounded object-cover" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <dialog ref={dialog} aria-label={`Arte ampliada de ${name}`}
        className="m-auto max-h-[calc(100dvh-2rem)] max-w-[calc(100vw-2rem)] rounded-xl bg-stone-900 p-3 text-white backdrop:bg-black/80">
        <form method="dialog" className="mb-3 flex justify-end">
          <Button variant="ghost" size="compact" type="submit" autoFocus>Fechar</Button>
        </form>
        <img src={image} alt={`Arte ampliada de ${name}`} width={1254} height={1254}
          loading="lazy" className="h-auto max-h-[calc(100dvh-7rem)] w-auto max-w-full rounded-lg object-contain" />
      </dialog>
    </section>
  );
}
