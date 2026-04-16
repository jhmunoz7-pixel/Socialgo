/**
 * Meta Graph API client for Instagram and Facebook publishing.
 *
 * Instagram publishing is a 2-step process:
 *   1. Create media container: POST /{ig-user-id}/media
 *   2. Publish container: POST /{ig-user-id}/media_publish
 *
 * Facebook publishing:
 *   - Image posts: POST /{page-id}/photos
 *   - Text-only: POST /{page-id}/feed
 *
 * NOTE: These calls require real Meta App credentials + user tokens.
 * Without them the calls will fail — that's expected during development.
 */

const META_GRAPH_URL = 'https://graph.facebook.com/v19.0';

export interface InstagramPublishResult {
  id: string;
  permalink: string;
}

export interface FacebookPublishResult {
  id: string;
  permalink_url: string;
}

export interface PublishError {
  error: string;
}

// ─── Instagram ────────────────────────────────────────────────────────────

export async function publishToInstagram(params: {
  accessToken: string;
  igBusinessAccountId: string;
  imageUrl: string;
  caption: string;
}): Promise<InstagramPublishResult | PublishError> {
  const { accessToken, igBusinessAccountId, imageUrl, caption } = params;

  try {
    // Step 1: Create media container
    const containerRes = await fetch(
      `${META_GRAPH_URL}/${igBusinessAccountId}/media`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_url: imageUrl,
          caption,
          access_token: accessToken,
        }),
      }
    );

    const containerData = await containerRes.json();

    if (containerData.error) {
      return { error: `Instagram container error: ${containerData.error.message || JSON.stringify(containerData.error)}` };
    }

    if (!containerData.id) {
      return { error: 'Instagram: no se recibió ID del contenedor de media' };
    }

    // Step 2: Publish the container
    const publishRes = await fetch(
      `${META_GRAPH_URL}/${igBusinessAccountId}/media_publish`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creation_id: containerData.id,
          access_token: accessToken,
        }),
      }
    );

    const publishData = await publishRes.json();

    if (publishData.error) {
      return { error: `Instagram publish error: ${publishData.error.message || JSON.stringify(publishData.error)}` };
    }

    // Fetch the permalink
    const mediaRes = await fetch(
      `${META_GRAPH_URL}/${publishData.id}?fields=permalink&access_token=${accessToken}`
    );
    const mediaData = await mediaRes.json();

    return {
      id: publishData.id,
      permalink: mediaData.permalink || `https://www.instagram.com/p/${publishData.id}`,
    };
  } catch (err) {
    return { error: `Instagram error: ${err instanceof Error ? err.message : String(err)}` };
  }
}

// ─── Facebook ─────────────────────────────────────────────────────────────

export async function publishToFacebook(params: {
  accessToken: string;
  pageId: string;
  message: string;
  imageUrl?: string;
}): Promise<FacebookPublishResult | PublishError> {
  const { accessToken, pageId, message, imageUrl } = params;

  try {
    let endpoint: string;
    let body: Record<string, string>;

    if (imageUrl) {
      // Image post via /photos
      endpoint = `${META_GRAPH_URL}/${pageId}/photos`;
      body = {
        url: imageUrl,
        message,
        access_token: accessToken,
      };
    } else {
      // Text-only post via /feed
      endpoint = `${META_GRAPH_URL}/${pageId}/feed`;
      body = {
        message,
        access_token: accessToken,
      };
    }

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await res.json();

    if (data.error) {
      return { error: `Facebook error: ${data.error.message || JSON.stringify(data.error)}` };
    }

    // Build permalink — for page posts, the ID format is "{page_id}_{post_id}"
    const postId = data.id || data.post_id;
    const permalink_url = `https://www.facebook.com/${postId}`;

    return {
      id: postId,
      permalink_url,
    };
  } catch (err) {
    return { error: `Facebook error: ${err instanceof Error ? err.message : String(err)}` };
  }
}

// ─── Token Validation ─────────────────────────────────────────────────────

export async function validateToken(accessToken: string): Promise<boolean> {
  try {
    const res = await fetch(
      `${META_GRAPH_URL}/me?access_token=${accessToken}`
    );
    const data = await res.json();
    return !data.error;
  } catch {
    return false;
  }
}
