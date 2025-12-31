package com.lovebirds.app.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.widget.RemoteViews
import com.lovebirds.app.MainActivity
import com.lovebirds.app.R
import org.json.JSONObject
import java.net.URL
import java.util.Calendar
import kotlinx.coroutines.*

/**
 * Lovebirds Memory Widget Provider
 *
 * Displays rotating memories from the user's saved photos.
 * Data is synced from the Capacitor app via SharedPreferences.
 */
class LovebirdsWidgetProvider : AppWidgetProvider() {

    companion object {
        private const val PREFS_NAME = "CapacitorStorage"
        private const val DATA_KEY = "lovebirds_widget_data"
    }

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        for (appWidgetId in appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId)
        }
    }

    override fun onEnabled(context: Context) {
        // Widget first created
    }

    override fun onDisabled(context: Context) {
        // Last widget removed
    }

    private fun updateAppWidget(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetId: Int
    ) {
        val views = RemoteViews(context.packageName, R.layout.widget_lovebirds_memory)

        // Load widget data from SharedPreferences
        val memory = loadCurrentMemory(context)

        if (memory != null) {
            views.setTextViewText(R.id.widget_title, memory.title)
            views.setTextViewText(R.id.widget_date, memory.date)

            if (!memory.note.isNullOrEmpty()) {
                views.setTextViewText(R.id.widget_note, "\"${memory.note}\"")
            } else {
                views.setTextViewText(R.id.widget_note, "")
            }

            // Load image asynchronously
            CoroutineScope(Dispatchers.IO).launch {
                try {
                    val bitmap = loadImageFromUrl(memory.photoUrl)
                    if (bitmap != null) {
                        views.setImageViewBitmap(R.id.widget_image, bitmap)
                        appWidgetManager.updateAppWidget(appWidgetId, views)
                    }
                } catch (e: Exception) {
                    e.printStackTrace()
                }
            }
        } else {
            // Empty state
            views.setTextViewText(R.id.widget_title, "Add memories in app")
            views.setTextViewText(R.id.widget_date, "")
            views.setTextViewText(R.id.widget_note, "")
        }

        // Set click intent to open app
        val intent = Intent(context, MainActivity::class.java)
        val pendingIntent = PendingIntent.getActivity(
            context,
            0,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        views.setOnClickPendingIntent(R.id.widget_container, pendingIntent)

        appWidgetManager.updateAppWidget(appWidgetId, views)
    }

    private fun loadCurrentMemory(context: Context): MemoryData? {
        try {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val jsonString = prefs.getString(DATA_KEY, null) ?: return null

            val bundle = JSONObject(jsonString)
            val memories = bundle.getJSONArray("memories")

            if (memories.length() == 0) return null

            // Rotate based on day of year
            val dayOfYear = Calendar.getInstance().get(Calendar.DAY_OF_YEAR)
            val index = (dayOfYear - 1) % memories.length()

            val memory = memories.getJSONObject(index)
            return MemoryData(
                id = memory.getString("id"),
                photoUrl = memory.getString("photoUrl"),
                title = memory.getString("title"),
                note = memory.optString("note", null),
                date = memory.getString("date")
            )
        } catch (e: Exception) {
            e.printStackTrace()
            return null
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

    data class MemoryData(
        val id: String,
        val photoUrl: String,
        val title: String,
        val note: String?,
        val date: String
    )
}
