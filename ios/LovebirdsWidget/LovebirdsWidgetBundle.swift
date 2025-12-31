import WidgetKit
import SwiftUI

@main
struct LovebirdsWidgetBundle: WidgetBundle {
    var body: some Widget {
        // Home screen widget (all iOS versions)
        LovebirdsMemoryWidget()

        // Lock screen widget (iOS 16+)
        if #available(iOSApplicationExtension 16.0, *) {
            LovebirdsLockScreenWidget()
        }
    }
}
