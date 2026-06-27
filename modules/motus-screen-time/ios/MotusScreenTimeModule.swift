import ExpoModulesCore
import FamilyControls
import ManagedSettings
import SwiftUI

public class MotusScreenTimeModule: Module {
  private let store = ManagedSettingsStore()
  
  public func definition() -> ModuleDefinition {
    Name("MotusScreenTime")

    AsyncFunction("requestAuthorization") { (promise: Promise) in
      if #available(iOS 15.0, *) {
        Task {
          do {
            try await AuthorizationCenter.shared.requestAuthorization(for: .individual)
            promise.resolve(true)
          } catch {
            promise.reject("AUTHORIZATION_FAILED", "Failed to get Screen Time authorization: \(error.localizedDescription)")
          }
        }
      } else {
        promise.reject("UNSUPPORTED_IOS_VERSION", "Screen Time API requires iOS 15.0 or newer.")
      }
    }

    AsyncFunction("showPicker") { (promise: Promise) in
      if #available(iOS 15.0, *) {
        DispatchQueue.main.async {
          let rootVC = UIApplication.shared.windows.first?.rootViewController
          let pickerModel = PickerModel(promise: promise)
          let pickerView = ActivityPickerView(model: pickerModel)
          let hostingController = UIHostingController(rootView: pickerView)
          
          rootVC?.present(hostingController, animated: true)
        }
      } else {
        promise.reject("UNSUPPORTED_IOS_VERSION", "Screen Time API requires iOS 15.0 or newer.")
      }
    }

    Function("blockApps") { () in
      if #available(iOS 15.0, *) {
        let savedData = UserDefaults.standard.data(forKey: "MotusBlockedApps")
        if let data = savedData {
          do {
            let selection = try JSONDecoder().decode(FamilyActivitySelection.self, from: data)
            store.shield.applications = selection.applicationTokens
            store.shield.applicationCategories = .specific(selection.categoryTokens)
          } catch {
            print("Failed to decode saved selection.")
          }
        }
      }
    }

    Function("unblockApps") { () in
      if #available(iOS 15.0, *) {
        let store = ManagedSettingsStore()
        let sharedDefaults = UserDefaults(suiteName: "group.com.kayrabali.Motus")
        var didUnlockSpecific = false
        
        if let data = sharedDefaults?.data(forKey: "PendingUnlockApplicationToken"),
           let token = try? JSONDecoder().decode(ApplicationToken.self, from: data) {
            var currentApps = store.shield.applications ?? []
            currentApps.remove(token)
            store.shield.applications = currentApps.isEmpty ? nil : currentApps
            sharedDefaults?.removeObject(forKey: "PendingUnlockApplicationToken")
            didUnlockSpecific = true
        }
        
        if let data = sharedDefaults?.data(forKey: "PendingUnlockCategoryToken"),
           let token = try? JSONDecoder().decode(ActivityCategoryToken.self, from: data) {
            if case .specific(var categories, let except) = store.shield.applicationCategories {
                categories.remove(token)
                store.shield.applicationCategories = categories.isEmpty ? .none : .specific(categories, except: except)
            }
            sharedDefaults?.removeObject(forKey: "PendingUnlockCategoryToken")
            didUnlockSpecific = true
        }
        
        if !didUnlockSpecific {
            // Fallback if no specific token was found: we do not unblock all to prevent "unlock 1 unlocks all" bug.
            print("No pending unlock token found.")
        }
        sharedDefaults?.removeObject(forKey: "PendingUnlockApplicationName")
        
        // Clean up direct file if present
        if let containerURL = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: "group.com.kayrabali.Motus") {
            let fileURL = containerURL.appendingPathComponent("pending_app.txt")
            try? FileManager.default.removeItem(at: fileURL)
        }
      }
    }

    AsyncFunction("getPendingUnlockAppName") { (promise: Promise) in
      // Try direct file first
      if let containerURL = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: "group.com.kayrabali.Motus") {
          let fileURL = containerURL.appendingPathComponent("pending_app.txt")
          if let appName = try? String(contentsOf: fileURL, encoding: .utf8), !appName.isEmpty {
              promise.resolve(appName)
              return
          }
      }
      
      // Fallback to UserDefaults
      let sharedDefaults = UserDefaults(suiteName: "group.com.kayrabali.Motus")
      let appName = sharedDefaults?.string(forKey: "PendingUnlockApplicationName")
      promise.resolve(appName)
    }

    AsyncFunction("hasPendingUnlock") { (promise: Promise) in
      let sharedDefaults = UserDefaults(suiteName: "group.com.kayrabali.Motus")
      let hasApp = sharedDefaults?.data(forKey: "PendingUnlockApplicationToken") != nil
      let hasCategory = sharedDefaults?.data(forKey: "PendingUnlockCategoryToken") != nil
      promise.resolve(hasApp || hasCategory)
    }

    AsyncFunction("getActiveLockCount") { (promise: Promise) in
      if #available(iOS 15.0, *) {
        let savedData = UserDefaults.standard.data(forKey: "MotusBlockedApps")
        if let data = savedData {
          do {
            let selection = try JSONDecoder().decode(FamilyActivitySelection.self, from: data)
            promise.resolve(selection.applicationTokens.count + selection.categoryTokens.count)
          } catch {
            promise.resolve(0)
          }
        } else {
          promise.resolve(0)
        }
      } else {
        promise.resolve(0)
      }
    }

    AsyncFunction("showLockedApps") { (promise: Promise) in
      if #available(iOS 15.0, *) {
        DispatchQueue.main.async {
          let rootVC = UIApplication.shared.windows.first?.rootViewController
          let model = LockedAppsModel(promise: promise)
          let view = LockedAppsView(model: model)
          let hostingController = UIHostingController(rootView: view)
          
          rootVC?.present(hostingController, animated: true)
        }
      } else {
        promise.resolve()
      }
    }
  }
}

