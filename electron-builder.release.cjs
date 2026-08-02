const packageJson = require("./package.json");

const { identity: _unsignedDevelopmentIdentity, ...mac } = packageJson.build.mac;

module.exports = {
  ...packageJson.build,
  forceCodeSigning: true,
  mac: {
    ...mac,
    hardenedRuntime: true,
    notarize: true
  }
};
