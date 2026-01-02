import Foundation
import Capacitor
import WidgetKit
import UserNotifications

/**
 * Capacitor plugin for Lovebirds widget integration
 *
 * Provides methods to:
 * - Refresh widget timelines
 * - Share data between app and widget via App Groups
 * - Handle background updates
 */
@objc(LovebirdsWidgetPlugin)
public class LovebirdsWidgetPlugin: CAPPlugin {

    private let appGroupId = "group.com.lovebirds.app"

    /**
     * Reload all widget timelines
     * Call this when widget data changes
     */
    @objc func reloadWidgets(_ call: CAPPluginCall) {
        if #available(iOS 14.0, *) {
            WidgetCenter.shared.reloadAllTimelines()
            call.resolve([
                "success": true,
                "message": "Widget timelines reloaded"
            ])
        } else {
            call.reject("Widgets require iOS 14 or later")
        }
    }

    /**
     * Reload a specific widget kind
     */
    @objc func reloadWidget(_ call: CAPPluginCall) {
        guard let kind = call.getString("kind") else {
            call.reject("Missing widget kind parameter")
            return
        }

        if #available(iOS 14.0, *) {
            WidgetCenter.shared.reloadTimelines(ofKind: kind)
            call.resolve([
                "success": true,
                "message": "Widget '\(kind)' timeline reloaded"
            ])
        } else {
            call.reject("Widgets require iOS 14 or later")
        }
    }

    /**
     * Save data to App Group UserDefaults
     * This allows sharing data between the app and widget
     */
    @objc func saveToAppGroup(_ call: CAPPluginCall) {
        guard let key = call.getString("key"),
              let value = call.getString("value") else {
            call.reject("Missing key or value parameter")
            return
        }

        guard let userDefaults = UserDefaults(suiteName: appGroupId) else {
            call.reject("Failed to access App Group storage")
            return
        }

        userDefaults.set(value, forKey: key)
        userDefaults.synchronize()

        call.resolve([
            "success": true,
            "key": key
        ])
    }

    /**
     * Read data from App Group UserDefaults
     */
    @objc func readFromAppGroup(_ call: CAPPluginCall) {
        guard let key = call.getString("key") else {
            call.reject("Missing key parameter")
            return
        }

        guard let userDefaults = UserDefaults(suiteName: appGroupId) else {
            call.reject("Failed to access App Group storage")
            return
        }

        if let value = userDefaults.string(forKey: key) {
            call.resolve([
                "success": true,
                "key": key,
                "value": value
            ])
        } else {
            call.resolve([
                "success": true,
                "key": key,
                "value": NSNull()
            ])
        }
    }

    /**
     * Get current widget info
     */
    @objc func getWidgetInfo(_ call: CAPPluginCall) {
        var info: [String: Any] = [
            "appGroupId": appGroupId,
            "isWidgetAvailable": false,
            "widgetKinds": [
                "LovebirdsMemoryWidget"
            ]
        ]

        if #available(iOS 14.0, *) {
            info["isWidgetAvailable"] = true

            if #available(iOS 16.0, *) {
                info["lockScreenWidgetAvailable"] = true
                info["widgetKinds"] = [
                    "LovebirdsMemoryWidget",
                    "LovebirdsLockScreenWidget"
                ]
            }
        }

        call.resolve(info)
    }
}
