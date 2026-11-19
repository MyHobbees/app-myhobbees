import type {Route} from './+types/collections.all';
import {Check} from 'lucide-react';
import {BoxIllustration} from '~/components/BoxIllustration';
import {EditorialHero} from '~/components/EditorialHero';
import {FaqSection} from '~/components/FaqSection';
import {BOXES} from '~/lib/boxes';
import {buildOpenGraphTags, canonicalUrl} from '~/lib/seo';

const TITLE = 'Nos boxes | My Hobbees';
const DESCRIPTION =
  'Découvre les box créatives My Hobbees à l’unité : le matériel, les outils et le guide pas à pas pour explorer une nouvelle passion.';

export const meta: Route.MetaFunction = ({data}) => {
  return [
    {title: TITLE},
    {name: 'description', content: DESCRIPTION},
    ...(data?.canonicalUrl
      ? [
          {tagName: 'link' as const, rel: 'canonical', href: data.canonicalUrl},
          ...buildOpenGraphTags({
            title: TITLE,
            description: DESCRIPTION,
            url: data.canonicalUrl,
            type: 'website',
          }),
        ]
      : []),
  ];
};

export async function loader({request}: Route.LoaderArgs) {
  return {
    canonicalUrl: canonicalUrl(request, '/collections/all'),
  };
}

const BOXES_ORDER = [BOXES.crochet, BOXES.couture, BOXES.peinture];

export default function Collection() {
  return (
    <article className="editorial-page boxes-page" aria-labelledby="boxes-title">
      <EditorialHero
        description="Chaque box contient le matériel, les outils et le guide pas à pas pour découvrir une nouvelle activité créative, à ton rythme."
        headingId="boxes-title"
        note="Envie d’une surprise chaque mois ? Découvre aussi nos abonnements."
        title="Nos boxes"
        tone="blush"
      />
      <section className="page-width collection boxes-page-grid">
        <div className="products-grid">
          {BOXES_ORDER.map((box) => (
            <article
              aria-labelledby={`box-${box.slug}-title`}
              className="product-item"
              key={box.slug}
            >
              <div className="product-item-media">
                <BoxIllustration craft={box.slug} />
              </div>
              <div className="product-item-content">
                <h3 id={`box-${box.slug}-title`}>{box.title}</h3>
                <p>{box.tagline}</p>
                <ul className="subscription-feature-list">
                  {box.included.map((item) => (
                    <li key={item}>
                      <Check aria-hidden="true" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          ))}
        </div>
      </section>
      <FaqSection />
    </article>
  );
}
