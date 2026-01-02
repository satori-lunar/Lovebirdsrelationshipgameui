#import <Foundation/Foundation.h>
#import <Capacitor/Capacitor.h>

// Define the plugin using the CAP_PLUGIN Macro
CAP_PLUGIN(LovebirdsWidgetPlugin, "LovebirdsWidget",
    CAP_PLUGIN_METHOD(reloadWidgets, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(reloadWidget, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(saveToAppGroup, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(readFromAppGroup, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(getWidgetInfo, CAPPluginReturnPromise);
)
