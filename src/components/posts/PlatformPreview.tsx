'use client';

import React from 'react';
import {
  Heart,
  MessageCircle,
  Send,
  Bookmark,
  Share2,
  ThumbsUp,
  Repeat2,
  Image,
  MoreHorizontal,
  Globe,
  Music,
  ChevronUp,
} from 'lucide-react';

export interface PlatformPreviewProps {
  imageUrl: string | null;
  copy: string | null;
  cta: string | null;
  clientName: string;
  clientEmoji: string;
  platform: string;
  format: string | null;
}

/* ─── Shared helpers ─── */

function ProfileAvatar({ emoji, size = 32 }: { emoji: string; size?: number }) {
  return (
    <div
      className="rounded-full flex items-center justify-center flex-shrink-0"
      style={{
        width: size,
        height: size,
        background: 'linear-gradient(135deg, #FF8FAD 0%, #FFBA8A 100%)',
        fontSize: size * 0.5,
        lineHeight: 1,
      }}
    >
      {emoji}
    </div>
  );
}

function ImagePlaceholder({ className = '' }: { className?: string }) {
  return (
    <div className={`w-full h-full flex items-center justify-center bg-gray-100 ${className}`}>
      <Image className="w-10 h-10 text-gray-300" />
    </div>
  );
}

/* ─── Phone frame wrapper ─── */

function PhoneFrame({
  children,
  maxWidth = 320,
  className = '',
}: {
  children: React.ReactNode;
  maxWidth?: number;
  className?: string;
}) {
  return (
    <div
      className={`rounded-[2rem] border-[6px] border-gray-800 bg-white overflow-hidden shadow-xl mx-auto ${className}`}
      style={{ maxWidth }}
    >
      {children}
    </div>
  );
}

/* ═══════════════════════════════════════════
   Instagram Feed Preview
   ═══════════════════════════════════════════ */

export function InstagramFeedPreview({
  imageUrl,
  copy,
  clientName,
  clientEmoji,
}: PlatformPreviewProps) {
  return (
    <PhoneFrame maxWidth={320}>
      {/* Profile header */}
      <div className="flex items-center gap-2 px-3 py-2">
        <ProfileAvatar emoji={clientEmoji} size={28} />
        <span className="text-xs font-semibold text-gray-900 flex-1 truncate">{clientName}</span>
        <MoreHorizontal className="w-4 h-4 text-gray-500" />
      </div>

      {/* Image — 1:1 */}
      <div className="w-full aspect-square bg-gray-100 relative">
        {imageUrl ? (
          <img src={imageUrl} alt="Post" className="w-full h-full object-cover" />
        ) : (
          <ImagePlaceholder />
        )}
      </div>

      {/* Engagement row */}
      <div className="flex items-center px-3 py-2">
        <div className="flex items-center gap-3 flex-1">
          <Heart className="w-5 h-5 text-gray-800" />
          <MessageCircle className="w-5 h-5 text-gray-800" />
          <Send className="w-5 h-5 text-gray-800" />
        </div>
        <Bookmark className="w-5 h-5 text-gray-800" />
      </div>

      {/* Likes */}
      <p className="text-[11px] font-semibold text-gray-900 px-3">Gusta a 0 personas</p>

      {/* Copy */}
      {copy && (
        <p className="text-[11px] text-gray-700 px-3 pb-3 pt-1 leading-snug">
          <span className="font-semibold text-gray-900">{clientName.toLowerCase().replace(/\s/g, '')}</span>{' '}
          <span className="line-clamp-2">
            {copy}
          </span>
          {copy.length > 100 && (
            <span className="text-gray-400 text-[10px]"> ...mas</span>
          )}
        </p>
      )}
    </PhoneFrame>
  );
}

/* ═══════════════════════════════════════════
   Instagram Story Preview
   ═══════════════════════════════════════════ */

export function InstagramStoryPreview({
  imageUrl,
  copy,
  cta,
  clientName,
  clientEmoji,
}: PlatformPreviewProps) {
  return (
    <PhoneFrame maxWidth={260}>
      <div className="relative w-full" style={{ aspectRatio: '9/16' }}>
        {/* Full-bleed image */}
        {imageUrl ? (
          <img src={imageUrl} alt="Story" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-pink-200 to-orange-200 flex items-center justify-center">
            <Image className="w-10 h-10 text-white/60" />
          </div>
        )}

        {/* Top gradient */}
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/50 to-transparent" />

        {/* Top bar: avatar + name */}
        <div className="absolute top-3 left-3 right-3 flex items-center gap-2">
          <div className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-sm"
            style={{ background: 'linear-gradient(135deg, #FF8FAD, #FFBA8A)' }}>
            {clientEmoji}
          </div>
          <span className="text-[11px] font-semibold text-white drop-shadow flex-1 truncate">{clientName}</span>
          <MoreHorizontal className="w-4 h-4 text-white drop-shadow" />
        </div>

        {/* Bottom gradient */}
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/60 to-transparent" />

        {/* CTA button at bottom */}
        {cta && (
          <div className="absolute bottom-4 left-4 right-4 flex flex-col items-center gap-1">
            <ChevronUp className="w-4 h-4 text-white animate-bounce" />
            <div className="w-full py-2 rounded-full text-center text-[11px] font-semibold text-white bg-white/20 backdrop-blur-sm border border-white/30">
              {cta}
            </div>
          </div>
        )}

        {/* Copy overlay if no CTA */}
        {!cta && copy && (
          <div className="absolute bottom-4 left-4 right-4">
            <p className="text-[11px] text-white drop-shadow line-clamp-2 leading-snug">{copy}</p>
          </div>
        )}
      </div>
    </PhoneFrame>
  );
}

