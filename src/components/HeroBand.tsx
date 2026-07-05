export function HeroBand({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div className="bg-ink text-white">
      <div className="tick-ruler" />
      <div className="px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          {title}
        </h1>
        <p className="mt-2 text-sm text-white/60">{subtitle}</p>
      </div>
      <div className="tick-ruler" />
    </div>
  );
}
