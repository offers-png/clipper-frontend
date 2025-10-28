export default function Header({ user, onLogout, wmText, setWmText, wmOn, setWmOn }) {
  return (
    <header className="sticky top-0 z-40 border-b border-brand-line/40 bg-brand-surface/80 backdrop-blur">
      <div className="mx-auto max-w-5xl px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="/clipforge-logo.svg" alt="ClipForge AI" className="h-7" />
          <span className="text-sm text-white/60 hidden sm:block">Smart Video Studio</span>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-white/80 text-sm bg-brand-card border border-brand-line/50 rounded-xl px-3 py-1.5">
            <input type="checkbox" checked={wmOn} onChange={e=>setWmOn(e.target.checked)} />
            Watermark
            <input
              placeholder="@YourBrand"
              value={wmText}
              onChange={e=>setWmText(e.target.value)}
              className="ml-2 bg-transparent outline-none placeholder:text-white/30 w-36"
            />
          </label>

          {user ? (
            <button onClick={onLogout}
              className="px-3 py-1.5 rounded-lg bg-white/10 text-white hover:bg-white/15">
              Logout
            </button>
          ) : (
            <a href="/auth"
               className="px-3 py-1.5 rounded-lg bg-brand-primary text-white hover:opacity-90">
              Sign in
            </a>
          )}
        </div>
      </div>
    </header>
  );
}
