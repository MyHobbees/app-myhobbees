interface EditorialHeroProps {
  description: string;
  headingId: string;
  title: string;
  tone?: 'plain' | 'blush';
}

export function EditorialHero({
  description,
  headingId,
  title,
  tone = 'plain',
}: EditorialHeroProps) {
  return (
    <header className={`editorial-hero editorial-hero--${tone}`}>
      <div className="page-width editorial-hero-content">
        <h1 id={headingId}>{title}</h1>
        <p>{description}</p>
      </div>
    </header>
  );
}
