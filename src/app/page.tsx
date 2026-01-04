import OulipoEditor from '@/components/oulipo-editor';

export default function Home() {
  return (
    <main className="flex min-h-screen w-full flex-col items-center bg-background p-4 sm:p-8 font-headline">
      <OulipoEditor />
    </main>
  );
}
