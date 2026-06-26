import ManagedSettings
import ManagedSettingsUI
import UIKit

class ShieldConfigurationExtension: ShieldConfigurationDataSource {
    private func motusShieldConfiguration() -> ShieldConfiguration {
        return ShieldConfiguration(
            backgroundBlurStyle: .systemMaterialDark,
            backgroundColor: UIColor.black,
            icon: UIImage(systemName: "hourglass"),
            title: ShieldConfiguration.Label(
                text: "Access Blocked",
                color: .white
            ),
            subtitle: ShieldConfiguration.Label(
                text: "This app is locked by Motus. Complete your physical challenge to regain access.",
                color: .lightGray
            ),
            primaryButtonLabel: ShieldConfiguration.Label(
                text: "Start Challenge in Motus",
                color: .black
            ),
            primaryButtonBackgroundColor: UIColor(red: 57/255.0, green: 255/255.0, blue: 20/255.0, alpha: 1.0)
        )
    }

    override func configuration(shielding application: Application) -> ShieldConfiguration {
        return motusShieldConfiguration()
    }
    
    override func configuration(shielding application: Application, in category: ActivityCategory) -> ShieldConfiguration {
        return motusShieldConfiguration()
    }
    
    override func configuration(shielding webDomain: WebDomain) -> ShieldConfiguration {
        return motusShieldConfiguration()
    }
    
    override func configuration(shielding webDomain: WebDomain, in category: ActivityCategory) -> ShieldConfiguration {
        return motusShieldConfiguration()
    }
}
