export default function PageLoader() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-robur-yellow">
          <span className="text-lg font-black text-robur-charcoal">R</span>
        </div>
        <div className="w-8 h-8 border-2 border-robur-light border-t-robur-charcoal rounded-full animate-spin" />
      </div>
    </div>
  );
}