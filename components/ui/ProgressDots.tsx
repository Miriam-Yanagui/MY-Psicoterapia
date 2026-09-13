export function ProgressDots({ active }: { active: number }) {
  return <div className="progress" aria-label={`Paso ${active} de 4`}>{[1,2,3,4].map((step) => <span key={step} className={step === active ? "active" : ""} />)}</div>;
}
