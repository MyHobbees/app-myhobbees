import {Link} from 'react-router';
import type {Route} from './+types/qui-sommes-nous';
import {EditorialHero} from '~/components/EditorialHero';

export const meta: Route.MetaFunction = () => [
  {title: 'Qui sommes-nous ? \u2014 My Hobbees'},
  {
    name: 'description',
    content:
      'Découvre l’histoire, la mission et les valeurs de My Hobbees, les box créatives surprise pensées pour prendre du temps pour soi.',
  },
];

const COMMITMENTS = [
  {
    title: 'Rendre la créativité accessible',
    description:
      'Des activités pensées pour être simples à découvrir, même quand on débute.',
  },
  {
    title: 'Créer des moments pour soi',
    description:
      'Des box conçues pour ralentir, apprendre et profiter de son temps créatif.',
  },
  {
    title: 'Entretenir la curiosité',
    description:
      'Chaque nouvelle box est une invitation à explorer un univers différent.',
  },
] as const;

export default function AboutPage() {
  return (
    <article
      className="editorial-page about-page"
      aria-labelledby="about-title"
    >
      <EditorialHero
        description="My Hobbees, c’est l’envie de remettre plus de créativité, de curiosité et de temps pour soi dans le quotidien."
        headingId="about-title"
        title="Qui sommes-nous ?"
        tone="blush"
      />

      <section className="page-width editorial-section about-story">
        <div className="editorial-copy">
          <h2>La créativité, sans prise de tête</h2>
          <p>
            My Hobbees est né d’une idée simple : il devrait être facile de
            découvrir une nouvelle activité créative sans passer des heures à
            chercher le bon matériel, les bons outils ou le bon tutoriel.
          </p>
          <p>
            Nous imaginons des box prêtes à explorer, pensées pour transformer
            un moment ordinaire en une parenthèse créative.
          </p>
        </div>
      </section>

      <section className="about-mission" aria-labelledby="mission-title">
        <div className="page-width editorial-section">
          <div className="section-heading centered">
            <h2 id="mission-title">Notre mission</h2>
            <p>
              Te donner envie d’essayer, de créer et de prendre confiance, une
              activité après l’autre.
            </p>
          </div>
          <ul className="steps-grid about-values-grid">
            {COMMITMENTS.map((commitment) => (
              <li className="step-card about-value-card" key={commitment.title}>
                <h3>{commitment.title}</h3>
                <p>{commitment.description}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="page-width editorial-section about-concept">
        <div className="editorial-copy">
          <h2>Une surprise pensée pour toi</h2>
          <p>
            Tu indiques les univers créatifs qui t’attirent. Ensuite, My
            Hobbees prépare une activité surprise à découvrir à ton rythme.
          </p>
          <Link className="button button-primary" to="/collections/all">
            Découvrir la box surprise
          </Link>
        </div>
      </section>

      <section className="about-closing" aria-label="Notre philosophie">
        <div className="page-width">
          <blockquote>
            Créer, ce n’est pas être parfait. C’est prendre le temps d’essayer.
          </blockquote>
        </div>
      </section>
    </article>
  );
}