@available(iOS 15.0, *)
class PickerModel: ObservableObject {
  let promise: Promise
  @Published var selection = FamilyActivitySelection()
  
  init(promise: Promise) {
    self.promise = promise
    if let data = UserDefaults.standard.data(forKey: "MotusBlockedApps"),
       let savedSelection = try? JSONDecoder().decode(FamilyActivitySelection.self, from: data) {
      self.selection = savedSelection
    }
  }
  
  func saveSelection() {
    do {
      let data = try JSONEncoder().encode(selection)
      UserDefaults.standard.set(data, forKey: "MotusBlockedApps")
      
      // Immediately block
      let store = ManagedSettingsStore()
      store.shield.applications = selection.applicationTokens
      store.shield.applicationCategories = .specific(selection.categoryTokens)
      
      promise.resolve(true)
    } catch {
      promise.reject("SAVE_FAILED", "Failed to save selection.")
    }
  }
}

@available(iOS 15.0, *)
struct ActivityPickerView: View {
  @Environment(\.presentationMode) var presentationMode
  @ObservedObject var model: PickerModel

  var body: some View {
    NavigationView {
      FamilyActivityPicker(selection: $model.selection)
        .navigationTitle("Select Distracting Apps")
        .navigationBarItems(
          leading: Button("Cancel") {
            model.promise.resolve(false)
            presentationMode.wrappedValue.dismiss()
          },
          trailing: Button("Save & Lock") {
            model.saveSelection()
            presentationMode.wrappedValue.dismiss()
          }
        )
    }
  }
}

@available(iOS 15.0, *)
class LockedAppsModel: ObservableObject {
  let promise: Promise
  @Published var selection = FamilyActivitySelection()
  
