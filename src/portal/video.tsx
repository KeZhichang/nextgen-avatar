import {
  MediaPlayer,
  MediaPlayerControls,
  MediaPlayerError,
  MediaPlayerFullscreen,
  MediaPlayerLoading,
  MediaPlayerPlay,
  MediaPlayerSeek,
  MediaPlayerTime,
  MediaPlayerVideo,
  MediaPlayerVolume,
} from "@/components/ui/media-player"
import { usePortal } from "./demo"

export function PortalVideo({
  src,
  label,
  poster,
}: {
  src?: string
  label: string
  poster?: string
}) {
  const { t } = usePortal()

  return (
    <MediaPlayer
      label={label}
      className="aspect-video overflow-hidden rounded-lg bg-brand-navy text-white"
    >
      <MediaPlayerVideo
        src={src}
        poster={poster}
        preload="metadata"
        playsInline
        className="size-full object-contain"
      />
      <MediaPlayerLoading />
      <MediaPlayerError label={t("无法播放此视频", "Can't play this video")} />
      <MediaPlayerControls className="absolute inset-x-0 bottom-0 flex flex-col items-stretch gap-1 bg-gradient-to-t from-black/90 to-transparent p-2 pt-6 text-white">
        <MediaPlayerSeek />
        <div className="flex min-w-0 items-center gap-1">
          <MediaPlayerPlay aria-label={t("播放或暂停", "Play or pause")} />
          <MediaPlayerVolume />
          <MediaPlayerTime className="shrink-0 text-xs" />
          <div className="flex-1" />
          <MediaPlayerFullscreen
            aria-label={t("切换全屏", "Toggle fullscreen")}
          />
        </div>
      </MediaPlayerControls>
    </MediaPlayer>
  )
}
