import { Dependency } from "webpack";

export class ReplaceDependency extends Dependency {
  replaceRanges;
  static Template = {
    apply(dep, source, outputOptions, requestShortener) {
      const ranges = dep.replaceRanges;
      for (const range of ranges) source.replace(range[0], range[1], range[2]);
    },
  };
  constructor(replaceRanges) {
    super();
    this.replaceRanges = replaceRanges;
  }

  updateRanges(replaceRanges) {
    this.replaceRanges = replaceRanges;
  }

  updateHash(hash) {
    hash.update(this.replaceRanges + "");
  }
}
