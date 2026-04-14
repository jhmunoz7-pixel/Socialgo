'use client';

import { useState, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useClient, usePackages, useMembers, updatePost, createPost, useCurrentUser } from '@/lib/hooks';
import { Post, POST_TYPE_CONFIG, PostType, calculateMonthlyPayment } from '@/types';
import { PostModal } from '@/components/posts/PostModal';
import { EditClientModal } from '@/components/clients/EditClientModal';
import BrandKitPanel from '@/components/clients/BrandKitPanel';
import FeedPreview from '@/components/clients/FeedPreview';
import InstagramPanel from '@/components/clients/InstagramPanel';

/**
 * Client Detail Page
 * Shows detail view for a single agency client with content grid (parrilla)
 */
export default function ClientDetailPage() {
  const router = useRouter();
  const params = useParams();
  const clientId = params.id as string;

  const { data: clientData, loading, refetch } = useClient(clientId);
  const currentUser = useCurrentUser();
  const { data: packages } = usePackages();
  const { data: members } = useMembers();

  // State for month navigation, post selection, active tab, and edit modal
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [createPostOpen, setCreatePostOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'parrilla' | 'feed' | 'instagram' | 'brandkit'>('parrilla');
  const [editClientOpen, setEditClientOpen] = useState(false);

  // Filter posts by selected month
  const filteredPosts = useMemo(() => {
    if (!clientData?.posts) return [];

    return clientData.posts.filter((post) => {
      if (!post.scheduled_date) return false;
      const postDate = new Date(post.scheduled_date);
      return (
        postDate.getMonth() === selectedMonth.getMonth() &&
        postDate.getFullYear() === selectedMonth.getFullYear()
      );
    });
  }, [clientData?.posts, selectedMonth]);

  // Handle month navigation
  const handlePreviousMonth = () => {
    setSelectedMonth(
      new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1)
    );
  };

  const handleNextMonth = () => {
    setSelectedMonth(
      new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1)
    );
  };

  const formatMonthYear = (date: Date): string => {
    return date.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });
  };

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const payStatusBadge = (status: string) => {
    const badgeMap: Record<string, { bg: string; text: string }> = {
      pagado: { bg: '#B8E8C8', text: '#2D6B47' },
      pendiente: { bg: '#FFE5B0', text: '#8A5A00' },
      vencido: { bg: '#FFD0D8', text: '#8A1F35' },
    };
    return badgeMap[status] || { bg: '#F5EDE4', text: '#7A6560' };
  };

  const accountStatusBadge = (status: string) => {
    const badgeMap: Record<string, { bg: string; text: string }> = {
      activo: { bg: '#B8E8C8', text: '#2D6B47' },
      onboarding: { bg: '#FFE5B0', text: '#8A5A00' },
      pausado: { bg: '#F5EDE4', text: '#7A6560' },
    };
    return badgeMap[status] || { bg: '#F5EDE4', text: '#7A6560' };
  };

  const getAccountStatusLabel = (status: string): string => {
    const labels: Record<string, string> = {
      activo: 'Activo',
      onboarding: 'Onboarding',
      pausado: 'Pausado',
    };
    return labels[status] || status;
  };

  const getPayStatusLabel = (status: string): string => {
    const labels: Record<string, string> = {
      pagado: 'Pagado',
      pendiente: 'Pendiente',
      vencido: 'Vencido',
    };
    return labels[status] || status;
  };

  // formatDate and formatPostDate available in PostCard component below

  // Loading skeleton
  if (loading) {
    return (
      <div className="min-h-screen bg-sg-bg p-8">
        <div className="max-w-7xl mx-auto">
          {/* Back button skeleton */}
          <div className="h-5 bg-gray-200 rounded w-40 mb-8 animate-pulse" />

          {/* Header skeleton */}
          <div className="flex justify-between items-start mb-8">
            <div className="flex items-center gap-4">
              <div className="w-[60px] h-[60px] bg-gray-200 rounded-2xl animate-pulse" />
              <div>
                <div className="h-8 bg-gray-200 rounded w-48 mb-3 animate-pulse" />
                <div className="h-4 bg-gray-200 rounded w-64 animate-pulse" />
              </div>
            </div>
            <div className="flex gap-3">
              <div className="h-10 bg-gray-200 rounded-full w-24 animate-pulse" />
              <div className="h-10 bg-gray-200 rounded-full w-32 animate-pulse" />
            </div>
          </div>

          {/* Cards skeleton */}
          <div className="grid grid-cols-3 gap-6 mb-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="glass-card p-6 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-3" />
                <div className="h-6 bg-gray-200 rounded w-2/3" />
              </div>
            ))}
          </div>

          {/* Grid skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="glass-card animate-pulse">
                <div className="aspect-square bg-gray-200 rounded-t-lg" />
                <div className="p-4">
                  <div className="h-4 bg-gray-200 rounded w-2/3 mb-3" />
                  <div className="h-3 bg-gray-200 rounded w-full mb-2" />
                  <div className="h-3 bg-gray-200 rounded w-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Not found state
  if (!clientData) {
    return (
      <div className="min-h-screen bg-sg-bg p-8">
        <div className="max-w-7xl mx-auto">
          <button
            onClick={() => router.push('/dashboard')}
            className="mb-8 text-sg-text-mid hover:text-sg-text transition-colors"
          >
            ← Volver a clientes
          </button>

          <div className="glass-card p-12 text-center">
            <div className="mb-4 text-5xl">🔍</div>
            <h2 className="text-heading-md text-sg-text font-semibold mb-2">
              Cliente no encontrado
            </h2>
            <p className="text-body-md text-sg-text-mid">
              El cliente que buscas no existe o no tienes permisos para verlo.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const client = clientData;
  const payStatusColors = payStatusBadge(client.pay_status);
  const accountStatusColors = accountStatusBadge(client.account_status);
  const serviceCount = client.package?.features?.length ?? 0;

  return (
    <div className="min-h-screen bg-sg-bg p-8">
      <div className="max-w-7xl mx-auto">
        {/* Back Button */}
        <button
          onClick={() => router.push('/dashboard')}
          className="mb-8 text-sg-text-mid hover:text-sg-text transition-colors flex items-center gap-1 font-medium"
        >
          ← Volver a clientes
        </button>

        {/* Detail Header */}
        <div className="flex justify-between items-start mb-8">
          {/* Left: Logo, Name, and Meta Badges */}
          <div className="flex items-start gap-6">
            {/* Logo */}
            <div
              className="w-[60px] h-[60px] rounded-2xl flex items-center justify-center text-4xl flex-shrink-0 shadow-lg"
              style={{ backgroundColor: client.color }}
            >
              {client.emoji}
            </div>

            {/* Info */}
            <div>
              {/* Client Name */}
              <h1
                className="font-fraunces text-[28px] font-bold text-sg-text mb-3"
                style={{ fontFamily: '"Fraunces", serif' }}
              >
                {client.name}
              </h1>

              {/* Meta Badges */}
              <div className="flex flex-wrap gap-2">
                {/* Account Status Badge */}
                <span
                  className="text-body-xs font-semibold px-3 py-1 rounded-full"
                  style={{
                    backgroundColor: accountStatusColors.bg,
                    color: accountStatusColors.text,
                  }}
                >
                  {getAccountStatusLabel(client.account_status)}
                </span>

                {/* Instagram Handle */}
                {client.instagram && (
                  <span className="text-body-xs font-semibold px-3 py-1 rounded-full bg-gradient-to-r from-[#F58529] to-[#DD2A7B] text-white">
                    @{client.instagram}
                  </span>
                )}

                {/* Account Manager */}
                {client.manager && (
                  <span className="text-body-xs font-semibold px-3 py-1 rounded-full bg-lavender text-[#5B3D8A] flex items-center gap-1">
                    {client.manager.avatar_url && (
                      <img
                        src={client.manager.avatar_url}
                        alt={client.manager.full_name || 'Manager'}
                        className="w-4 h-4 rounded-full"
                      />
                    )}
                    AM: {client.manager.full_name || 'Sin asignar'}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right: Action Buttons */}
          <div className="flex gap-3">
            {/* Edit Button */}
            <button onClick={() => setEditClientOpen(true)} className="btn btn-ghost">Editar</button>

            {/* Add Post Button */}
            <button onClick={() => setCreatePostOpen(true)} className="btn btn-primary">+ Agregar post</button>
          </div>
        </div>

        {/* Detail Cards Row (3 columns) */}
        <div className="grid grid-cols-3 gap-6 mb-8">
          {/* Active Package */}
          <div className="glass-card p-6">
            <p className="text-body-xs text-sg-text-mid font-semibold uppercase tracking-wide mb-2">
              Paquete activo
            </p>
            <p className="text-heading-sm text-sg-text font-bold mb-1">
              {client.package?.name || 'No asignado'}
            </p>
            <p className="text-body-sm text-sg-text-light">
              {serviceCount} servicios incluidos
            </p>
          </div>

          {/* Monthly Fee (MRR) */}
          <div className="glass-card p-6">
            <p className="text-body-xs text-sg-text-mid font-semibold uppercase tracking-wide mb-2">
              Mensualidad
            </p>
            <p className="text-heading-sm text-sg-text font-bold mb-1">
              {formatCurrency(calculateMonthlyPayment(client.package || null, client.package_type, client.custom_price))}
            </p>
            <div>
              <span
                className="text-body-xs font-semibold px-2 py-1 rounded-full inline-block"
                style={{
                  backgroundColor: payStatusColors.bg,
                  color: payStatusColors.text,
                }}
              >
                {getPayStatusLabel(client.pay_status)}
              </span>
            </div>
          </div>

          {/* Posts This Month */}
          <div className="glass-card p-6">
            <p className="text-body-xs text-sg-text-mid font-semibold uppercase tracking-wide mb-2">
              Posts este mes
            </p>
            <p className="text-heading-sm text-sg-text font-bold mb-1">
              {filteredPosts.length}
            </p>
            <p className="text-body-sm text-sg-text-light">
              Planeados · {selectedMonth.toLocaleDateString('es-MX', { month: 'long' })}
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex gap-1 mb-6 p-1 rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--glass-border)' }}>
          <button
            onClick={() => setActiveTab('parrilla')}
            className="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all"
            style={activeTab === 'parrilla' ? { background: 'var(--gradient)', color: 'white' } : { color: 'var(--text-mid)' }}
          >
            📋 Parrilla
          </button>
          <button
            onClick={() => setActiveTab('feed')}
            className="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all"
            style={activeTab === 'feed' ? { background: 'var(--gradient)', color: 'white' } : { color: 'var(--text-mid)' }}
          >
            📱 Feed Preview
          </button>
          <button
            onClick={() => setActiveTab('instagram')}
            className="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all"
            style={activeTab === 'instagram' ? { background: 'var(--gradient)', color: 'white' } : { color: 'var(--text-mid)' }}
          >
            📸 Instagram
          </button>
          <button
            onClick={() => setActiveTab('brandkit')}
            className="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all"
            style={activeTab === 'brandkit' ? { background: 'var(--gradient)', color: 'white' } : { color: 'var(--text-mid)' }}
          >
            🎨 Brand Kit
          </button>
        </div>

        {/* Feed Preview Tab */}
        {activeTab === 'feed' && (
          <FeedPreview clientId={clientId} posts={clientData?.posts || []} />
        )}

        {/* Instagram Tab */}
        {activeTab === 'instagram' && (
          <InstagramPanel client={client} onRefresh={refetch} />
        )}

        {/* Brand Kit Tab */}
        {activeTab === 'brandkit' && (
          <BrandKitPanel clientId={clientId} orgId={currentUser.data?.member?.org_id || ''} />
        )}

        {/* Parrilla Tab */}
        {activeTab === 'parrilla' && (<>
        {/* Section Title with Month Picker */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="font-display text-display-sm text-sg-text font-bold">
            Parrilla de contenido
          </h2>

          {/* Month Picker */}
          <div className="flex items-center gap-4">
            <button
              onClick={handlePreviousMonth}
              className="text-2xl text-sg-text-mid hover:text-sg-text transition-colors"
            >
              ‹
            </button>
            <span className="text-body-md font-semibold text-sg-text min-w-[180px] text-center">
              {formatMonthYear(selectedMonth)}
            </span>
            <button
              onClick={handleNextMonth}
              className="text-2xl text-sg-text-mid hover:text-sg-text transition-colors"
            >
              ›
            </button>
          </div>
        </div>

        {/* Content Grid */}
        {filteredPosts.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <div className="mb-4 text-5xl">📅</div>
            <h3 className="text-heading-md text-sg-text font-semibold mb-2">
              No hay posts en este mes
            </h3>
            <p className="text-body-md text-sg-text-mid">
              Comienza a planificar contenido para {formatMonthYear(selectedMonth)}
            </p>
          </div>
        ) : (
          <div
            className="grid gap-6"
            style={{
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            }}
          >
            {filteredPosts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                onClick={() => setSelectedPostId(post.id)}
              />
            ))}
          </div>
        )}
        </>)}
      </div>

      {/* Post Modal */}
      <PostModal
        post={selectedPostId ? (filteredPosts.find(p => p.id === selectedPostId) ?? null) : null}
        client={client}
        isOpen={!!selectedPostId}
        onClose={() => setSelectedPostId(null)}
        onSave={async (postId, data) => {
          await updatePost(postId, data);
          refetch();
          setSelectedPostId(null);
        }}
      />

      {/* Create Post Modal */}
      <PostModal
        post={null}
        client={client}
        isOpen={createPostOpen}
        onClose={() => setCreatePostOpen(false)}
        onSave={async (_postId, data) => {
          await createPost({
            ...data,
            client_id: clientId,
          } as any);
          refetch();
          setCreatePostOpen(false);
        }}
        mode="create"
      />

      {/* Edit Client Modal */}
      <EditClientModal
        isOpen={editClientOpen}
        onClose={() => setEditClientOpen(false)}
        onUpdated={() => refetch()}
        client={client}
        packages={packages}
        members={members}
      />
    </div>
  );
}

