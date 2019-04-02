import { gt, valid } from 'semver';

// We sometimes deal with 'x.y'-style version tags because the minor version doesn't
// really matter, but the semver module *requires* that we use x.y.z notation. So
// this module appends a '.0' to those versions to ensure that the semver module
// doesn't crash due to a version syntax problem.
function fullyQualifyVersion(version: string): string {
  if (!valid(version)) {
    return version + '.0';
  }

  return version;
}

function semverMax(v1: string, v2: string) {
  const fullVersion1 = fullyQualifyVersion(v1);
  const fullVersion2 = fullyQualifyVersion(v2);

  return gt(fullVersion1, fullVersion2) ? v1 : v2;
}

export default semverMax;
