package com.alipaylistener

import android.app.Notification
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.util.Log
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.modules.core.DeviceEventManagerModule

import android.widget.RemoteViews
import android.view.ViewGroup
import android.view.View
import android.widget.TextView
import android.content.Context
import android.view.LayoutInflater

class AlipayNotificationService : NotificationListenerService() {

    override fun onNotificationPosted(sbn: StatusBarNotification) {
        val packageName = sbn.packageName
        Log.d("AlipayListener", "收到通知: $packageName")

        if (!NotificationModule.isListening) {
            Log.d("AlipayListener", "监听开关未开启，忽略")
            return
        }

        // 恢复包名限制
        if ("com.eg.android.AlipayGphone" != packageName) {
            return
        }

        val extras = sbn.notification.extras
        val title = extras.getString(Notification.EXTRA_TITLE) ?: ""
        val text = extras.getString(Notification.EXTRA_TEXT) ?: ""
        val bigText = extras.getCharSequence(Notification.EXTRA_BIG_TEXT)?.toString() ?: ""
        val subText = extras.getCharSequence(Notification.EXTRA_SUB_TEXT)?.toString() ?: ""
        val ticker = sbn.notification.tickerText?.toString() ?: ""
        
        // 尝试解析金额
        // 格式通常为：你已成功收款1.00元
        // 正则匹配：收款(\d+\.\d+)元
        var amount = "0.00"
        try {
            val pattern = java.util.regex.Pattern.compile("收款(\\d+\\.\\d+)元")
            var matcher = pattern.matcher(title)
            if (matcher.find()) {
                amount = matcher.group(1) ?: "0.00"
            } else {
                // 如果标题里没有，尝试从 text 里找
                matcher = pattern.matcher(text)
                if (matcher.find()) {
                    amount = matcher.group(1) ?: "0.00"
                }
            }
        } catch (e: Exception) {
            Log.e("AlipayListener", "解析金额失败: ${e.message}")
        }
        
        Log.d("AlipayListener", "解析到的金额: $amount")

        // 智能过滤：防止重复上报和无效通知
        // 1. 如果金额有效，直接通过
        // 2. 如果金额为0，检查关键词 (防止漏单)
        // 3. 过滤掉 "支付宝通知" 这种无意义的标题，除非它包含金额
        val isValidAmount = amount != "0.00"
        val hasKeywords = title.contains("收款") || title.contains("转账") || text.contains("收款") || text.contains("转账")
        val isGenericTitle = title == "支付宝通知"

        if (!isValidAmount) {
            if (isGenericTitle || !hasKeywords) {
                Log.d("AlipayListener", "忽略无效或通用通知: Title=$title")
                return
            }
        }

        // 发送事件给 RN
        sendEvent(title, text, bigText, subText, ticker, amount)
    }

    private fun sendEvent(title: String, text: String, bigText: String, subText: String, ticker: String, amount: String) {
        // ...
        
        val params = Arguments.createMap().apply {
            putString("title", title)
            putString("text", text)
            putString("bigText", bigText)
            putString("subText", subText)
            putString("ticker", ticker)
            putString("amount", amount)
        }
        
        NotificationModule.sendEvent("onNotificationReceived", params)
    }
}
