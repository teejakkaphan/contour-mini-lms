export function BaseLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen w-full items-center">
      <div className="flex-1 w-full grid grid-cols-7 items-center py-8">
        <div className="col-span-full lg:col-start-2 lg:col-span-5 px-6">
          {children}
        </div>
      </div>
    </main>
  );
}
