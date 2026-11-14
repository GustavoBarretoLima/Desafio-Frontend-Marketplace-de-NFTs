import { queryOptions } from "@tanstack/react-query";
import axios from "axios";

export type ProfileData = { email: string; name: string; avatar: string; username?: string; ens?: string; walletNickname?: string };

export const profileQueryOptions = queryOptions({
  queryKey: ["profile"] as const,
  queryFn: async ({ signal }) => (await axios.get<ProfileData>("/api/profile", { signal })).data,
  retry: false,
});
