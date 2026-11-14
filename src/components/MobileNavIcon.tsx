const paths = {
  home: "M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z",
  search: "M15.5 15.5 21 21M18 10.5a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0Z",
  cart: "M2 3h3l3.5 12h10l3-9H6M10 21a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm8 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z",
  account: "M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 21v-2a8 8 0 0 1 16 0v2z",
  logout: "M10 4H4v16h6m-1-8h12m-4-4 4 4-4 4",
  wallet: "M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0ZM12 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z",
  heart: "M12 21 4 13a5 5 0 0 1 8-6 5 5 0 0 1 8 6Z",
  offers: "M3 4h9l9 9-8 8-10-10V4Zm5 4h.01",
  download: "M12 3v12m-4-4 4 4 4-4M4 15v5h16v-5",
  support: "M12 3 2 21h20L12 3Zm0 6v5m0 3h.01",
};

export function MobileNavIcon({ name }: { name: keyof typeof paths }) {
  return (
    <svg className="market-mobile-icon" viewBox="0 0 24 24" aria-hidden="true"
      fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d={paths[name]} />
    </svg>
  );
}
