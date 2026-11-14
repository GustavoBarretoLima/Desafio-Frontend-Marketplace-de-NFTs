import { Link } from "@tanstack/react-router";

import { FooterSocial } from "./FooterSocial";

export function MarketFooter({ product = false }: { product?: boolean }) {
  return (
      <footer className={product ? "home-footer product-footer" : "home-footer"}>
        <div className="home-footer-brand">
          <strong>KURIO</strong>
          <p>Feito para colecionadores, criadores e cultura</p>
          {product && <><span>contato@email.com</span><span>+55 11 4002 8922</span></>}
        </div>
        <nav aria-label="Rodapé">
          <div>
            <strong><Link to="/profile">Meu perfil</Link></strong>
            <Link to="/profile" hash="profile-favorites">Minha coleção</Link>
            {product && <><span>Atividade</span><span>Estúdio do criador</span><Link to="/profile" hash="profile-favorites">Lista de interesse</Link></>}
          </div>
          <div>
            <strong>Central de ajuda</strong>
            <Link to="/" hash="home-guide-title" search={{ q: "", sort: undefined, availability: undefined, page: undefined }}>Como comprar NFTs</Link>
            <Link to="/profile" hash="profile-wallets">Carteira e segurança</Link>
            {product ? <><span>Política do mercado</span><span>Denunciar item</span></> : <Link to="/cart">Carrinho de NFTs</Link>}
          </div>
          <div><strong>Coleções</strong>{["Arte digital", "Fotografia", "Música", "Arte 3D", "Utilidade"].map((name) => (
            <Link key={name} to="/" hash="catalogo" search={{ q: "", sort: undefined, page: undefined, availability: undefined, collection: name }}>{name}</Link>
          ))}</div>
          <div className="home-footer-social">
            <strong>Redes sociais</strong>
            <FooterSocial />
            <strong className="home-wallet-title">Carteiras compatíveis</strong>
            <ul className="home-wallet-label" aria-label="Carteiras compatíveis">
              <li>MetaMask</li>
              <li>WalletConnect</li>
              <li>Coinbase</li>
            </ul>
          </div>
        </nav>
        <small>&copy; 2026 Kurio. Propriedade digital para todos.</small>
      </footer>
  );
}
