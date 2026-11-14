export type WalletOption = {
  id: string;
  name: string;
  address: string;
  details?: Record<string, string>;
  networks: { id: string; name: string }[];
};

export type WalletSelection = {
  walletId: string;
  networkId: string;
};
