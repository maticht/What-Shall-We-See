import { Surface } from "@/components/ui/surface";

export default function LoadingCategoryPage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8 lg:py-6">
      <Surface className="p-5">
        <div className="h-4 w-32 rounded-[var(--radius-ui)] bg-[var(--muted-strong)]" />
        <div className="mt-4 h-8 w-56 rounded-[var(--radius-ui)] bg-[var(--muted-strong)]" />
        <div className="mt-3 h-4 w-72 rounded-[var(--radius-ui)] bg-[var(--muted-strong)]" />
      </Surface>
      <Surface className="p-5">
        <div className="h-11 rounded-[var(--radius-ui)] bg-[var(--muted-strong)]" />
      </Surface>
    </main>
  );
}
