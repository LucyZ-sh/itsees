const { execFileSync } = require("child_process");
const path = require("path");

exports.default = async function hardenMacTransportSecurity(context) {
  if (context.electronPlatformName !== "darwin") return;

  const plistPath = path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`, "Contents", "Info.plist");
  try {
    execFileSync("/usr/libexec/PlistBuddy", ["-c", "Delete :NSAppTransportSecurity", plistPath], {
      stdio: "ignore"
    });
  } catch {
    // The key is optional; the hardened replacement below is authoritative.
  }
  execFileSync("/usr/libexec/PlistBuddy", ["-c", "Add :NSAppTransportSecurity dict", plistPath]);
  execFileSync("/usr/libexec/PlistBuddy", [
    "-c",
    "Add :NSAppTransportSecurity:NSAllowsArbitraryLoads bool false",
    plistPath
  ]);
  execFileSync("/usr/libexec/PlistBuddy", [
    "-c",
    "Add :NSAppTransportSecurity:NSAllowsLocalNetworking bool false",
    plistPath
  ]);
};
