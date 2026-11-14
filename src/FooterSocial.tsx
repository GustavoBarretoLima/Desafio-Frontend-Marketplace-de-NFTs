const socialIcons = [
  ["Facebook", "M14 22v-8h3l.5-4H14V8c0-1 .4-2 2-2h2V2h-3c-3 0-5 2-5 5v3H7v4h3v8z"],
  ["Instagram", "M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5Zm0 2a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3Zm5 3a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm5.5-3a1 1 0 1 1 0 2 1 1 0 0 1 0-2Z"],
  ["Twitter", "M23 4.7a9 9 0 0 1-2.6.7 4.6 4.6 0 0 0 2-2.5 9 9 0 0 1-2.9 1.1 4.6 4.6 0 0 0-7.8 4.2A13 13 0 0 1 2.3 3.4a4.6 4.6 0 0 0 1.4 6.1 4.5 4.5 0 0 1-2.1-.6 4.6 4.6 0 0 0 3.7 4.5 4.6 4.6 0 0 1-2.1.1 4.6 4.6 0 0 0 4.3 3.2A9.2 9.2 0 0 1 1 18.6a13 13 0 0 0 20-11v-.6a9 9 0 0 0 2-2.3Z"],
  ["LinkedIn", "M2 8h4v14H2zm2-6a2 2 0 1 1 0 4 2 2 0 0 1 0-4Zm5 6h4v2a5 5 0 0 1 9 3v9h-4v-8a2.5 2.5 0 0 0-5 0v8H9z"],
  ["YouTube", "M23 7a3 3 0 0 0-2-2c-2-.6-9-.6-9-.6s-7 0-9 .6a3 3 0 0 0-2 2 25 25 0 0 0 0 10 3 3 0 0 0 2 2c2 .6 9 .6 9 .6s7 0 9-.6a3 3 0 0 0 2-2 25 25 0 0 0 0-10Zm-13 9V8l7 4z"],
] as const;

export function SocialIcon({ name }: { name: (typeof socialIcons)[number][0] | "E-mail" }) {
  const path = socialIcons.find(([label]) => label === name)?.[1];
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill={path ? "currentColor" : "none"} fillRule="evenodd">
      {path ? <path d={path} /> : <path d="M3 5h18v14H3z M3 6l9 7 9-7" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />}
    </svg>
  );
}

export function FooterSocial() {
  return (
    <span className="home-social" role="group" aria-label="Redes sociais ilustradas">
      {socialIcons.map(([name]) => (
        <span key={name} role="img" aria-label={name} title={name}>
          <SocialIcon name={name} />
        </span>
      ))}
    </span>
  );
}
