# Shopify Checkout メールアドレス非ASCIIバリデーション

Shopify Functions（Cart and Checkout Validation API）で、購入者のメールアドレスに全角文字・日本語などの非ASCII文字（U+0080以上）が含まれている場合に **注文確定（`CHECKOUT_COMPLETION`）をブロック** します。

- 外部API・DB・ネットワーク通信なし。アクセススコープ追加なし
- Checkout UI Extensions・テーマは変更しない
- 入力値の自動変換・修正はしない。メール形式チェックは Shopify 標準に任せる
- メールアドレスはログに出力しない

## 構成

```
shopify.app.toml                      アプリ設定（`shopify app config link` で上書き）
package.json                          ルート（@shopify/cli, workspaces）
extensions/email-ascii-validation/
  shopify.extension.toml              api_version = 2026-07 / target = cart.validations.generate.run
  schema.graphql                      Function API スキーマ（テンプレート由来）
  src/cart_validations_generate_run.graphql   入力クエリ
  src/cart_validations_generate_run.js        実装
  src/index.js
  tests/unit.test.js                  JS 単体テスト
  tests/default.test.js               WASM ビルド＋fixture 実行テスト（テンプレート標準）
  tests/fixtures/*.json               テストケース No.1〜10 ＋ステップ別ケース
  locales/en.default.json
```

テンプレートは Shopify CLI の `cart_checkout_validation`（JavaScript）と同一の構成・関数名・エクスポートです。

## 仕様

| 条件 | 結果 |
|---|---|
| `buyerJourney.step === "CHECKOUT_COMPLETION"` かつ `cart.buyerIdentity.email` に `/[^\x00-\x7F]/` が一致 | エラー（注文確定をブロック） |
| 上記以外（`CART_INTERACTION` / `CHECKOUT_INTERACTION`、email が null・空文字、buyerIdentity なし） | エラーなし |

- エラーメッセージ: `メールアドレスに全角文字や日本語が含まれています。半角文字で入力してください。`
- 対象フィールド: `$.cart.buyerIdentity.email`

## セットアップ

前提: Node.js 20 以上、Shopify Partner アカウント、開発ストア（チェックアウトルールの有効化は Shopify Plus または開発ストア）。

```bash
npm install
npx shopify app config link   # 既存アプリに紐付け or 新規作成。client_id が設定されます
```

既存の Shopify アプリに組み込む場合は `extensions/email-ascii-validation/` をそのアプリの `extensions/` 配下にコピーするだけで動作します（他のファイルの変更は不要）。

## ビルド・テスト

```bash
cd extensions/email-ascii-validation
npm run typegen     # 入力クエリ変更時に generated/api.ts を再生成
npm run build       # dist/function.wasm を生成
npm test            # 単体テスト + WASM fixture テスト
npm run test:unit   # 単体テストのみ（高速）
```

任意の入力でのローカル実行:

```bash
echo '{"buyerJourney":{"step":"CHECKOUT_COMPLETION"},"cart":{"buyerIdentity":{"email":"test＠example.com"}}}' | npx shopify app function run
```

## 開発ストアでの動作確認

1. `npm run dev`（ルートで実行）→ 開発ストアを選択。アプリがインストールされ Function が配信されます
2. 管理画面 **設定 → チェックアウト → チェックアウトルール** で「Email ASCII validation」を追加して有効化
3. ストアフロントで商品をカートに入れチェックアウトし、以下を確認
   - `test@example.com` 等 → 注文確定できる
   - `ｔｅｓｔ@example.com` / `test＠example.com` / `テスト@example.com` / 末尾全角スペース等 → 「支払う」押下時にメール欄にエラーが表示され確定できない
   - エラー後に半角へ修正 → 注文確定できる
   - 入力途中（`CHECKOUT_INTERACTION`）ではエラーが出ない
   - ログイン購入・ゲスト購入の両方
   - 電話番号のみのチェックアウト（ストア設定で許可している場合）→ 影響なし
4. 実行ログは Partner Dashboard → アプリ → 拡張機能 → Function の実行ログ、または `shopify app dev` のコンソールで確認（Function 自体はメールアドレスを出力しません）

## 本番デプロイ（承認後に実施）

```bash
npm run deploy   # = shopify app deploy。新しいアプリバージョンを作成・リリース
```

その後、本番ストアにアプリをインストールし、**設定 → チェックアウト → チェックアウトルール** で有効化します。

## 無効化・ロールバック

- 即時無効化: **設定 → チェックアウト → チェックアウトルール** で該当ルールをオフ（または削除）
- 完全削除: アプリをアンインストール、または拡張を削除して `shopify app deploy`
- Function の実行失敗時（例外・タイムアウト）は、ルールの「失敗時にブロック」設定（`blockOnFailure`）がオフであればチェックアウトは継続します

## 参考

- https://shopify.dev/docs/api/functions/2026-04/cart-and-checkout-validation
- https://shopify.dev/docs/apps/build/checkout/cart-checkout-validation/create-checkout-validation
