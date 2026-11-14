import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { io } from "socket.io-client";
import { cartQueryKey } from "./cart-query";
import { realtimePath } from "./realtime";

export function CatalogUpdates() {
  const client = useQueryClient();
  const [message, setMessage] = useState("");

  useEffect(() => {
    const versions = new Map<string, number>();
    const socket = io({ path: realtimePath, transports: ["websocket"], autoConnect: false });

    function reconcile() {
      void client.invalidateQueries({ queryKey: ["nfts"] });
      void client.invalidateQueries({ queryKey: ["nft"] });
      void client.invalidateQueries({ queryKey: cartQueryKey });
    }

    socket.on("connect", reconcile);
    socket.on("nft.updated", (event: { nftId: string; version: number }) => {
      if (!event || typeof event.nftId !== "string" || !Number.isSafeInteger(event.version)) return;
      if (event.version <= (versions.get(event.nftId) ?? 0)) return;

      versions.set(event.nftId, event.version);
      setMessage("O preço ou o estoque do catálogo mudou. Confira os valores antes de comprar.");
      reconcile();
    });
    socket.connect();

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, [client]);

  return <p role="status" className={message ? "mx-auto max-w-7xl px-6 py-2 text-amber-300" : "sr-only"}>{message}</p>;
}
