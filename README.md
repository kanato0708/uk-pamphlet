# 宇工祭2026 デジタルパンフレット

## ファイル構成
- `index.html` … 本体（マップ＋催事一覧）
- `events.json` … 催事データ（ここだけ編集すればOK。コード変更不要）
- `manifest.json` / `sw.js` / `icon-192.png` / `icon-512.png` … ホーム画面追加・オフライン対応用

## events.json の編集方法
階・体育館ごとに配列で催し物を追加するだけです。

```json
"3f": {
  "label": "3階",
  "building": "校舎",
  "items": [
    { "name": "催し物名", "room": "教室", "time": "9:00-15:00", "desc": "説明文（省略可）" }
  ]
}
```

## 公開手順（GitHub Pages / 無料・HTTPS対応）
1. GitHubで新しいリポジトリを作成（例: `ukousai-2026`）
2. このフォルダ内の6ファイルをアップロード（またはgit push）
3. リポジトリの Settings → Pages → Branch を `main` / `/root` に設定して保存
4. 数分後 `https://ユーザー名.github.io/ukousai-2026/` でアクセス可能に
5. QRコードを生成してポスターや来場者受付に掲示
6. iPhoneはSafari共有→「ホーム画面に追加」、AndroidはChromeで開くと自動でインストール提案が出ます

## 校舎マップの調整
`index.html` 内の `<svg class="map">` 部分の `x`, `y`, `width`, `height` を変更すると、
階数や体育館の位置・大きさを実際の校舎レイアウトに合わせて調整できます。
