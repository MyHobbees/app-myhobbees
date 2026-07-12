import {Link} from 'react-router';
import {UserRound} from 'lucide-react';
import type {Route} from './+types/qui-sommes-nous';
import {EditorialHero} from '~/components/EditorialHero';
import {FaqSection} from '~/components/FaqSection';

export const meta: Route.MetaFunction = () => [
  {title: 'Qui sommes-nous ? — My Hobbees'},
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

/** No team photos yet — swap the placeholder icon in TeamMember for a real one when they exist. */
const TEAM_MEMBERS = [
  'Aurore Dimech',
  'Brunic Feyou',
  'Dimitri Zindovic',
  'Antoine Schmerber-Perraud',
  'Mahmut-Ali Topal',
] as const;

export default function AboutPage() {
  return (
    <article
      className="editorial-page about-page"
      aria-labelledby="about-title"
    >
      <EditorialHero
        description="My Hobbees est né de l’envie de partager une passion pour la création manuelle et de la rendre accessible à toutes et tous, sans pression ni jugement."
        headingId="about-title"
        title="Une histoire de passion…"
        tone="blush"
      />

      <section className="about-ambition" aria-labelledby="ambition-title">
        <div className="page-width editorial-section section-heading centered">
          <h2 id="ambition-title">
            Une ambition : faciliter l’accès à l’art pour toutes et tous
          </h2>
          <p>
            Nous pensons que la créativité ne devrait jamais être réservée à
            quelques initié·es. My Hobbees imagine des box et des outils
            pensés pour que chacun·e puisse se lancer, quel que soit son
            niveau de départ.
          </p>
          <Link className="button button-primary" to="/abonnements">
            Découvrir nos abonnements
          </Link>
        </div>
      </section>

      <section className="page-width editorial-section about-values" aria-labelledby="values-title">
        <div className="section-heading centered">
          <h2 id="values-title">Nos valeurs</h2>
          <p>Trois convictions guident chacune de nos créations.</p>
        </div>
        <ul className="steps-grid about-values-grid">
          {COMMITMENTS.map((commitment) => (
            <li className="step-card about-value-card" key={commitment.title}>
              <h3>{commitment.title}</h3>
              <p>{commitment.description}</p>
            </li>
          ))}
        </ul>
        <div className="about-values-cta">
          <Link className="button button-primary" to="/abonnements">
            Découvrir nos abonnements
          </Link>
        </div>
      </section>

      <section className="about-team" aria-labelledby="team-title">
        <div className="page-width">
          <h2 id="team-title">Nos membres</h2>
          <div className="team-hive">
            <div className="team-row">
              {TEAM_MEMBERS.slice(0, 3).map((name) => (
                <TeamMember key={name} name={name} />
              ))}
            </div>
            <div className="team-row">
              {TEAM_MEMBERS.slice(3).map((name) => (
                <TeamMember key={name} name={name} />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="about-closing" aria-label="Notre philosophie">
        <div className="page-width">
          <blockquote>
            Pour créer, par besoin d’être parfait… Il suffit de prendre le
            temps d’essayer !
          </blockquote>
        </div>
      </section>

      <FaqSection />
    </article>
  );
}

function TeamMember({name}: {name: string}) {
  return (
    <div className="team-member">
      <span aria-hidden="true" className="team-member-avatar">
        <UserRound />
      </span>
      <span className="team-member-name">{name}</span>
    </div>
  );
}
