/**
 * Currently-supported Composer version.
 */
export const composerTag = '1.9';

/**
 * The name of the Composer image to use for projects.
 */
export const composerImage = 'forumone/composer';

/**
 * The full `<image>:<tag>` string for this image; useful for `docker run` or the `image:`
 * field in Docker Compose.
 */
export const composer = `${composerImage}:${composerTag}`;

/**
 * The Docker Hub image used to build Gesso.
 */
export const gessoImage = 'forumone/gesso';

/**
 * The currently-supported tag for Gesso builds.
 */
export const gessoTag = 'php7.3-node12';

/**
 * The full `<image>:<tag>` string for Gesso; useful for the `image:` field in Docker
 * Compose or the `FROM` instruction in a Dockerfile.
 */
export const gesso = `${gessoImage}:${gessoTag}`;
