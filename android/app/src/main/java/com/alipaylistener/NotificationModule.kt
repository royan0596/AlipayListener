package com.alipaylistener

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule
import android.content.Intent
import android.provider.Settings
import android.app.Activity

class NotificationModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    companion object {
        private var reactContext: ReactApplicationContext? = null
        var isListening: Boolean = false

        fun sendEvent(eventName: String, params: WritableMap) {
            reactContext?.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                ?.emit(eventName, params)
        }
    }

    init {
        Companion.reactContext = reactContext
    }

    override fun getName(): String {
        return "NotificationModule"
    }

    @ReactMethod
    fun startListening() {
        isListening = true
    }

    @ReactMethod
    fun stopListening() {
        isListening = false
    }

    @ReactMethod
    fun openNotificationSettings() {
        val intent = Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS)
        getCurrentActivity()?.startActivity(intent)
    }
    
    @ReactMethod
    fun addListener(eventName: String) {
        // Keep: Required for RN built-in EventEmitter Calls.
    }

    @ReactMethod
    fun removeListeners(count: Int) {
        // Keep: Required for RN built-in EventEmitter Calls.
    }
}
