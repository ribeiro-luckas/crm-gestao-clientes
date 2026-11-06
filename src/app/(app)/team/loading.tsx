export default function TeamLoading() {
  return (
    <div
     className="team-loading" 
     role="status" 
     aria-live="polite" 
     aria-busy="true"
    >
      <span>Carregando equipe e responsabilidades…</span>

      <div
       className="team-loading-panel" 
       aria-hidden="true"
      >
        <i />
        <i />
        <i />
        <i />
      </div>

      <div
       className="team-loading-panel team-loading-panel--summary" 
       aria-hidden="true"
      >
        <i />
        <i />
        <i />
        <i />
      </div>
    </div>
  );
}
