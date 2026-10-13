export default function Loading() {
  return (
    <main
      id="workspace"
      className="page loading-state"
      aria-busy="true"
      aria-label="Loading Mantle registry"
    >
      <p role="status" className="eyebrow">
        Loading the repository
      </p>
      <div className="skeleton skeleton-title" />
      <div className="skeleton skeleton-description" />
      <div className="agent-grid">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="skeleton skeleton-card" />
        ))}
      </div>
    </main>
  );
}
