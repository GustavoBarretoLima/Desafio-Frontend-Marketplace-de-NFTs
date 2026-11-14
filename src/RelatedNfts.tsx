import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import axios from "axios";
import { Skeleton } from "./components/ui/skeleton";

export function RelatedNfts({ id, title = "Mais desta coleção" }: { id?: string; title?: string }) {
  const [slide, setSlide] = useState(1);
  const related = useQuery({
    queryKey: ["nfts", "related", id],
    queryFn: async ({ signal }) =>
      (await axios.get<{ items: { id: string; name: string; imageUrl: string; priceEth: string }[] }>(
        "/api/nfts/related", { params: { id }, signal },
      )).data.items,
  });

  return (
    <section className="nft-related" aria-labelledby="nft-related-title">
      <h2 id="nft-related-title">{title}</h2>
      {related.isPending && <Skeleton className="h-48 w-full" />}
      {related.isError && <button type="button" onClick={() => void related.refetch()}>Tentar carregar a coleção novamente</button>}
      <ul>
        {related.data?.slice(slide, slide + 5).map((item) => (
          <li key={item.id}>
            <Link to="/nfts/$id" params={{ id: item.id }}>
              <img src={item.imageUrl} alt="" width={1254} height={1254} loading="lazy" />
              <span>{item.name}</span>
            </Link>
            <p className="home-nft-price">{item.priceEth} ETH</p>
          </li>
        ))}
      </ul>
      {related.data && related.data.length >= 7 && (
        <div className="nft-related-dots" role="group" aria-label="Navegar pela coleção">
          {[0, 1, 2].map((index) => (
            <button key={index} type="button" aria-label={`Posição ${index + 1} de 3`}
              aria-pressed={slide === index} onClick={() => setSlide(index)} />
          ))}
        </div>
      )}
    </section>
  );
}
