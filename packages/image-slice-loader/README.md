# image-slice-loader

Tool that cut image slices from long image.

---

## Getting Started

To begin, you'll need to install `image-slice-loader`

```bash
npm install --save-dev image-slice-loader
```

### **As a Loader**

It can be used in webpack as loader, help you to extra image from your css, slice it and generate css background.  here is some [Example](https://github.com/evont/image-slice-loader/tree/main/example/web)

You need to combine `css-loader`, and make sure to add it **BEFORE** `css-loader` in your webpack config:

```js
module.exports = {
  module: {
    rules: [
      {
        test: /\.css$/i,
        use: [
          "css-loader",
          // "postcss-loader",
          {
            loader: "image-slice-loader",
            options: {
              outputPath: "@assets/slice",
              template: "./src/template.hbs",
              output: "[hash]_[name]_slice_[index]",
            },
          },
        ],
      },
    ],
  },
};
```

after setup loaders of css, you can use this feature in your css with the follow ways:

- You should always pass the background url as the first param.

  The second param decides the background size in your css, output will still use the origin size.

  The third param is the slice size, background will be slice with this size (the final slice may be smaller then this)

  ```css
  #app {
    long-bg: url(@assets/long-1.png) 375 300;
  }
  ```

- FEEL FREE If you want your background image to be sliced into different sizes, the third param can be a set of number, each number stands for the slice size.

  By the way, size is not in vertical only, you can also pass a `row` or `column` as the forth param, `row` means image will be sliced in horizontal direction, and `column` by default, means vertical direction

  ```css
  #app2 {
    long-bg: url(@assets/deep/long-2.jpeg) 375 120, 325, 333, 880, 550, 1000, 900,
      650, 920, 988 row;
  }
  ```

- The final param determine whether the output css use seperate template or not, you can pass it with or without direction, if is seperate, the transformed css will be inserted after the parent of current css, if NOT, and default, the transformed css will be replace the custom css.

  ```css
  #app3 {
    long-bg: url(@assets/long-3.png) 375 540, 425, 333, 880, 550, 1000, 900, 650,
      920, 988 true;
  }
  ```

## Options

|              Name               |                        Type                         |     Default      | Description                                                                                                                     |
| :-----------------------------: | :-------------------------------------------------: | :--------------: | :------------------------------------------------------------------------------------------------------------------------------ |
|   [**`property`**](#property)   |                     `{String}`                      |    `long-bg`     | Custom CSS property name                                                                                                        |
|     [**`output`**](#output)     | `{String\|Function(name, index, hash) -> {String}}` | `[hash]_[index]` | Output name formate for slice image                                                                                             |
| [**`outputPath`**](#outputPath) |                     `{String}`                      |    `./slice`     | Output path of slice images, relative to [webpack root context](https://v4.webpack.docschina.org/api/loaders/#this-rootcontext) |
|   [**`template`**](#template)   |           `{Function(data) -> {String}}`            |       `''`       | Template function of virtual property transformed local CSS                                                                     |

### `property`

Custom CSS property name, for example, if you use `long-pic`, your CSS will be like:

```css
#app {
  long-pic: url(@assets/long-1.png) 375;
}
```

### `output`

Output filename format like output.filename of Webpack.

you can pass a string with following tokens will be replaced:

- `[name]` the name of source background pic
- `[hash]` the hash of source background pic
- `[index]` the index of current slice, start from 0

or, you can pass a function in `(name, index, hash) => string` structure with the same params like above

### `outputPath`

Output path of slice images, relative to [webpack root context](https://v4.webpack.docschina.org/api/loaders/#this-rootcontext)

you can use `alias` such as `@assets/slice` as your output path

### `template`

template function to custom vitural property transformed local CSS

```typescript
interface BgType {
  top: number;
  left: number;
  height: number;
  width: number;
  index: number;
  url: string; // image url
  isRow: boolean; // determine image direction is in row or in column direction
}

// template function accept a data as follow structure
type template = (data: {
  bgs: BgType[]; // sliced images list 
  isSeparate: boolean; // whether is inside the selctor or seperated
  selector: string; // current selector that you use the property defined previously
  bgWidth: number; // background width that converted based on the backgroudn size
  bgHeight: number; // background height that converted based on the backgroudn size
  imgWidth: number; // origin image width
  imgHeight: number; // origin image height
}) => string;
```

### **As a normal Node module**

You can use it in your node.js service, upload some long image and slice it to store in your own way, here is some [Example](https://github.com/evont/image-slice-loader/tree/main/example/server)

`sharps`: you can pass some images with slice option and handle them in your own way;
`outputSharp`: this is more effiective if you just want to slice images and output them;

```javascript
const { outputSharp, sharps } = require("image-slice-loader");
const got = require("got");
const uploadFile = async (imageUrl) => {
  try {
    const response = await got(imageUrl).buffer();
    const tasks = sharps([
      {
        image: response,
        options: {
          slice: 1200,
          direction: "column",
        },
      },
    ]);
    tasks.forEach((result) => {
      const { dimension, tasks } = result;
      tasks.map(async (task) => {
        const { info, extra, hash } = task;
        await extra().toFile(
          path.resolve(__dirname, "slice", `${hash}.${dimension.type}`)
        );
        // upload file or store it
      });
    });
  } catch (error) {
    console.log(error);
  }
};
uploadFile("https://yourimgagelink");

function dealImages() {
  outputSharp([
    {
      image: path.resolve(__dirname, "./long.png"),
      options: {
        slice: 200,
        direction: "column",
      },
    },
  ]);
}
dealImages();
```

### **As a cli**

You can run `image-slice -i ./yourimage -s 200, 200 -d column -o ./yououput` or `image-slice -j someimagesInfo.json` to generate your slices

here is some [Example](https://github.com/evont/image-slice-loader/tree/main/example/bin)

Available params: 
```sh
  -i, --image [type]        image to be sliced
  -d, --direction [type]    direction
  -s, --slice [numbers...]  slice size
  -o, --output [type]       output path for image
  -j, --json [type]         image json file
  -h, --help                display help for command
```