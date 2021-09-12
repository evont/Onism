const path = require("path");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const { CleanWebpackPlugin } = require("clean-webpack-plugin");

module.exports = {
  mode: "production",
  entry: "./src/index.js",
  output: {
    path: path.resolve(__dirname, "dist"),
    publicPath: "./",
    assetModuleFilename: "images/[hash][ext][query]",
  },
  resolve: {
    alias: {
      "@assets": path.resolve("./src/assets"),
      "@": path.resolve("./src"),
      _$: path.resolve("./src"),
    },
  },
  // watch: true,
  stats: "minimal",
  module: {
    rules: [
      {
        test: /\.css$/i,
        use: [
          MiniCssExtractPlugin.loader,
          "css-loader",
          "postcss-loader",
          {
            loader: path.resolve(__dirname, "../../lib/loader"),
            options: {
              outputPath: "@assets/slice",
              template: ({ bgs, bgWidth, bgHeight, isSeparate, selector }) => {
                if (isSeparate) {
                  return `${selector} .img {
                    background-repeat: no-repeat;
                    background-position: center;
                    background-size: contain;
                  }${
                    bgs.map((bg, ind) => {
                      const { width, height, url } = bg;
                      return `${selector} .img:nth-child(${ind + 1}) {
                        width: ${width}px; 
                        height: ${height}px;
                        background-image: url(${url});}`
                    }).join("")
                  }`;
                } else {
                  const bp = [];
                  const bs = [];
                  const bi = [];
                  bgs.forEach((bg) => {
                    const { isRow, top, left, width, height, url } = bg;
                    bp.push(
                      `${isRow ? `${left}px` : "center"} ${isRow ? "center" : `${top}px`}`
                    );
                    bs.push(`${width}px ${height}px`);
                    bi.push(`url(${url})`);
                  });
                  return [
                    "background-repeat: no-repeat",
                    `background-position:${bp.join(",")}`,
                    `background-size: ${bs.join(",")}`,
                    `background-image: ${bi.join(",")}`,
                    `width: ${bgWidth}px`,
                    `height: ${bgHeight}px`,
                  ].join(";");
                }
              },
              output: "[name]_slice_[index]",
            },
          },
        ],
      },
      {
        test: /\.(png|jpe?g|webp|git|svg|)$/i,
        type: "asset/resource",
      },
    ],
  },
  plugins: [
    new CleanWebpackPlugin(),
    new MiniCssExtractPlugin(),
    new HtmlWebpackPlugin({
      template: "./public/index.html",
    }),
  ],
};
