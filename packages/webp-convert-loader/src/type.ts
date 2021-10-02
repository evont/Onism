export interface LoaderOptions {
  modules?: boolean;
  noWebpClass?: string;
  webpClass?: string;
  addNoJs?: boolean;
  noJsClass?: string;
  encodeOption?: Record<string, any>,
  quant?: {
    numColors?: number;
    ditter?: number
  }
}
