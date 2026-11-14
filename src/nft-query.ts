import { queryOptions } from "@tanstack/react-query";
import axios from "axios";

export type NftEdition = {
  id: string;
  name: string;
  stock: number;
};

type Nft = {
  id: string;
  name: string;
  priceEth: string;
  images: string[];
  available: boolean;
  editions: NftEdition[];
  description: string;
  attributes: { label: string; value: string }[];
};

export function nftQueryOptions(id: string) {
  return queryOptions({
    queryKey: ["nft", id] as const,
    queryFn: async ({ signal }) =>
      (await axios.get<Nft>("/api/nfts/" + encodeURIComponent(id), { signal })).data,
    retry: false,
  });
}
