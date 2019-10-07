/**
 * Currently-supported Composer version.
 */
export const composerTag = '1.7';

/**
 * The name of the Composer image to use for projects.
 */
export const composerImage = 'composer';

/**
 * The full `<image>:<tag>` string for this image; useful for `docker run` or the `image:`
 * field in Docker Compose.
 */
export const composer = `${composerImage}:${composerTag}`;
