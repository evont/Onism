#!/usr/bin/env node

import { Command } from "commander";
import { sharps } from "./index";
import * as path from "path";
import * as fs from "fs-extra";
import { getHash } from "./core/util";
const program = new Command();

program
  .option("-i, --image [type]", "image to be sliced")
  .option("-d, --direction [type]", "direction")
  .option("-s, --slice [numbers...]", "slice size")
  .option("-o, --output [type]", "output path for image")
  .option("-j, --json [type]", "image json file");

program.parse();
// console.log(program.opts());

function handlePath(p) {
  const isAbsolute = path.isAbsolute(p);
  if (!isAbsolute) p = path.resolve(process.cwd(), p);
  return p;
}
function formateOption(options) {
  return options.map((item) => {
    const { options, image } = item;
    const { slice, direction = "column" } = options;
    return {
      image,
      options: {
        slice: [...(Array.isArray(slice) ? slice : [slice])].map((s) =>
          Number.isNaN(+s) ? 0 : +s
        ),
        direction,
      },
    };
  });
}
interface ExecOption {
  image: string;
  direction: string;
  slice: number[];
  json: string;
  output: string;
}
function exec({ image, direction, slice, json, output }: ExecOption) {
  let options;
  if (json) {
    json = handlePath(json);
    const content = fs.readJsonSync(json);
    options = Array.isArray(content) ? content : [content];
  } else if (image) {
    image = handlePath(image);
    options = [
      {
        image,
        options: {
          slice,
          direction,
        },
      },
    ];
  }
  if (!options) throw new Error("Please pass a json path or a image path");
  options = formateOption(options);
  output = handlePath(output || "./slice");
  fs.ensureDirSync(output);

  sharps(options).forEach((result) => {
    const { dimension, image, tasks } = result;
    const name = Buffer.isBuffer(image)
      ? getHash(image).substr(0, 7)
      : path.basename(image, path.extname(image));
    tasks.map(async (task, ind) => {
      const { extra } = task;
      await extra().toFile(
        path.resolve(output, `${name}_${ind + 1}.${dimension.type}`)
      );
    });
  });
}

exec(program.opts() as ExecOption);
