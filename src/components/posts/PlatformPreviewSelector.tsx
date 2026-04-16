'use client';

import React, { useState } from 'react';
import {
  InstagramFeedPreview,
  InstagramStoryPreview,
  FacebookPostPreview,
  TikTokPostPreview,
  LinkedInPostPreview,
} from './PlatformPreview';
import type { PlatformPreviewProps } from './PlatformPreview';

type PreviewTab = 'instagram' | 'ig_story' | 'facebook' | 'tiktok' | 'linkedin';

const TABS: { id: PreviewTab; label: string }[] = [
  { id: 'instagram', label: 'Instagram' },
  { id: 'ig_story', label: 'IG Story' },
  { id: 'facebook', label: 'Facebook' },
  { id: 'tiktok', label: 'TikTok' },
  { id: 'linkedin', label: 'LinkedIn' },
];

function resolveDefaultTab(platform: string, format: string | null): PreviewTab {
  if (platform === 'instagram' && (format === 'story' || format === 'reel')) {
    return 'ig_story';
  }
  const match = TABS.find((t) => t.id === platform);
  return match ? match.id : 'instagram';
}

interface PlatformPreviewSelectorProps {
  imageUrl: string | null;
  copy: string | null;
  cta: string | null;
  clientName: string;
  clientEmoji: string;
  platform: string;
  format: string | null;
}

export function PlatformPreviewSelector(props: PlatformPreviewSelectorProps) {
  const [activeTab, setActiveTab] = useState<PreviewTab>(() =>
    resolveDefaultTab(props.platform, props.format)
  );

  const previewProps: PlatformPreviewProps = {
    imageUrl: props.imageUrl,
    copy: props.copy,
    cta: props.cta,
    clientName: props.clientName,
    clientEmoji: props.clientEmoji,
    platform: activeTab === 'ig_story' ? 'instagram' : activeTab,
    format: activeTab === 'ig_story' ? 'story' : props.format,
  };

  const renderPreview = () => {
    switch (activeTab) {
      case 'instagram':
        return <InstagramFeedPreview {...previewProps} />;
      case 'ig_story':
        return <InstagramStoryPreview {...previewProps} />;
      case 'facebook':
        return <FacebookPostPreview {...previewProps} />;
      case 'tiktok':
        return <TikTokPostPreview {...previewProps} />;
      case 'linkedin':
        return <LinkedInPostPreview {...previewProps} />;
      default:
        return <InstagramFeedPreview {...previewProps} />;
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Tab bar */}
      <div className="flex gap-1 rounded-xl p-1" style={{ background: 'rgba(200,180,170,0.12)' }}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={{
              background: activeTab === tab.id ? 'white' : 'transparent',
              color: activeTab === tab.id ? '#0F172A' : '#64748B',
              boxShadow: activeTab === tab.id ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Preview */}
      <div className="flex items-center justify-center w-full">
        {renderPreview()}
      </div>
    </div>
  );
}

export default PlatformPreviewSelector;
