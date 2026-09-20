import { EntryForm } from "@/components/EntryForm";
import { loadServiceArea } from "@/lib/service-area";

export default function Home() {
  const area = loadServiceArea();
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold">妊娠手続きナビ（仮称）</h1>
        <p className="text-base">4つ入れるだけで、今週やることがわかります。</p>
      </header>
      <EntryForm area={area} />
    </div>
  );
}
