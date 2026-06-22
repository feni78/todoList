import { CreateGroupForm } from "@/components/group/CreateGroupForm";

export default function CreatePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm flex flex-col gap-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">ふたりのやりたいことリスト</h1>
          <p className="text-sm text-muted-foreground">グループを作成してパートナーを招待しよう</p>
        </div>
        <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
          <CreateGroupForm />
        </div>
      </div>
    </main>
  );
}
