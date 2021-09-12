const { outputSharp, sharps } = require("../../dist");
const path = require("path");
const fs = require("fs");
function dealImages() {
  outputSharp(
    [
      {
        image: path.resolve(__dirname, "./long.png"),
        options: {
          slice: 200,
          direction: "column",
        },
      },
      {
        image: fs.readFileSync(path.resolve(__dirname, "./long2.jpeg")),
        options: {
          slice: 200,
          direction: "row",
        },
      },
      {
        image: path.resolve(__dirname, "./test.jpeg"),
        options: {
          slice: 200,
          direction: "row",
        },
      },
      // {
      //   image: path.resolve(__dirname, "./tessst.jpeg"),
      //   options: {
      //     slice: 200,
      //     direction: "row",
      //   },
      // },
    ],
    {
      outputPath: path.resolve(__dirname, "slice"),
      output: "[hash]_[name]",
    }
  );
}

dealImages();

// upload file instead of output file
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
        console.log("upload file", hash);
        // upload file here
      });
    });
  } catch (error) {
    console.log(error);
  }
};
uploadFile(
  "https://hbimg.huabanimg.com/f14ed9a80c7332fcd62ba2c378571119cad40c54371404-sXvbr0"
);
