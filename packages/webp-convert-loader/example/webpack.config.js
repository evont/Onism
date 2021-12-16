const path = require("path");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const { CleanWebpackPlugin } = require("clean-webpack-plugin");

const { WebpConvertPlugin } = require("@onism/webp-convert-loader");
module.exports = {
  mode: "production",
  entry: "./src/index.js",
  output: {
    path: path.resolve(__dirname, "dist"),
    publicPath: "",
    // assetModuleFilename: 'images/[hash][ext][query]'
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
        test: /\.(png|jpe?g|webp||gif)$/i,
        use: [
          {
            loader: 'url-loader',
            options: {
              limit: 8192,
              loader: "file-loader",
              outputPath: "images"
            }
          },
        ],
      },
      {
        test: /\.css$/i,
        use: [
          MiniCssExtractPlugin.loader,
          "css-loader",
          {
            loader: "@onism/webp-convert-loader",
            options: {
              // modules: true,
              minifyFormate: "minify/[name]_minify[ext]",
              webpFormate: "webp/[name].[contenthash:8].webp",
              // encodeOption: {
              //   oxipng: {
              //     level: 4
              //   },
              //   mozjpeg: {
              //     quality: 60
              //   }
              // },
              // quant: {
              //   numColors: 250,
              //   dither: 0.6
              // }
            },
          },
        ],
      },
    ],
  },
  plugins: [
    new WebpConvertPlugin({
      filename: '[hash].[ext]',
      output: "images"
    }),
    new CleanWebpackPlugin(),
    new MiniCssExtractPlugin(),
    new HtmlWebpackPlugin({
      template: "./public/index.html",
    }),
  ],
};
