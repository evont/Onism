# `@onism/webp-convert-loader`

[![NPM](https://img.shields.io/npm/v/@onism/webp-convert-loader?style=flat-square)](https://www.npmjs.com/package/@onism/webp-convert-loader)
[![MIT License](https://img.shields.io/apm/l/atomic-design-ui.svg?style=flat-square)](https://github.com/tterb/atomic-design-ui/blob/master/LICENSEs)
[![GPLv3 License](https://img.shields.io/badge/License-GPL%20v3-yellow.svg?style=flat-square)](https://opensource.org/licenses/)
[![AGPL License](https://img.shields.io/badge/license-AGPL-blue.svg?style=flat-square)](http://www.gnu.org/licenses/agpl-3.0)


This loader combime `webp-in-css` with `squoosh`, convert your image to `webp` if possible, and transform your css selector with `webp` or `nowebp` class.

## Getting Started

```bash
npm install --save-dev @onism/webp-convert-loader
```

in your `webppack.config.js`, add this loader as the last loader in css rules

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
},
plugins: [
  new WebpConvertPlugin({
    filename: '[hash].[ext]',
    output: "images"
  }),
]
```

You need to manually import `@onism/webp-convert-loader/polyfill.js` or insert script that can detect webp support of browser in the `<head>` tag.

If you want to use `addNoJs` option, you need manually set `no-js` class on `<body>`. Polyfill will remove this class, if JS is enabled in the browser. Polyfill should be inserted in the `<head>`, without `async` or `defer` attributes, before css. `addNoJs` option is enabled by default.

## Options

|    Name     |  Type   |  Default  | Description                                      |
| :---------: | :-----: | :-------: | :----------------------------------------------- |
|   modules   | Boolean |  `false`  | wrap classes to :global() to support CSS Modules |
| noWebpClass | String  | `no-webp` | class name for browser without WebP support. |
| webpClass | String | `webp` | class name for browser with WebP support. |
| addNoJs | Boolean | `false` | add `no-js` class to selector |
| noJsClass | String | `no-js` | class name for browser without JS support. |
| [**`minifyFormate`**](minifyFormate) | String | `minify/[name][ext]` | output minified image name formate |
| [**`webpFormate`**](#webpFormate) | String | `webp/[name][ext].webp` | - |
| [**`encodeOption`**](#encodeOption) | Object | `{}` | - |
| [**`quant`**](#quant) | Object | `{}` | - |

### `minifyFormate`

support placeholders includes `[name]`, `[ext]`, `[path]` and `[hash]`

### `webpFormate`
similart to [**`minifyFormate`**](minifyFormate)

### `encodeOption`

encode option pass to `squoosh` to minify images, see [encodeOption](https://github.com/GoogleChromeLabs/squoosh/blob/dev/libsquoosh/src/codecs.ts) to found the default values for each options 

`{}` an empty object means 'use default settings

### `quant`

Reduce the number of colors used (aka. paletting), see [quant](<(https://github.com/GoogleChromeLabs/squoosh/blob/dev/libsquoosh/src/codecs.ts)>) to found quant option


## Feedback

If you have any feedback, please reach out to us at evontgoh@foxmail.com

  