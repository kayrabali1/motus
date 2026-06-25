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
        store.shield.applications = []
        store.shield.applicationCategories = ShieldSettings.ActivityCategoryPolicy.none
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
