export interface ImageInfo {
  top: number;
  left: number;
  height: number;
  width: number;
}
export interface BgType extends ImageInfo {
  index: number;
  url: string;
  isRow: boolean;
}
export interface SharpOption {
  output?: string | ((name: string, index: number, hash: string) => string);
  outputPath?: string;
}

export interface LoaderOptions extends SharpOption {
  property?: string;
  cachePath?: string;
  template?: (data: {
    bgs: BgType[];
    isSeparate: boolean;
    selector: string;
    bgWidth: number;
    bgHeight: number;
    imgWidth: number;
    imgHeight: number;
  }) => string;
}
export interface PluginOptions {
  loaderContext: any;
  options: LoaderOptions;
}

export interface SharpPicOption {
  direction: "column" | "row";
  slice: number | number[];
}

export interface SharpParam {
  image: Buffer | string;
  options: SharpPicOption;
}

export interface ShareResult {
  resultPath: string;
  info: ImageInfo;
  index: number;
  hash: string;
  url: string;
}
export interface ShareOutput {
  dimension: { width: number; height: number };
  isRow: boolean;
  image: Buffer | string;
  sliceArr: number[];
  results: Promise<ShareResult>[];
}

export interface SharpTask {
  info: ImageInfo;
  slice: number;
  extra: () => any;
  hash: string;
}
export interface SharpReturn {
  dimension: { width: number; height: number; type?: string };
  image: string | Buffer;
  isRow: boolean;
  sliceArr: number[];
  tasks: SharpTask[];
}
