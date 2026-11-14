import { useState } from "react";

const articles = [
  ["ivory-baron-088", "12 de setembro", 6, "Como funciona a propriedade de NFTs", "Aprenda a colecionar, negociar e verificar ativos digitais."],
  ["emerald-ape-042", "13 de setembro", 2, "10 artistas digitais para acompanhar", "Conheça criadores que moldam a cultura digital."],
  ["violet-nomad-314", "15 de setembro", 3, "Raridade, atributos e procedência", "Entenda raridade, procedência, direitos autorais e utilidade."],
  ["golden-beat-207", "15 de setembro", 2, "Como proteger sua carteira", "Proteja sua carteira, seus ativos e sua identidade."],
] as const;

const articleDetails = {
  "ivory-baron-088": "Antes de negociar um NFT, confira a coleção, o contrato e o identificador do token. A compra transfere o token. Os direitos sobre a obra dependem da licença da coleção.",
  "emerald-ape-042": "Ao descobrir artistas digitais, procure portfólios, exposições e coleções anteriores. Acompanhe os canais oficiais para conhecer o processo criativo e verificar novos lançamentos.",
  "violet-nomad-314": "Compare os atributos dentro da mesma coleção e confira o histórico do token. Um atributo raro pode distinguir uma peça, e a licença define como a obra pode ser usada.",
  "golden-beat-207": "Guarde sua frase de recuperação fora da internet e confira o endereço do site antes de conectar a carteira. Revise as permissões antes de assinar qualquer solicitação.",
};

export function HomeJournal() {

  return (

      <section className="home-journal" aria-labelledby="home-guide-title">
        <h2 id="home-guide-title">Diário da Cunhagem</h2>
        <p>Histórias, guias e insights para colecionadores sobre o universo da propriedade digital.</p>
        <ul>
          {articles.map(([image, date, minutes, title, description]) => (
            <li key={image}>
              <img src={`/nfts/${image}.jpg`} alt="" width={1254} height={1254} loading="lazy" />
              <div>
                <p className="home-journal-meta">{date} <span aria-hidden="true">|</span> Leitura de {minutes} min</p>
                <strong>{title}</strong>
                <p>{description}</p>
                <details>
                  <summary aria-label={`Ler mais sobre ${title}`}>Ler mais →</summary>
                  <p>{articleDetails[image]}</p>
                </details>
              </div>
            </li>
          ))}
        </ul>
      </section>
  );
}

export function MarketGuide() {
  const [subscribed, setSubscribed] = useState(false);
  return (
      <section aria-label="Informações do marketplace" className="home-guide">
        <ul>
          <li><b aria-hidden="true">W</b><strong>Segurança da carteira</strong><p>Proteja sua carteira e colecione arte digital verificada com confiança.</p></li>
          <li><b aria-hidden="true">C</b><strong>Criadores em destaque</strong><p>Conheça artistas, estúdios e comunidades que moldam a cultura digital na rede.</p></li>
          <li><b aria-hidden="true">D</b><strong>Alertas de lançamentos</strong><p>Receba calendários de cunhagem, novidades de listas de acesso e análises do mercado.</p></li>
          <li>
            <strong>Antecipe-se ao próximo lançamento</strong>
            <form className="home-newsletter" onSubmit={(event) => {
              event.preventDefault();
              setSubscribed(true);
            }}>
              <label htmlFor="home-newsletter-email" className="sr-only">E-mail para receber novidades</label>
              <input id="home-newsletter-email" type="email" required placeholder="digite seu e-mail..." onChange={() => setSubscribed(false)} />
              <button type="submit">Enviar</button>
            </form>
            <p>Receba lançamentos selecionados, histórias de criadores e novidades do mercado.</p>
            {subscribed && <p role="status">Inscrição simulada nesta demonstração.</p>}
          </li>
        </ul>
      </section>

  );
}
