interface EditorialHeroProps {
  description: string;
  headingId: string;
  note?: string;
  title: string;
  tone?: 'plain' | 'blush';
}

export function EditorialHero({
  description,
  headingId,
  note,
  title,
  tone = 'plain',
}: EditorialHeroProps) {
  return (
    <header className={`editorial-hero editorial-hero--${tone}`}>
      <div className="page-width editorial-hero-content">
        <h1 id={headingId}>{title}</h1>
        <p>{description}</p>
        {note ? <p className="editorial-hero-note">{note}</p> : null}
      </div>
    </header>
  );
}
