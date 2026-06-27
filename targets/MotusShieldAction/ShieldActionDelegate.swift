import ManagedSettings
import UserNotifications

class ShieldActionExtension: ShieldActionDelegate {
    
    private func handleAction(action: ShieldAction, completionHandler: @escaping (ShieldActionResponse) -> Void) {
        switch action {
        case .primaryButtonPressed:
            let content = UNMutableNotificationContent()
            content.title = "Motus Challenge"
            
            content.body = "Tap to choose your physical challenge and unlock this app."
            content.sound = UNNotificationSound.default
            
            let request = UNNotificationRequest(identifier: UUID().uuidString, content: content, trigger: nil)
            UNUserNotificationCenter.current().add(request) { error in
                if let error = error {
                    print("Error scheduling notification: \(error)")
                }
                // Call completionHandler inside the closure to ensure the notification is scheduled before the extension terminates.
                completionHandler(.defer)
            }
        case .secondaryButtonPressed:
            completionHandler(.defer)
        @unknown default:
            completionHandler(.defer)
        }
    }

    override func handle(action: ShieldAction, for application: ApplicationToken, completionHandler: @escaping (ShieldActionResponse) -> Void) {
        if let sharedDefaults = UserDefaults(suiteName: "group.com.kayrabali.Motus"),
           let data = try? JSONEncoder().encode(application) {
            sharedDefaults.set(data, forKey: "PendingUnlockApplicationToken")
            sharedDefaults.removeObject(forKey: "PendingUnlockCategoryToken")
            sharedDefaults.synchronize()
        }
        handleAction(action: action, completionHandler: completionHandler)
    }
    
    override func handle(action: ShieldAction, for webDomain: WebDomainToken, completionHandler: @escaping (ShieldActionResponse) -> Void) {
        handleAction(action: action, completionHandler: completionHandler)
    }
    
    override func handle(action: ShieldAction, for category: ActivityCategoryToken, completionHandler: @escaping (ShieldActionResponse) -> Void) {
        if let sharedDefaults = UserDefaults(suiteName: "group.com.kayrabali.Motus"),
           let data = try? JSONEncoder().encode(category) {
            sharedDefaults.set(data, forKey: "PendingUnlockCategoryToken")
            sharedDefaults.removeObject(forKey: "PendingUnlockApplicationToken")
            sharedDefaults.synchronize()
        }
        handleAction(action: action, completionHandler: completionHandler)
    }
}
