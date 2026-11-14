import { realtimePath } from "../realtime";
import { ws } from "msw";
import { getDemoSession } from "./session";

const connection = ws.link("*" + realtimePath);

export const orderSocketHandler = connection.addEventListener("connection", (event) => {
  const { client } = event;

  const session = getDemoSession();

  const sid = crypto.randomUUID();
  client.addEventListener("message", ({ data }) => {
    if (data === "40") {
      client.send("40" + JSON.stringify({ sid }));
      scheduleCatalogUpdate();
    }
  });
  setTimeout(() => client.send("0" + JSON.stringify({
    sid, upgrades: [], pingInterval: 25000, pingTimeout: 5000,
  })));

  function onOrderUpdated(event: Event) {
    if (!session) return;
    const current = getDemoSession();
    if (current?.user.id !== session?.user.id || current?.expiresAt !== session?.expiresAt) return;
    const { userId, orderId } = (event as CustomEvent<{ userId: string; orderId: string }>).detail;
    if (userId === session?.user.id) {
      client.send("42" + JSON.stringify(["order.updated", { orderId, version: 1, eventId: orderId + ":1" }]));
    }
  }

  function onNftUpdated(event: Event) {
    client.send("42" + JSON.stringify(["nft.updated", (event as CustomEvent).detail]));
  }

  orderEvents.addEventListener("order.updated", onOrderUpdated);
  orderEvents.addEventListener("nft.updated", onNftUpdated);
  function disconnectForTest() {
    client.close(1012, "Simulated interruption");
  }

  function replayCatalogUpdateForTest() {
    onNftUpdated(new CustomEvent("nft.updated", { detail: updatedNft }));
    onNftUpdated(new CustomEvent("nft.updated", {
      detail: { ...updatedNft, version: updatedNft.version - 1, eventId: updatedNft.nftId + ":" + (updatedNft.version - 1) },
    }));
  }

  if (import.meta.env.VITE_E2E_SCENARIOS === "true") {
    window.addEventListener("kurio:e2e:replay-catalog", replayCatalogUpdateForTest);
    window.addEventListener("kurio:e2e:disconnect", disconnectForTest);
  }

  const heartbeat = setInterval(() => client.send("2"), 25_000);
  client.addEventListener("close", () => {
    window.removeEventListener("kurio:e2e:disconnect", disconnectForTest);
    window.removeEventListener("kurio:e2e:replay-catalog", replayCatalogUpdateForTest);
    clearInterval(heartbeat);
    orderEvents.removeEventListener("order.updated", onOrderUpdated);
    orderEvents.removeEventListener("nft.updated", onNftUpdated);
  });
});

const orderEvents = new EventTarget();

export function publishOrderUpdate(userId: string, orderId: string) {
  orderEvents.dispatchEvent(new CustomEvent("order.updated", { detail: { userId, orderId } }));
}

export const catalogUpdateKey = "kurio:catalog-update";
const updatedNft = { nftId: "emerald-ape-042", version: 2, eventId: "emerald-ape-042:2" };
let scheduled = false;

function scheduleCatalogUpdate() {
  if (scheduled || import.meta.env.VITE_MOCK_NFT_UPDATE !== "true" || localStorage.getItem(catalogUpdateKey)) return;

  scheduled = true;
  setTimeout(() => {
    localStorage.setItem(catalogUpdateKey, "1");
    orderEvents.dispatchEvent(new CustomEvent("nft.updated", { detail: updatedNft }));
  }, 20_000);
}
