import {Link} from 'react-router';
import type {Route} from './+types/faq';
import {AccordionList} from '~/components/AccordionList';
import {EditorialHero} from '~/components/EditorialHero';
import {FAQ_ITEMS} from '~/lib/faq';

export const meta: Route.MetaFunction = () => [
  {title: 'FAQ \u2014 My Hobbees'},
  {
    name: 'description',
    content:
      'Retrouve les réponses aux questions fréquentes sur les box créatives surprise My Hobbees.',
  },
];

export default function FaqPage() {
  return (
    <article className="editorial-page faq-page" aria-labelledby="faq-title">
      <EditorialHero
        description="Tout ce que tu dois savoir avant de recevoir ta box surprise."
        headingId="faq-title"
        title="Questions fréquentes"
      />

      <section className="page-width faq-content" aria-label="Réponses aux questions fréquentes">
        <AccordionList
          className="faq-list"
          items={FAQ_ITEMS.map((item) => ({
            title: item.question,
            content: <p>{item.answer}</p>,
          }))}
        />

        <div className="faq-contact">
          <h2>Tu as encore une question ?</h2>
          <Link className="button button-secondary" to="/pages/contact">
            Nous contacter
          </Link>
        </div>
      </section>
    </article>
  );
}