/**
 * PostCard Component
 * Individual card for each post in the content grid
 */
interface PostCardProps {
  post: Post;
  onClick: () => void;
}

function PostCard({ post, onClick }: PostCardProps) {
  const getPostTypeColors = (
    postType: PostType | null
  ): { bg: string; text: string } => {
    if (!postType) {
      return { bg: '#F5EDE4', text: '#7A6560' };
    }
    const config = POST_TYPE_CONFIG[postType];
    return { bg: config?.color || '#F5EDE4', text: '#7A6560' };
  };

  const getAIScoreColor = (score: number | null): string => {
    if (score === null) return '#999999';
    if (score >= 80) return '#4CAF82';
    if (score >= 60) return '#FFB347';
    return '#FF7070';
  };

  const formatPostDate = (dateStr: string | null): string => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-MX', { month: 'short', day: '2-digit' });
  };

  const postTypeLabel =
    post.post_type && POST_TYPE_CONFIG[post.post_type]
      ? POST_TYPE_CONFIG[post.post_type].label
      : 'Sin tipo';

  const postTypeColors = getPostTypeColors(post.post_type);

  return (
    <div
      className="glass-card overflow-hidden cursor-pointer hover:shadow-lg transition-all"
      onClick={onClick}
    >
      {/* Image Area */}
      <div
        className="aspect-square relative bg-gradient-to-br flex items-center justify-center text-6xl overflow-hidden"
        style={{
          backgroundImage: post.image_url
            ? `url(${post.image_url})`
            : `linear-gradient(135deg, ${post.post_type ? postTypeColors.bg : '#F5EDE4'} 0%, ${post.post_type ? postTypeColors.bg + '80' : '#E8D5FF80'} 100%)`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {!post.image_url && <span>📷</span>}

        {/* Date Badge - Top Left */}
        <div
          className="absolute top-3 left-3 glass px-3 py-1.5 rounded-lg text-body-xs font-semibold"
          style={{ fontFamily: '"DM Mono", monospace' }}
        >
          {formatPostDate(post.scheduled_date)}
        </div>

        {/* Type Badge - Top Right */}
        <div
          className="absolute top-3 right-3 px-3 py-1.5 rounded-lg text-body-xs font-semibold"
          style={{
            backgroundColor: postTypeColors.bg,
            color: postTypeColors.text,
          }}
        >
          {postTypeLabel}
        </div>

        {/* AI Score Badge - Bottom Right */}
        {post.ai_score !== null && (
          <div className="absolute bottom-3 right-3 glass px-3 py-1.5 rounded-lg flex items-center gap-2 text-body-xs font-semibold">
            <span style={{ color: getAIScoreColor(post.ai_score) }}>●</span>
            <span className="text-sg-text">{post.ai_score}</span>
          </div>
        )}
      </div>

      {/* Card Body */}
      <div className="p-4">
        {/* Explanation Label */}
        {post.explanation && (
          <p className="text-body-xs text-sg-text-mid font-semibold uppercase tracking-wide mb-2">
            {post.explanation}
          </p>
        )}

        {/* Copy Text - 3 line clamp */}
        <p className="text-body-sm text-sg-text mb-4 line-clamp-3 leading-relaxed">
          {post.copy || 'Sin descripción'}
        </p>

        {/* Footer: Manager Avatar + Name | Ver detalle */}
        <div className="flex items-center justify-between pt-3 border-t border-sg-border">
          <div className="flex items-center gap-2">
            {post.assigned_member?.avatar_url && (
              <img
                src={post.assigned_member.avatar_url}
                alt={post.assigned_member.full_name || 'Manager'}
                className="w-5 h-5 rounded-full"
              />
            )}
            <span className="text-body-xs text-sg-text-mid font-medium">
              {post.assigned_member?.full_name || 'Sin asignar'}
            </span>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
            }}
            className="text-body-xs text-sg-text-mid hover:text-sg-text transition-colors font-medium"
          >
            Ver detalle →
          </button>
        </div>
      </div>
    </div>
  );
}
