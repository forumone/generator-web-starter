import { coerce, gt } from 'semver';

function semverMax(v1: string, v2: string) {
  // Accept the consequences of `coerce' failing to divine a valid version number. We
  // assume that in all cases, we're compaing X.Y-style version numbers, and `coerce' is
  // just here to add a final patch version number.

  /* eslint-disable @typescript-eslint/no-non-null-assertion */

  const fullVersion1 = coerce(v1)!;
  const fullVersion2 = coerce(v2)!;

  return gt(fullVersion1, fullVersion2) ? v1 : v2;

  /* eslint-enable @typescript-eslint/no-non-null-assertion */
}

export default semverMax;
