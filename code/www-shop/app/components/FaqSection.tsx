import {Link} from 'react-router';
import {Mail} from 'lucide-react';
import {AccordionList} from '~/components/AccordionList';
import {FAQ_TEASER_ITEMS} from '~/lib/faq';

/**
 * Compact FAQ teaser shown near the bottom of marketing pages. Pulls its
 * questions from the same source as the full /faq page (see app/lib/faq.ts)
 * so the two never drift out of sync.
 */
export function FaqSection() {
  return (
    <section className="faq-teaser" aria-labelledby="faq-teaser-title">
      <div className="page-width">
        <h2 id="faq-teaser-title">FAQ</h2>
        <AccordionList
          className="faq-teaser-list"
          items={FAQ_TEASER_ITEMS.map((item) => ({
            title: item.question,
            content: <p>{item.answer}</p>,
          }))}
        />
        <div className="faq-teaser-contact">
          <h3>Tu as encore une question ?</h3>
          <p>
            Envoie-nous un mail pour que nous puissions t’éclairer dans les
            plus brefs délais !
          </p>
          <Link className="button button-primary" to="/pages/contact">
            <Mail aria-hidden="true" />
            Contacte-nous !
          </Link>
        </div>
      </div>
    </section>
  );
}