/* ═══════════════════════════════════════════
   Facebook Post Preview
   ═══════════════════════════════════════════ */

export function FacebookPostPreview({
  imageUrl,
  copy,
  clientName,
  clientEmoji,
}: PlatformPreviewProps) {
  return (
    <PhoneFrame maxWidth={340}>
      {/* Profile header */}
      <div className="flex items-center gap-2 px-3 py-2.5">
        <ProfileAvatar emoji={clientEmoji} size={36} />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-gray-900 truncate">{clientName}</p>
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-gray-500">Justo ahora</span>
            <span className="text-[10px] text-gray-400">-</span>
            <Globe className="w-2.5 h-2.5 text-gray-400" />
          </div>
        </div>
        <MoreHorizontal className="w-4 h-4 text-gray-500" />
      </div>

      {/* Copy above image */}
      {copy && (
        <p className="text-[12px] text-gray-800 px-3 pb-2 leading-relaxed line-clamp-3">{copy}</p>
      )}

      {/* Image — ~16:9 */}
      <div className="w-full bg-gray-100" style={{ aspectRatio: '16/9' }}>
        {imageUrl ? (
          <img src={imageUrl} alt="Post" className="w-full h-full object-cover" />
        ) : (
          <ImagePlaceholder />
        )}
      </div>

      {/* Reactions summary */}
      <div className="flex items-center gap-1 px-3 pt-2 pb-1">
        <div className="flex -space-x-1">
          <span className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center text-[8px] text-white">
            <ThumbsUp className="w-2.5 h-2.5" />
          </span>
          <span className="w-4 h-4 rounded-full bg-red-500 flex items-center justify-center text-[8px]">
            ❤️
          </span>
        </div>
        <span className="text-[10px] text-gray-500 ml-1">0</span>
      </div>

      {/* Divider */}
      <div className="border-t border-gray-200 mx-3" />

      {/* Action bar */}
      <div className="flex items-center justify-around px-3 py-2">
        <button className="flex items-center gap-1 text-gray-500">
          <ThumbsUp className="w-4 h-4" />
          <span className="text-[11px] font-medium">Me gusta</span>
        </button>
        <button className="flex items-center gap-1 text-gray-500">
          <MessageCircle className="w-4 h-4" />
          <span className="text-[11px] font-medium">Comentar</span>
        </button>
        <button className="flex items-center gap-1 text-gray-500">
          <Share2 className="w-4 h-4" />
          <span className="text-[11px] font-medium">Compartir</span>
        </button>
      </div>
    </PhoneFrame>
  );
}

/* ═══════════════════════════════════════════
   TikTok Post Preview
   ═══════════════════════════════════════════ */

export function TikTokPostPreview({
  imageUrl,
  copy,
  clientName,
  clientEmoji,
}: PlatformPreviewProps) {
  return (
    <PhoneFrame maxWidth={260}>
      <div className="relative w-full bg-black" style={{ aspectRatio: '9/16' }}>
        {/* Full-bleed image */}
        {imageUrl ? (
          <img src={imageUrl} alt="TikTok" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-gray-900 to-black flex items-center justify-center">
            <Image className="w-10 h-10 text-white/30" />
          </div>
        )}

        {/* Right sidebar */}
        <div className="absolute right-2 bottom-24 flex flex-col items-center gap-4">
          <div className="flex flex-col items-center gap-0.5">
            <div className="w-9 h-9 rounded-full border-2 border-white flex items-center justify-center text-sm"
              style={{ background: 'linear-gradient(135deg, #FF8FAD, #FFBA8A)' }}>
              {clientEmoji}
            </div>
            <div className="w-4 h-4 -mt-2 rounded-full bg-red-500 flex items-center justify-center text-white text-[8px] font-bold">
              +
            </div>
          </div>
          <div className="flex flex-col items-center gap-0.5">
            <Heart className="w-6 h-6 text-white drop-shadow" />
            <span className="text-[9px] text-white font-medium">0</span>
          </div>
          <div className="flex flex-col items-center gap-0.5">
            <MessageCircle className="w-6 h-6 text-white drop-shadow" />
            <span className="text-[9px] text-white font-medium">0</span>
          </div>
          <div className="flex flex-col items-center gap-0.5">
            <Bookmark className="w-6 h-6 text-white drop-shadow" />
            <span className="text-[9px] text-white font-medium">0</span>
          </div>
          <div className="flex flex-col items-center gap-0.5">
            <Share2 className="w-6 h-6 text-white drop-shadow" />
            <span className="text-[9px] text-white font-medium">0</span>
          </div>
        </div>

        {/* Bottom overlay */}
        <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/70 to-transparent">
          <p className="text-[11px] font-semibold text-white mb-0.5">
            @{clientName.toLowerCase().replace(/\s/g, '_')}
          </p>
          {copy && (
            <p className="text-[10px] text-white/90 leading-snug line-clamp-1 mb-1.5">{copy}</p>
          )}
          <div className="flex items-center gap-1.5">
            <Music className="w-3 h-3 text-white" />
            <div className="overflow-hidden flex-1">
              <p className="text-[9px] text-white/80 whitespace-nowrap animate-marquee">
                Sonido original - {clientName}
              </p>
            </div>
          </div>
        </div>
      </div>
    </PhoneFrame>
  );
}

