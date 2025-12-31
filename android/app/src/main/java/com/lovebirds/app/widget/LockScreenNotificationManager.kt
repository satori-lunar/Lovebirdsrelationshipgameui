package com.lovebirds.app.widget

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import com.lovebirds.app.MainActivity
import com.lovebirds.app.R
import org.json.JSONObject
import java.net.URL
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone
import kotlinx.coroutines.*

/**
 * Lock Screen Notification Manager for Widget Gifts
 *
 * Creates a persistent notification that displays on the lock screen
 * when a partner sends a gift. The notification stays visible until
 * dismissed or the gift expires.
 */
class LockScreenNotificationManager(private val context: Context) {

    companion object {
        const val CHANNEL_ID = "lovebirds_gift_channel"
        const val NOTIFICATION_ID = 1001
        const val PREFS_NAME = "CapacitorStorage"
        const val GIFT_KEY = "lovebirds_widget_gift"
        const val DATA_KEY = "lovebirds_widget_data"

        // Action for dismissing the notification
        const val ACTION_DISMISS = "com.lovebirds.app.DISMISS_GIFT_NOTIFICATION"
    }

    init {
        createNotificationChannel()
    }

    /**
     * Create notification channel for lock screen gifts (Android 8+)
     */
    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val name = "Partner Gifts"
            val descriptionText = "Notifications when your partner sends love to your screen"
            val importance = NotificationManager.IMPORTANCE_HIGH

            val channel = NotificationChannel(CHANNEL_ID, name, importance).apply {
                description = descriptionText
                lockscreenVisibility = NotificationCompat.VISIBILITY_PUBLIC
                setShowBadge(true)
            }

            val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.createNotificationChannel(channel)
        }
    }

    /**
     * Check for active gift and show/update lock screen notification
     */
    fun checkAndShowNotification() {
        CoroutineScope(Dispatchers.IO).launch {
            val gift = loadActiveGift()

            withContext(Dispatchers.Main) {
                if (gift != null) {
                    showGiftNotification(gift)
                } else {
                    dismissNotification()
                }
            }
        }
    }

    /**
     * Show persistent notification with gift content
     */
    private fun showGiftNotification(gift: GiftData) {
        CoroutineScope(Dispatchers.IO).launch {
            // Load image if available
            val bitmap: Bitmap? = gift.photoUrl?.let { loadImageFromUrl(it) }

            withContext(Dispatchers.Main) {
                val intent = Intent(context, MainActivity::class.java).apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
                }
                val pendingIntent = PendingIntent.getActivity(
                    context,
                    0,
                    intent,
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )

                // Dismiss action
                val dismissIntent = Intent(context, GiftNotificationReceiver::class.java).apply {
                    action = ACTION_DISMISS
                }
                val dismissPendingIntent = PendingIntent.getBroadcast(
                    context,
                    0,
                    dismissIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )

                val builder = NotificationCompat.Builder(context, CHANNEL_ID)
                    .setSmallIcon(R.drawable.ic_launcher_foreground) // Use app icon
                    .setContentTitle("From ${gift.senderName}")
                    .setContentText(gift.message ?: "Sent you love!")
                    .setPriority(NotificationCompat.PRIORITY_HIGH)
                    .setCategory(NotificationCompat.CATEGORY_MESSAGE)
                    .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                    .setOngoing(true) // Persistent - stays on lock screen
                    .setAutoCancel(false)
                    .setContentIntent(pendingIntent)
                    .addAction(
                        android.R.drawable.ic_menu_close_clear_cancel,
                        "Dismiss",
                        dismissPendingIntent
                    )

                // Add big picture style if we have an image
                if (bitmap != null) {
                    builder.setStyle(
                        NotificationCompat.BigPictureStyle()
                            .bigPicture(bitmap)
                            .bigLargeIcon(null as Bitmap?) // Hide large icon when expanded
                            .setSummaryText(gift.message ?: "")
                    )
                    builder.setLargeIcon(bitmap)
                } else {
                    // Text-only style
                    builder.setStyle(
                        NotificationCompat.BigTextStyle()
                            .bigText(gift.message ?: "Your partner sent you love!")
                            .setSummaryText("From ${gift.senderName}")
                    )
                }

                try {
                    NotificationManagerCompat.from(context).notify(NOTIFICATION_ID, builder.build())
                } catch (e: SecurityException) {
                    // Notification permission not granted
                    e.printStackTrace()
                }
            }
        }
    }

    /**
     * Dismiss the lock screen notification
     */
    fun dismissNotification() {
        NotificationManagerCompat.from(context).cancel(NOTIFICATION_ID)
    }

    /**
     * Load active gift from SharedPreferences
     */
    private fun loadActiveGift(): GiftData? {
        try {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

            // Check gift storage first
            val giftJsonString = prefs.getString(GIFT_KEY, null)
            if (giftJsonString != null) {
                val giftStorage = JSONObject(giftJsonString)
                if (giftStorage.has("activeGift") && !giftStorage.isNull("activeGift")) {
                    val gift = giftStorage.getJSONObject("activeGift")
                    val giftData = parseGift(gift)
                    if (giftData != null && !isExpired(giftData.expiresAt)) {
                        return giftData
                    }
                }
            }

            // Also check main bundle
            val dataJsonString = prefs.getString(DATA_KEY, null) ?: return null
            val bundle = JSONObject(dataJsonString)

            if (bundle.has("activeGift") && !bundle.isNull("activeGift")) {
                val gift = bundle.getJSONObject("activeGift")
                val giftData = parseGift(gift)
                if (giftData != null && !isExpired(giftData.expiresAt)) {
                    return giftData
                }
            }

            return null
        } catch (e: Exception) {
            e.printStackTrace()
            return null
        }
    }

    private fun parseGift(gift: JSONObject): GiftData? {
        return try {
            GiftData(
                id = gift.getString("id"),
                senderName = gift.optString("senderName", "Your Partner"),
                photoUrl = gift.optString("photoUrl", null),
                message = gift.optString("message", null),
                expiresAt = gift.getString("expiresAt")
            )
        } catch (e: Exception) {
            null
        }
    }

    private fun isExpired(expiresAtString: String): Boolean {
        return try {
            val format = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)
            format.timeZone = TimeZone.getTimeZone("UTC")
            val expiresAt = format.parse(expiresAtString)
            expiresAt?.before(Date()) ?: true
        } catch (e: Exception) {
            try {
                val format = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US)
                format.timeZone = TimeZone.getTimeZone("UTC")
                val expiresAt = format.parse(expiresAtString)
                expiresAt?.before(Date()) ?: true
            } catch (e2: Exception) {
                true
            }
        }
    }

    private fun loadImageFromUrl(urlString: String): Bitmap? {
        return try {
            val url = URL(urlString)
            val connection = url.openConnection()
            connection.doInput = true
            connection.connect()
            val input = connection.getInputStream()
            BitmapFactory.decodeStream(input)
        } catch (e: Exception) {
            e.printStackTrace()
            null
        }
    }

    data class GiftData(
        val id: String,
        val senderName: String,
        val photoUrl: String?,
        val message: String?,
        val expiresAt: String
    )
}

/**
 * Broadcast receiver to handle notification dismiss action
 */
class GiftNotificationReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == LockScreenNotificationManager.ACTION_DISMISS) {
            val manager = LockScreenNotificationManager(context)
            manager.dismissNotification()

            // Also mark gift as dismissed in storage
            // This would typically call back to the service
        }
    }
}
