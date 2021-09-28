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
  },
  resolveLoader: {
    alias: {
      "webp-convert-loader": path.resolve(__dirname, "../lib"),
    },
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
          {
            loader: "webp-convert-loader",
            options: {
              addNoJs: false,
              noWebpClass: "nowebp",
              minifyFormate: "minify/[name]_minify[ext]",
              webpFormate: "webp/[name].webp",
            },
          },
        ],
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
