import { EntryForm } from "@/components/EntryForm";
import master from "@/data/reference/municipalities.json";

export default function Home() {
  const prefectures = master.prefectures.map(({ code, name }) => ({ code, name }));
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold">妊娠手続きナビ（仮称）</h1>
        <p className="text-base">4つ入れるだけで、今週やることがわかります。</p>
      </header>
      <EntryForm prefectures={prefectures} />
    </div>
  );
}
