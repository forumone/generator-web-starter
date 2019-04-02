// Ambient declarations
// These declarations tell TypeScript that image assets exist and can be imported
// using "import filePath from '...'" syntax.

declare module '*.svg' {
  /**
   * The Webpack-generated path to this SVG file.
   */
  const path: string;
  export = path;
}

declare module '*.png' {
  /**
   * The Webpack-generated path to this PNG file.
   */
  const path: string;
  export = path;
}

declare module '*.jpg' {
  /**
   * The Webpack-generated path to this JPG file.
   */
  const path: string;
  export = path;
}
