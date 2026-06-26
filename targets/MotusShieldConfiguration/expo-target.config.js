/** @type {import('@bacons/apple-targets').Config} */
module.exports = {
  type: "shield-config",
  name: "MotusShieldConfiguration",
  frameworks: ["ManagedSettings", "ManagedSettingsUI", "FamilyControls", "UIKit", "SwiftUI"],
  entitlements: {
    "com.apple.security.application-groups": [
      "group.com.kayrabali.Motus"
    ]
  }
};