  init(promise: Promise) {
    self.promise = promise
    if let data = UserDefaults.standard.data(forKey: "MotusBlockedApps"),
       let savedSelection = try? JSONDecoder().decode(FamilyActivitySelection.self, from: data) {
      self.selection = savedSelection
    }
  }
  
  func removeApp(token: ApplicationToken) {
    selection.applicationTokens.remove(token)
    saveSelection()
  }
  
  func removeCategory(token: ActivityCategoryToken) {
    selection.categoryTokens.remove(token)
    saveSelection()
  }
  
  func startSprint(appToken: ApplicationToken) {
    let store = ManagedSettingsStore()
    var currentApps = store.shield.applications ?? []
    currentApps.remove(appToken)
    store.shield.applications = currentApps.isEmpty ? nil : currentApps
    
    promise.resolve([
      "action": "sprint",
      "durationSeconds": 120
    ])
  }
  
  func startSprint(categoryToken: ActivityCategoryToken) {
    let store = ManagedSettingsStore()
    if case .specific(var categories, let except) = store.shield.applicationCategories {
        categories.remove(categoryToken)
        store.shield.applicationCategories = categories.isEmpty ? .none : .specific(categories, except: except)
    }
    
    promise.resolve([
      "action": "sprint",
      "durationSeconds": 120
    ])
  }
  
  private func saveSelection() {
    do {
      let data = try JSONEncoder().encode(selection)
      UserDefaults.standard.set(data, forKey: "MotusBlockedApps")
      
      let store = ManagedSettingsStore()
      store.shield.applications = selection.applicationTokens
      store.shield.applicationCategories = .specific(selection.categoryTokens)
    } catch {
      print("Failed to save selection after removing app.")
    }
  }
}

@available(iOS 15.0, *)
struct LockedAppsView: View {
  @Environment(\.presentationMode) var presentationMode
  @ObservedObject var model: LockedAppsModel
  @State private var itemToRemove: Any?
  @State private var showingDialog = false

  var body: some View {
    NavigationView {
      List {
        if model.selection.applicationTokens.isEmpty && model.selection.categoryTokens.isEmpty {
          Text("No apps locked.")
            .foregroundColor(.gray)
        } else {
          ForEach(Array(model.selection.applicationTokens), id: \.self) { token in
            HStack {
              Label(token)
              Spacer()
              Button(action: {
                itemToRemove = token
                showingDialog = true
              }) {
                Text("Disable")
                  .foregroundColor(.red)
              }
            }
          }
          
          ForEach(Array(model.selection.categoryTokens), id: \.self) { token in
            HStack {
              Label(token)
              Spacer()
              Button(action: {
                itemToRemove = token
                showingDialog = true
              }) {
                Text("Disable")
                  .foregroundColor(.red)
              }
            }
          }
        }
      }
      .navigationTitle("Locked Apps")
      .navigationBarItems(trailing: Button("Done") {
        model.promise.resolve(["action": "dismissed"])
        presentationMode.wrappedValue.dismiss()
      })
      .confirmationDialog("Emergency Options", isPresented: $showingDialog, titleVisibility: .visible) {
        Button("⚡ Emergency 2-Min Sprint") {
          if let appToken = itemToRemove as? ApplicationToken {
            model.startSprint(appToken: appToken)
          } else if let catToken = itemToRemove as? ActivityCategoryToken {
            model.startSprint(categoryToken: catToken)
          }
          presentationMode.wrappedValue.dismiss()
        }
        
        Button("🗑️ Disable Permanently", role: .destructive) {
          if let appToken = itemToRemove as? ApplicationToken {
            model.removeApp(token: appToken)
          } else if let catToken = itemToRemove as? ActivityCategoryToken {
            model.removeCategory(token: catToken)
          }
        }
        
        Button("Cancel", role: .cancel) {}
      } message: {
        Text("Select how you want to handle this lock. A 2-Minute Sprint will temporarily unlock the app immediately, then re-lock it after 2 minutes.")
      }
    }
  }
}