/* ═══════════════════════════════════════════
   LinkedIn Post Preview
   ═══════════════════════════════════════════ */

export function LinkedInPostPreview({
  imageUrl,
  copy,
  clientName,
  clientEmoji,
}: PlatformPreviewProps) {
  return (
    <PhoneFrame maxWidth={340}>
      {/* Profile header */}
      <div className="flex items-center gap-2 px-3 py-2.5">
        <ProfileAvatar emoji={clientEmoji} size={40} />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-gray-900 truncate">{clientName}</p>
          <p className="text-[10px] text-gray-500 truncate">Publicacion</p>
          <p className="text-[10px] text-gray-400 flex items-center gap-1">
            Ahora <Globe className="w-2.5 h-2.5" />
          </p>
        </div>
        <MoreHorizontal className="w-4 h-4 text-gray-500" />
      </div>

      {/* Copy above image */}
      {copy && (
        <div className="px-3 pb-2">
          <p className="text-[12px] text-gray-800 leading-relaxed line-clamp-3">{copy}</p>
          {copy.length > 140 && (
            <span className="text-[11px] text-blue-600 font-medium cursor-pointer">...ver mas</span>
          )}
        </div>
      )}

      {/* Image — ~1.2:1 */}
      <div className="w-full bg-gray-100" style={{ aspectRatio: '1.2/1' }}>
        {imageUrl ? (
          <img src={imageUrl} alt="Post" className="w-full h-full object-cover" />
        ) : (
          <ImagePlaceholder />
        )}
      </div>

      {/* Reactions summary */}
      <div className="flex items-center gap-1 px-3 pt-2 pb-1">
        <div className="flex -space-x-0.5">
          <span className="w-4 h-4 rounded-full bg-blue-600 flex items-center justify-center text-[7px] text-white">
            <ThumbsUp className="w-2.5 h-2.5" />
          </span>
        </div>
        <span className="text-[10px] text-gray-500 ml-1">0 reacciones</span>
      </div>

      {/* Divider */}
      <div className="border-t border-gray-200 mx-3" />

      {/* Action bar */}
      <div className="flex items-center justify-around px-3 py-2">
        <button className="flex items-center gap-1 text-gray-600">
          <ThumbsUp className="w-4 h-4" />
          <span className="text-[10px] font-medium">Recomendar</span>
        </button>
        <button className="flex items-center gap-1 text-gray-600">
          <MessageCircle className="w-4 h-4" />
          <span className="text-[10px] font-medium">Comentar</span>
        </button>
        <button className="flex items-center gap-1 text-gray-600">
          <Repeat2 className="w-4 h-4" />
          <span className="text-[10px] font-medium">Difundir</span>
        </button>
        <button className="flex items-center gap-1 text-gray-600">
          <Send className="w-4 h-4" />
          <span className="text-[10px] font-medium">Enviar</span>
        </button>
      </div>
    </PhoneFrame>
  );
}

/* ═══════════════════════════════════════════
   Main selector component
   ═══════════════════════════════════════════ */

export function PlatformPreview(props: PlatformPreviewProps) {
  const { platform, format } = props;

  // IG Story detection
  if (
    platform === 'instagram' &&
    (format === 'story' || format === 'reel')
  ) {
    return <InstagramStoryPreview {...props} />;
  }

  switch (platform) {
    case 'instagram':
      return <InstagramFeedPreview {...props} />;
    case 'facebook':
      return <FacebookPostPreview {...props} />;
    case 'tiktok':
      return <TikTokPostPreview {...props} />;
    case 'linkedin':
      return <LinkedInPostPreview {...props} />;
    default:
      return <InstagramFeedPreview {...props} />;
  }
}

export default PlatformPreview;
