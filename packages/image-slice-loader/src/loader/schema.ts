export default {
  type: "object" as const,
  properties: {
    property: {
      description: "Custom CSS property name.",
      type: "string" as const,
    },
    output: {
      description: "slice block name",
      anyOf: [{ instanceof: "Function" as const }, { type: "string" as const }],
    },
    outputPath: {
      type: "string" as const,
      description: "output path of slice images",
    },
    template: {
      instanceof: "Function" as const,
      description: "Template of virtual property transformed local CSS.",
    },
    cachePath: {
      type: "string" as const,
      description: "cache path of slice images",
    }
  },
  additionalProperties: false,
};
