import ManagedSettings
import ManagedSettingsUI
import UIKit

class ShieldConfigurationExtension: ShieldConfigurationDataSource {
    private func motusShieldConfiguration(for appName: String) -> ShieldConfiguration {
        let subtitleText = "Complete a physical challenge to regain access to \(appName).\n\n⚠️ Ensure Sleep/Focus/Do Not Disturb modes are off to receive the challenge notification!"
        
        return ShieldConfiguration(
            backgroundBlurStyle: .systemMaterialDark,
            backgroundColor: UIColor.black,
            icon: UIImage(systemName: "hourglass"),
            title: ShieldConfiguration.Label(
                text: "Access Blocked",
                color: .white
            ),
            subtitle: ShieldConfiguration.Label(
                text: subtitleText,
                color: .lightGray
            ),
            primaryButtonLabel: ShieldConfiguration.Label(
                text: "Start Challenge in Motus",
                color: .black
            ),
            primaryButtonBackgroundColor: UIColor(red: 57/255.0, green: 255/255.0, blue: 20/255.0, alpha: 1.0)
        )
    }

    private func savePendingAppName(_ name: String) {
        if let containerURL = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: "group.com.kayrabali.Motus") {
            if !FileManager.default.fileExists(atPath: containerURL.path) {
                try? FileManager.default.createDirectory(at: containerURL, withIntermediateDirectories: true)
            }
            let fileURL = containerURL.appendingPathComponent("pending_app.txt")
            try? name.write(to: fileURL, atomically: true, encoding: .utf8)
        }
        
        // Backup write to UserDefaults
        if let sharedDefaults = UserDefaults(suiteName: "group.com.kayrabali.Motus") {
            sharedDefaults.set(name, forKey: "PendingUnlockApplicationName")
            sharedDefaults.synchronize()
        }
    }

    override func configuration(shielding application: Application) -> ShieldConfiguration {
        let appName = application.localizedDisplayName ?? "this app"
        savePendingAppName(appName)
        return motusShieldConfiguration(for: appName)
    }
    
    override func configuration(shielding application: Application, in category: ActivityCategory) -> ShieldConfiguration {
        let appName = application.localizedDisplayName ?? "this app"
        savePendingAppName(appName)
        return motusShieldConfiguration(for: appName)
    }
    
    override func configuration(shielding webDomain: WebDomain) -> ShieldConfiguration {
        let domainName = webDomain.domain ?? "this website"
        savePendingAppName(domainName)
        return motusShieldConfiguration(for: domainName)
    }
    
    override func configuration(shielding webDomain: WebDomain, in category: ActivityCategory) -> ShieldConfiguration {
        let domainName = webDomain.domain ?? "this website"
        savePendingAppName(domainName)
        return motusShieldConfiguration(for: domainName)
    }
}
