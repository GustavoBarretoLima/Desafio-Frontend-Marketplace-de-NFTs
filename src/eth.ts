const weiPerEth = 10n ** 18n;

export function toWei(priceEth: string) {
  const [whole, fraction = ""] = priceEth.split(".");
  return BigInt(whole + fraction.padEnd(18, "0"));
}

export function formatEth(wei: bigint) {
  const fraction = (wei % weiPerEth).toString().padStart(18, "0").replace(/0+$/, "");
  return fraction ? `${wei / weiPerEth}.${fraction}` : String(wei / weiPerEth);
}
