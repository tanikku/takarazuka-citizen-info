# 図解の生成元

`assets/photos/` のWebPを作るためのSVG元データ（サイトには配信されない）。再編集するときはSVGを直し、Chromeで描画してWebPに書き出す。

| SVG | 書き出し先 | 書き出しサイズ |
|---|---|---|
| php-vulnerability-explainer.svg | assets/photos/php-vulnerability-explainer.webp | 800×860 を 1.5 倍（1200×1290） |
| php-vulnerability-thumb.svg | assets/photos/php-vulnerability-thumb.webp | 192×144 を 1.5 倍（288×216） |
| php-vulnerability-ogp.svg | assets/photos/php-vulnerability-ogp-1200x630.webp | 800×420 を 1.5 倍（1200×630）。SNS用のog:image |

書き出しは、ヘッドレスChromeの `Page.captureScreenshot`（format: webp, quality: 78, clip.scale: 1.5、deviceScaleFactor: 1）。新しい依存パッケージは使わない。
