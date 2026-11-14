import { queryOptions } from "@tanstack/react-query";
import axios from "axios";

export const cartQueryKey = ["cart"] as const;

export type CartResponse = {
  coupon: string | null;
  summary: {
    subtotalEth: string;
    discountEth: string;
    networkFeeEth: string;
    totalEth: string;
  };
  items: {
    nftId: string;
    editionId: string;
    quantity: number;
    stock: number;
    name: string;
    imageUrl: string;
    editionName: string;
    priceEth: string;
  }[];
};

export const cartQueryOptions = queryOptions({
  queryKey: cartQueryKey,
  queryFn: async ({ signal }) => {
    const response = await axios.get<CartResponse>("/api/cart", { signal });
    return response.data;
  },
});
