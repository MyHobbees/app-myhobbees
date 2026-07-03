import {BadgeCheck, PackageCheck, RefreshCw} from 'lucide-react';
import type {ComponentType} from 'react';

export interface ReassuranceItem {
  Icon: ComponentType<{'aria-hidden'?: boolean | 'true' | 'false'}>;
  description: string;
  title: string;
}

const DEFAULT_ITEMS: readonly ReassuranceItem[] = [
  {
    Icon: PackageCheck,
    title: 'Tout est inclus',
    description: 'Le matériel et le guide sont réunis dans ta box.',
  },
  {
    Icon: BadgeCheck,
    title: 'Accessible aux débutants',
    description: 'Chaque activité est pensée pour se lancer sereinement.',
  },
  {
    Icon: RefreshCw,
    title: 'Une surprise chaque mois',
    description: 'Un nouvel univers créatif pour nourrir ta curiosité.',
  },
];

export function Reassurance({
  items = DEFAULT_ITEMS,
}: {
  items?: readonly ReassuranceItem[];
}) {
  return (
    <section className="reassurance" aria-label="Les avantages My Hobbees">
      <div className="page-width reassurance-grid">
        {items.map(({description, Icon, title}) => (
          <article key={title} className="reassurance-item">
            <span aria-hidden="true" className="reassurance-icon">
              <Icon />
            </span>
            <div>
              <h3>{title}</h3>
              <p>{description}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
