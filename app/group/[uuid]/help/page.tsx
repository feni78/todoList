"use client";

import { useParams, useRouter } from "next/navigation";
import { TopBar } from "@/components/layout/TopBar";
import { BottomNav } from "@/components/layout/BottomNav";
import { ChevronLeft } from "lucide-react";
import { useGroupStore } from "@/lib/store/groupStore";

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
  const scoreLabel = useGroupStore((s) => s.group?.useIkitaiLabel ? "行きたい度" : "やりたい度");

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
          <Item label={`${scoreLabel}を設定する`}>
            タスクをタップして編集画面を開き、🏆MAX・🥇金・🥈銀・🥉銅の4段階で評価します。メンバー全員の平均点が高いものほど上に表示されます。⚠️マークは自分がまだ評価していないサインです。
          </Item>
          <Divider />
          <Item label="ジャンルで整理する">
            旅行・グルメなど自由に作れるタグです。設定 → ジャンル管理で追加できます。右下のタグアイコン（🏷）からジャンルをまとめてつけたり外したりできます。
          </Item>
          <Divider />
          <Item label="ソート・絞り込み・検索">
            「{scoreLabel}順 / 新着順 / 距離順」ボタンでソートを切り替えられます。スライダーアイコン（≡）で詳細な絞り込み（ジャンル・場所・季節など）ができます。虫眼鏡アイコンでタイトルのテキスト検索ができます。
          </Item>
          <Divider />
          <Item label="距離で絞り込む">
            絞り込み画面で現在地または駅名を設定し、距離を選ぶと指定範囲内のタスクだけ表示されます。距離を選ぶとソートが自動で「距離順」に切り替わります。
          </Item>
          <Divider />
          <Item label="保留にする">
            「いつかやりたいけど今じゃない」タスクは編集画面でステータスを「保留」にするとHOLDタブに移動します。
          </Item>
        </Section>

        {/* ルーレット */}
        <Section title="🎰 ルーレット">
          <Item label="次にやることを決める">
            リストからランダムに1件を選びます。{scoreLabel}が高いタスクほど選ばれやすくなっています。
          </Item>
          <Divider />
          <Item label="通常 / スペシャル">
            通常はシンプルなルーレット、スペシャルはスロット演出で盛り上がれます。
          </Item>
          <Divider />
          <Item label="忖度レベル（設定で変更可）">
            0%は完全ランダム、100%に近づくほど全員が🏆MAXをつけたタスクだけが選ばれるようになります。
          </Item>
          <Divider />
          <Item label="絞り込み">
            フィルターアイコンからジャンル・場所・メンバーなどで対象を絞れます。
          </Item>
          <Divider />
          <Item label="完了にする">
            結果が出たら「完了にする」ボタンを押すと履歴タブに移動します。
          </Item>
        </Section>

        {/* 履歴 */}
        <Section title="✅ 履歴">
          <Item label="完了済みタスク">
            「完了にする」したタスクがここに一覧表示されます。絞り込みやソートはリストと同様に使えます。
          </Item>
          <Divider />
          <Item label="お気に入り">
            ☆ボタンでお気に入り登録できます。「お気に入り」ボタンでお気に入りだけ表示することもできます。
          </Item>
          <Divider />
          <Item label="完了日を変更する">
            完了日の部分をタップするとカレンダーが開き、実際にやった日付に変更できます。
          </Item>
        </Section>

        {/* 設定 */}
        <Section title="⚙️ 設定">
          <Item label="ユーザー切り替え">
            複数のメンバーで同じグループを使うときは「ログインユーザー」から自分の名前に切り替えてください。{scoreLabel}はメンバーごとに管理されます。
          </Item>
          <Divider />
          <Item label="表示設定">
            ダークモード・タスクへのメモ表示・登録者名の表示をON/OFFできます。メモ表示とソート順はグループごとに異なる設定が可能です。
          </Item>
          <Divider />
          <Item label="ジャンル管理">
            ジャンルの追加・編集・削除・並び替えができます。削除するとそのジャンルがついた全タスクからも外れます。
          </Item>
          <Divider />
          <Item label="デフォルト非表示">
            普段リストに出したくないジャンルや地域タグを設定しておくと、最初から絞り込みに反映されます。
          </Item>
          <Divider />
          <Item label="招待URLをコピー">
            メンバーに共有するときは「招待URLをコピー」でURLを送ります。同じグループに参加できます。
          </Item>
        </Section>

        {/* スコア早見表 */}
        <Section title={`🏆 ${scoreLabel}の目安`}>
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
            メンバー全員の平均スコアで自動的に並べ替えられます。誰かがMAXをつけると⚠️で他のメンバーに知らせます。
          </p>
        </Section>

      </div>

      <BottomNav groupId={uuid} />
    </div>
  );
}
