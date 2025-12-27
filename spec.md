# Screen Catalog / Navigation Graph OSS 構想まとめ（Vue想定）

## 1. 背景 / 課題
- デザイナーがFigmaで画面一覧や導線を管理するが、更新が追いつかず放置されがち
- 導線・画面パターンが多いと「古いデザインが残っている」「導線の抜け漏れ」が起きやすい
- 新規メンバー / 業務委託のキャッチアップに「最新仕様の参照点」が必要
- 影響範囲（この変更でどこに影響が出るか）を即座に把握したい
- UIの細部は Storybook / 実画面で参照できるため、完璧な再現は不要

## 2. 方向性の結論
### 「ワイヤーフレームを作る」よりも
### **“画面カタログ + 遷移マップ + 影響範囲の自動生成” をコード側を真実（Source of Truth）として作る**
- A（導線 / 情報構造の合意）＞B（見た目確認）であるため、Figmaよりコードに寄せるのが強い
- ドキュメントが実装と別の場所にあるから更新されない → 実装の近くにメタ情報を置く
- CIで「更新忘れ」を検知して“書かないとマージできない”状態にする

---

## 3. 目指すMVP像（おすすめアーキテクチャ）

### 3.1 Screen Registry（画面カタログ）
各画面に `screen.meta.ts` を置き、画面仕様を宣言する。

```ts
export const screen = defineScreen({
  id: "billing.invoice.detail",
  title: "請求書詳細",
  route: "/billing/invoices/:id",
  owner: ["billing"],
  tags: ["billing", "invoice"],
  dependsOn: ["InvoiceAPI.getDetail", "PaymentAPI.getStatus"],
  entryPoints: ["billing.invoice.list"],
  next: ["billing.invoice.edit", "billing.payment.start"],
})
```

#### これでできること
- 画面一覧ページを自動生成
- 画面詳細ページを自動生成
- 画面遷移マップ（グラフ）を自動生成
- 変更の影響範囲（API変更→影響画面 / 画面変更→影響画面）を逆引き

---

### 3.2 Navigation Graph（導線マップ）
導線は `next` と `entryPoints` から生成する。

#### 方式A（推奨：MVP向け）
- 遷移を静的に宣言（正確）
- 手間は少しあるが信頼できる

#### 方式B（将来的に拡張）
- Vue Router定義 / `router.push()` / `<RouterLink>` をASTで抽出して補助
- 自動抽出は精度問題があるため、MVPでは補助的にする

---

### 3.3 UI参照はリンクで十分
- Storybook / 実画面URL / API仕様などへのリンクを画面詳細に持たせる
- ワイヤーUIの完璧な再現はMVPでは不要

---

## 4. MVPとして作るべき機能（価値が出る順）

### Phase 1（1〜2週間想定）
1. `defineScreen()`（型付きメタ定義）
2. 画面一覧（検索 / タグ / ownerフィルタ）
3. 画面詳細（route, owner, tags, dependsOn, entryPoints, next）
4. 遷移グラフ表示（Mermaid等でOK）

### Phase 2（運用が一気に強くなる）
5. PR差分から影響範囲レポート生成（API→影響画面 / 画面→影響画面）
6. `next` のAI提案（コード解析 + 推定）

---

## 5. “更新忘れ” を防ぐ運用（必須）
### CIで強制する
- 新規 route 追加 / 変更があったら `screen.meta.ts` の存在を必須にする
- `dependsOn` なども型チェックしてメタ情報の品質を担保
- 「書かないとマージできない」を作ることで常に最新の仕様を保証できる

---

## 6. OSS化の可否と勝ち筋
### 結論：OSS化に向いていて、需要も高い
#### 理由
- 「画面一覧」「導線」「影響範囲」はあらゆるプロダクトで共通
- DX改善系で、業務固有知識への依存が少ない
- Figma/ドキュメントが更新されない課題は普遍的

### OSSとして刺さるコンセプト
- **「画面をコードで宣言し、画面カタログ・遷移図・影響範囲を自動生成する」**
- “ワイヤーフレーム”よりも **Screen Catalog / Screenbook** のような打ち出しが刺さる

---

## 7. OSSの構成案（分割すると強い）

### 7.1 `@screenbook/core`
- `defineScreen()`
- screen metaの型・バリデーション基盤（必要ならzod）

### 7.2 `@screenbook/cli`
- `screenbook init`
- `screenbook build`：メタ情報を集約してJSON生成
- `screenbook graph`：Mermaid/Graphviz生成
- `screenbook lint`：screen.meta未定義route検知（CI用）

### 7.3 `@screenbook/ui`
- 画面一覧 / 画面詳細 / 遷移グラフ表示
- UIは好みが分かれるので、core/cliと分離して任意導入にする

---

## 8. 技術スタック（実用的なパーツ候補）

### 遷移グラフ表示
- **Mermaid**（最速・MVP最適）
- Cytoscape.js（本格グラフUIに拡張したい場合）
- D3（完全カスタムしたい場合）

### メタ情報管理・解析
- zod（メタのバリデーション）
- ts-morph（AST解析で router.push / link の抽出に強い）

### カタログUI / ドキュメント
- VitePress（軽くて導入が簡単）
- Nuxt Content（Vue系で自然）
- Storybook連携も可能

---

## 9. OSSのロードマップ（現実的）
### Phase 0（まず公開できる最小）
- defineScreen()
- buildで一覧生成
- Mermaidで遷移図生成
- lintで更新忘れ防止
- README（導入5分）

### Phase 1（伸びるポイント）
- GitHub Action：PRに影響範囲コメント（差分から影響画面を列挙）

### Phase 2（AI連携）
- route定義からmetaテンプレ生成
- PR差分から next/entryPoints の提案

---

## 10. OSS成功の絶対条件
- **導入が5分で終わる**
  - `npm i -D screenbook`
  - `npx screenbook init`
  - `npx screenbook dev` で一覧が開く
- **フレームワーク依存を薄く**
  - 最初は Vue Router に寄せるが、設計は Screen Registry中心にして他フレームワークにも展開できる形にする
- **CIで更新忘れを潰せる**
  - “screen.metaがないrouteがあると失敗” が導入価値の核心

---

## 11. 推奨ディレクトリ構成例
```
src/
  screens/
    billing/
      invoice/
        detail/
          screen.meta.ts
          page.vue
tools/
  screenbook/
    build.ts
apps/
  screenbook-ui/
    ...
screenbook.config.ts
```

---

## 12. AIエージェントを入れると美味しいポイント
- route追加 → `screen.meta.ts` の雛形を自動生成
- PR差分 → 影響範囲レポート生成（PRコメント）
- next/entryPointsを推定して提案（人が確認して採用）

---

## まとめ
- UI再現より **「仕様が最新であること」「導線が見えること」「影響範囲が分かること」** をコードで保証する
- Screen Registry（画面メタ）をSource of Truthにして、自動生成する
- CIで更新忘れを潰すことで、Figma放置でも運用できる
- OSS化も十分可能で、導入容易性（5分）とCI連携が鍵
