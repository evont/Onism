'use strict';

const NullDependency = require('webpack/lib/dependencies/NullDependency');

export class ReplaceDependency extends NullDependency {
    constructor(replaceRanges) {
        super();
        this.replaceRanges = replaceRanges;
    }

    updateRanges(replaceRanges) {
        this.replaceRanges = replaceRanges;
    }

    updateHash(hash) {
        hash.update(this.replaceRanges + '');
    }
}

ReplaceDependency.Template = {
    apply(dep, source, outputOptions, requestShortener) {
        const ranges = dep.replaceRanges;
        for (const range of ranges)
            source.replace(range[0], range[1], range[2]);
    },
};

