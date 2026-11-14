import { queryOptions } from "@tanstack/react-query";
import axios from "axios";

export function favoritesQueryOptions(userId: string) {
  return queryOptions({
    queryKey: ["favorites", userId] as const,
    queryFn: async ({ signal }) =>
      (await axios.get<{ ids: string[] }>("/api/favorites", { signal })).data.ids,
    retry: false,
  });
}
