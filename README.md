# わくわくキッチン

ブラウザで遊ぶ、ポインター操作のお料理ゲームのスケルトンです。
スーパーファミコンの料理パート（指示に従ってタップ・ドラッグ・長押しする）から着想していますが、絵・音・文章はすべてオリジナルです。

いま遊べる料理は **マヨオムレツ** です。

## あそびかた

1. タイトルで「タップしてスタート」
2. 下（または横）の指示どおりに、画面のハイライトを操作します
3. たまごを割る → 混ぜる → マヨを入れる → 焼く → 折る → 盛り付ける

| 工程 | 操作 |
| --- | --- |
| 卵を割る | たまごを 2かい タップ |
| 混ぜる | ボウルのうえで ぐるぐるドラッグ |
| マヨを入れる | マヨネーズをボウルへドラッグ |
| 焼く | フライパンを長押し |
| 折る | 左へスワイプ |
| 盛り付ける | オムレツをお皿へドラッグ |

マウスでもタッチでも同じ Pointer Events の経路です。

## ローカルで動かす

ES モジュールと `fetch` を使うので、`file://` ではなく静的サーバで開いてください。

```bash
python3 -m http.server 8080
```

ブラウザで http://localhost:8080/ を開きます。

GitHub Pages に載せる場合も、このリポジトリのルートを公開するだけで動きます。

## 画面のしくみ

- 内部解像度は **160×144**（SFC より少し小さいピクセル画面）
- 整数倍に拡大し、`image-rendering: pixelated` でくっきり表示
- 余白は黒い帯ではなく、キッチンの壁タイル
- たて（スマホ）：上がゲーム、下が指示
- よこ（PC / ランドスケープ）：左がゲーム、右が指示
- キャンバスは `touch-action: none`。長押しメニューや選択、ダブルタップズームを抑止
- タイトルのタップは、将来 iPhone で音を出すためのアンロックにも使います

`?debug=1` を付けるとホットスポットの矩形が見えます。

## レシピの足し方

1. `data/recipes/your-dish.json` を追加する（下の形式）
2. `data/recipes/index.json` の `recipes` に 1 行足し、必要なら `default` を変える

ゲーム側は汎用の `src/recipe-runner.js` が JSON を読むだけなので、新しい操作を足さない限り **JS を触らなくて大丈夫** です。

### ステップ JSON

```json
{
  "id": "crack-eggs",
  "title": "卵を割る",
  "instruction": "たまごを タップして、ボウルに わりいれよう。",
  "hint": "たまごは 2こ。",
  "playable": true,
  "hotspots": [
    {
      "id": "egg-a",
      "x": 6, "y": 80, "w": 18, "h": 24,
      "onHit": { "set": { "egg-a": false }, "fx": "crack" }
    }
  ],
  "action": { "type": "tap", "oncePerHotspot": true },
  "complete": { "type": "taps", "count": 2 },
  "visualProgress": [{ "at": 1, "set": { "bowl": "one-egg" } }],
  "onEnter": { "announce": "はじめるよ" },
  "onComplete": { "set": { "bowl": "two-eggs" } },
  "feedback": { "miss": "たまごを タップしてね。" }
}
```

`action.type` は今のところ次のとおりです。

- `tap` / `repeated-tap` … ホットスポットを規定回タップ（`complete.count`）
- `stir` … ホットスポット内の移動距離（`complete.px`）
- `hold` … 長押しミリ秒（`complete.ms`）。範囲外では進まない
- `drag` … `from` から `to` へ。`grab` でオブジェクトがついてくる
- `swipe` … `direction` + `distance`

未実装の工程は `"playable": false` にすると、タップでスキップできます。

オブジェクトの見た目は `scene.objects[].sprite` + `state` で、描画は `src/engine/draw.js` のプレースホルダーピクセルアートです。

## フォルダ

```
index.html
src/main.js
src/recipe-runner.js
src/engine/          表示・入力・ピクセル絵・効果音
data/recipes/        料理データ
```

## テスト

```bash
node --test
```

ビルドツールは使いません。
