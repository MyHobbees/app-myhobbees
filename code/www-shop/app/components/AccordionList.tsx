import type {ReactNode} from 'react';

export interface AccordionItem {
  content: ReactNode;
  title: string;
}

export function AccordionList({
  className,
  items,
}: {
  className?: string;
  items: readonly AccordionItem[];
}) {
  const classes = ['accordion-list', className].filter(Boolean).join(' ');

  return (
    <div className={classes}>
      {items.map((item) => (
        <details key={item.title}>
          <summary>{item.title}</summary>
          <div className="accordion-content">{item.content}</div>
        </details>
      ))}
    </div>
  );
}
