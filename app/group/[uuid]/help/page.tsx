"use client";

import { useParams, useRouter } from "next/navigation";
import { TopBar } from "@/components/layout/TopBar";
import { BottomNav } from "@/components/layout/BottomNav";
import { ChevronLeft } from "lucide-react";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-card rounded-2xl border border-border p-4 flex flex-col gap-3">
      <h2 className="font-semibold text-base">{title}</h2>
      {children}
    </section>
  );
}

function Item({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-sm font-medium">{label}</span>
      <span className="text-sm text-muted-foreground leading-relaxed">{children}</span>
    </div>
  );
}

function Divider() {
  return <div className="border-t border-border/60" />;
}

export default function HelpPage() {
  const { uuid } = useParams<{ uuid: string }>();
  const router = useRouter();

  return (
    <div className="flex flex-col min-h-screen pb-16">
      <TopBar
        title="使い方"
        left={
          <button
            onClick={() => router.back()}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft size={20} />
          </button>
        }
      />

      <div className="flex-1 flex flex-col gap-4 p-4 pb-8 max-w-md mx-auto w-full">

        {/* リスト */}
        <Section title="📋 リスト">
          <Item label="タスクを追加する">
            右下の ＋ ボタンからひとつずつ追加できます。「一括」ボタンで1行1件ずつまとめて追加もできます。
          </Item>
          <Divider />
          <Item label="やりたい度を設定する">
            タスクをタップして編集画面を開き、🏆MAX・🥇金・🥈銀・🥉銅の4段階で評価します。ふたりの平均点が高いものほど上に表示されます。⚠️マークは自分がまだ評価していないサインです。
          </Item>
          <Divider />
          <Item label="シチュエーション">
            「家」「外」「どちらでも」の3種類。上部のタブで絞り込めます。「🌸季節限定」タブは季節を設定したタスクだけを表示します。
          </Item>
          <Divider />
          <Item label="ジャンルで整理する">
            旅行・グルメなど自由に作れるタグです。設定 → ジャンル管理で追加できます。右下のタグアイコン（🏷）からジャンルを一括でつけたり外したりできます。
          </Item>
          <Divider />
          <Item label="絞り込み・検索">
            右上の虫眼鏡で文字検索、スライダーアイコン（≡）で詳細な絞り込みができます。
          </Item>
          <Divider />
          <Item label="保留にする">
            「いつかやりたいけど今じゃない」タスクは編集画面でステータスを「保留」にするとHOLDタブに移動します。
          </Item>
          <Divider />
          <Item label="CSV取り込み">
            「CSV」ボタンから複数ファイルをまとめて取り込めます。タイトルが同じタスクは重複せず更新されます。
          </Item>
        </Section>

        {/* ルーレット */}
        <Section title="🎰 ルーレット">
          <Item label="次にやることを決める">
            リストからランダムに1件を選びます。やりたい度が高いタスクほど選ばれやすくなっています。
          </Item>
          <Divider />
          <Item label="通常 / スペシャル">
            通常はシンプルなルーレット、スペシャルはスロット演出で盛り上がれます。
          </Item>
          <Divider />
          <Item label="忖度レベル（設定で変更可）">
            0%は完全ランダム、100%に近づくほどふたりとも🏆MAXをつけたタスクだけが選ばれるようになります。
          </Item>
          <Divider />
          <Item label="絞り込み">
            フィルターアイコンからシチュエーション・ジャンル・メンバーなどで対象を絞れます。
          </Item>
          <Divider />
          <Item label="完了にする">
            結果が出たら「完了にする」ボタンを押すと履歴タブに移動します。
          </Item>
        </Section>

        {/* 履歴 */}
        <Section title="✅ 履歴">
          <Item label="完了済みタスク">
            「完了にする」したタスクがここに一覧表示されます。
          </Item>
          <Divider />
          <Item label="お気に入り">
            ☆ボタンでお気に入り登録できます。右上のフィルターでお気に入りだけ表示することもできます。
          </Item>
          <Divider />
          <Item label="完了日を変更する">
            完了日の部分をタップするとカレンダーが開き、実際にやった日付に変更できます。
          </Item>
        </Section>

        {/* 設定 */}
        <Section title="⚙️ 設定">
          <Item label="ユーザー切り替え">
            同じグループを使うときは「ログインユーザー」から自分の名前に切り替えてください。やりたい度はユーザーごとに管理されます。
          </Item>
          <Divider />
          <Item label="招待URLをコピー">
            パートナーにアプリを共有するときは「招待URLをコピー」でURLを送ります。同じグループに参加できます。
          </Item>
          <Divider />
          <Item label="ジャンル管理">
            ジャンルの追加・編集・削除ができます。削除するとそのジャンルがついた全タスクからも外れます。
          </Item>
          <Divider />
          <Item label="ごみ箱">
            削除したタスクは30日間ごみ箱に保管されます。誤って消してしまった場合はここから復元できます。
          </Item>
          <Divider />
          <Item label="タスクを選んで削除">
            チェックボックスで複数のタスクをまとめて削除できます。削除したタスクはごみ箱へ移動します。
          </Item>
          <Divider />
          <Item label="データエクスポート / インポート">
            タスクをJSONファイルで書き出し・読み込みできます。バックアップ用途に使えます。
          </Item>
        </Section>

        {/* スコア早見表 */}
        <Section title="🏆 やりたい度の目安">
          <div className="flex flex-col gap-2">
            {[
              { icon: "🏆", label: "MAX", desc: "絶対やりたい！最優先" },
              { icon: "🥇", label: "金", desc: "ぜひやりたい" },
              { icon: "🥈", label: "銀", desc: "できればやりたい" },
              { icon: "🥉", label: "銅", desc: "まあいいかな" },
            ].map(({ icon, label, desc }) => (
              <div key={label} className="flex items-center gap-3">
                <span className="text-xl w-8 text-center">{icon}</span>
                <span className="text-sm font-medium w-8">{label}</span>
                <span className="text-sm text-muted-foreground">{desc}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            ふたりの平均スコアで自動的に並べ替えられます。どちらかがMAXをつけると⚠️で相手に知らせます。
          </p>
        </Section>

      </div>

      <BottomNav groupId={uuid} />
    </div>
  );
}
