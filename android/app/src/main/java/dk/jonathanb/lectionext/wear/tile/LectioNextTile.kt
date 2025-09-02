package dk.jonathanb.lectionext.wear.tile

import android.content.Context
import androidx.wear.protolayout.ColorBuilders
import androidx.wear.protolayout.ColorBuilders.argb
import androidx.wear.protolayout.DimensionBuilders
import androidx.wear.protolayout.LayoutElementBuilders
import androidx.wear.protolayout.ResourceBuilders
import androidx.wear.protolayout.TimelineBuilders
import androidx.wear.protolayout.material.Colors
import androidx.wear.protolayout.material.Text
import androidx.wear.protolayout.material.Typography
import androidx.wear.protolayout.material.layouts.PrimaryLayout
import androidx.wear.tiles.RequestBuilders
import androidx.wear.tiles.TileBuilders
import androidx.wear.tiles.tooling.preview.Preview
import androidx.wear.tiles.tooling.preview.TilePreviewData
import androidx.wear.tooling.preview.devices.WearDevices
import com.google.android.horologist.annotations.ExperimentalHorologistApi
import com.google.android.horologist.tiles.SuspendingTileService
import kotlin.math.max

private const val RESOURCES_VERSION = "0"

/**
 * Skeleton for a tile with no images.
 */
@OptIn(ExperimentalHorologistApi::class)
class LectioNextTile : SuspendingTileService() {

    override suspend fun resourcesRequest(
        requestParams: RequestBuilders.ResourcesRequest
    ) = resources(requestParams)

    override suspend fun tileRequest(
        requestParams: RequestBuilders.TileRequest
    ) = tile(requestParams, this)
}

private fun resources(
    requestParams: RequestBuilders.ResourcesRequest
): ResourceBuilders.Resources {
    return ResourceBuilders.Resources.Builder()
        .setVersion(RESOURCES_VERSION)
        .build()
}

private fun tile(
    requestParams: RequestBuilders.TileRequest,
    context: Context,
): TileBuilders.Tile {
    val now = System.currentTimeMillis()
    val end = ((now / 60_000L) + 1) * 60_000L // next minute boundary

    val timeline = TimelineBuilders.Timeline.Builder()

    // Use 5-second steps to keep timeline small and reliable
    val stepMs = 5_000L
    val steps = ((end - now) / stepMs).toInt().coerceAtLeast(1)

    for (i in 0..steps) {
        val t = now + i * stepMs
        val remaining = max(0L, end - t)
        val progress = remaining / 60_000f // 1.0 -> 0.0 over the minute
        val degrees = (360f * progress).coerceIn(0f, 359.9f)
        val label = formatRemaining(remaining)

        val entry = TimelineBuilders.TimelineEntry.Builder()
            .setLayout(
                LayoutElementBuilders.Layout.Builder()
                    .setRoot(tileLayout(requestParams, context, degrees, label))
                    .build()
            )
            .setValidity(
                TimelineBuilders.TimeInterval.Builder()
                    .setStartMillis(t)
                    .setEndMillis(t + stepMs)
                    .build()
            )
            .build()

        timeline.addTimelineEntry(entry)
    }

    return TileBuilders.Tile.Builder()
        .setResourcesVersion(RESOURCES_VERSION)
        // Ask the system to refresh roughly every minute so we rebuild the next timeline window.
        .setFreshnessIntervalMillis(60_000L)
        .setTileTimeline(timeline.build())
        .build()
}

private fun tileLayout(
    requestParams: RequestBuilders.TileRequest,
    context: Context,
    degrees: Float,
    label: String,
): LayoutElementBuilders.LayoutElement {
    return PrimaryLayout.Builder(requestParams.deviceConfiguration)
        .setResponsiveContentInsetEnabled(true)
        .setContent(
            LayoutElementBuilders.Box.Builder()
                .addContent(
                    LayoutElementBuilders.Arc.Builder()
                        // Start from 12 o'clock
                        .setAnchorAngle(DimensionBuilders.degrees(-90f))
                        // Background track
                        .addContent(
                            LayoutElementBuilders.ArcLine.Builder()
                                .setColor(argb(0xFFCCCCCC.toInt()))
                                .setThickness(DimensionBuilders.dp(8f))
                                .setLength(DimensionBuilders.degrees(359.9f))
                                .build()
                        )
                        // Foreground progress
                        .addContent(
                            LayoutElementBuilders.ArcLine.Builder()
                                .setColor(argb(0xFF6200EE.toInt()))
                                .setThickness(DimensionBuilders.dp(8f))
                                .setLength(DimensionBuilders.degrees(degrees))
                                .build()
                        )
                        .build()
                )
                .addContent(
                    Text.Builder(context, label)
                        .setColor(argb(Colors.DEFAULT.onSurface))
                        .setTypography(Typography.TYPOGRAPHY_CAPTION1)
                        .build()
                )
                .build()

        ).build()
}

private fun formatRemaining(ms: Long): String {
    val totalSeconds = (ms / 1000L).toInt()
    val minutes = totalSeconds / 60
    val seconds = totalSeconds % 60
    return "%d:%02d".format(minutes, seconds)
}

@Preview(device = WearDevices.SMALL_ROUND)
@Preview(device = WearDevices.LARGE_ROUND)
fun tilePreview(context: Context) = TilePreviewData(::resources) {
    // Preview with ~30s remaining example
    val fakeDegrees = 360f * 0.5f
    val fakeLabel = formatRemaining(30_000)
    // Reuse tile building path but with a single layout for preview simplicity
    TileBuilders.Tile.Builder()
        .setResourcesVersion(RESOURCES_VERSION)
        .setTileTimeline(
            TimelineBuilders.Timeline.Builder()
                .addTimelineEntry(
                    TimelineBuilders.TimelineEntry.Builder()
                        .setLayout(
                            LayoutElementBuilders.Layout.Builder()
                                .setRoot(tileLayout(it, context, fakeDegrees, fakeLabel))
                                .build()
                        )
                        .build()
                )
                .build()
        )
        .build()
}