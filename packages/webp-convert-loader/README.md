# `@onism/webp-convert-loader`

This loader can convert your image to `webp` if possible, and transform your css selector with `webp` or `nowebp` class.

## Getting Started

```bash
npm install --save-dev @onism/webp-convert-loader
```

in your `webppack.config.js`, add this loader as last loader in css

```javascript
module: {
  rules: [
    {
      test: /\.css$/i,
      use: [
        MiniCssExtractPlugin.loader,
        "css-loader",
        {
          loader: "webp-convert-loader",
          options: {
            encodeOption: {
              oxipng: {
                level: 4,
              },
              mozjpeg: {
                quality: 60,
              },
            },
            quant: {
              numColors: 255,
              dither: 0.7,
            },
          },
        },
      ],
    },
  ];
}
```

You should manually add `@onism/webp-convert-loader/polyfill.js` or insert script that can detect webp support of browser in the `<head>` tag.

If you want to use `addNoJs` option, you need manually set `no-js` class on `<body>`. Polyfill will remove this class, if JS is enabled in the browser. Polyfill should be inserted in the `<head>`, without `async` or `defer` attributes, before css. `addNoJs` option is enabled by default.

## Options

|     Name      |  Type   |         Default         | Description                  |
| :-----------: | :-----: | :---------------------: | :--------------------------- |
|    modules    | Boolean |         `false`         | turn on `CSS Modules` or not |
|  noWebpClass  | String  |        `no-webp`        | -                            |
|   webpClass   | String  |         `webp`          | -                            |
|    addNoJs    | Boolean |         `false`         | -                            |
|   noJsClass   | String  |         `no-js`         | -                            |
| minifyFormate | String  |  `minify/[name][ext]`   | -                            |
|  webpFormate  | String  | `webp/[name][ext].webp` | -                            |
| encodeOption  | Object  |          `{}`           | -                            |
|     quant     | Object  |          `{}`           | -                            |

[encodeOption](https://github.com/GoogleChromeLabs/squoosh/blob/dev/libsquoosh/src/codecs.ts)

`{}` an empty object means 'use default settings

```

```
