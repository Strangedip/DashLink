const { createHash } = require('crypto');
const { getFirestore } = require('firebase-admin/firestore');

const SITE = (process.env.SITE_URL || 'https://dashlink-prj.web.app').replace(/\/$/, '');
const FALLBACK_IMAGE = `${SITE}/og-cover.jpg`;
const MAX_COLLECTIONS = 200;
const MAX_NODES = 500;

function db() {
  return getFirestore();
}

function asText(value) {
  if (value == null) {
    return '';
  }
  return String(value);
}

function stripHtml(value) {
  return asText(value)
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function jsonSafe(value) {
  if (value == null) {
    return null;
  }
  if (typeof value.toDate === 'function') {
    return value.toDate().toISOString();
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (Array.isArray(value)) {
    return value.map(jsonSafe);
  }
  if (typeof value === 'object') {
    const out = {};
    for (const [key, item] of Object.entries(value)) {
      out[key] = jsonSafe(item);
    }
    return out;
  }
  return value;
}

function toHref(value, allowBare) {
  const trimmed = asText(value).trim();
  if (!trimmed) {
    return null;
  }
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  if (/^www\./i.test(trimmed)) {
    return `https://${trimmed}`;
  }
  if (allowBare && /^[\w.-]+\.[a-z]{2,}([/:?#].*)?$/i.test(trimmed)) {
    return `https://${trimmed}`;
  }
  return null;
}

function isHttpUrl(value) {
  return /^https?:\/\//i.test(asText(value).trim());
}

function publicType(rawType) {
  const type = asText(rawType);
  if (type === 'imageUrl' || type === 'image-upload') {
    return 'image';
  }
  if (type === 'richText' || type === 'long-text') {
    return 'long-text';
  }
  const allowed = ['text', 'url', 'email', 'phone', 'number', 'date', 'datetime', 'checkbox', 'color', 'rating'];
  return allowed.includes(type) ? type : 'text';
}

function mapFields(rawFields) {
  if (!Array.isArray(rawFields)) {
    return [];
  }
  const fields = [];
  for (const field of rawFields) {
    const name = asText(field.fieldName || field.name).trim();
    const type = publicType(field.fieldType || field.type);
    const value = jsonSafe(field.fieldValue !== undefined ? field.fieldValue : field.value);
    if (!name || value == null || value === '') {
      continue;
    }
    fields.push({ name, type, value });
  }
  return fields;
}

function firstCover(fields) {
  const image = fields.find(field => field.type === 'image' && isHttpUrl(field.value));
  return image ? asText(image.value).trim() : null;
}

function firstUrl(fields) {
  const urlField = fields.find(field => field.type === 'url');
  return urlField ? toHref(urlField.value, true) : null;
}

function toPublicNode(data) {
  const fields = mapFields(data.customFields || data.fields);
  const primaryUrl = firstUrl(fields) || toHref(data.name, false);
  return {
    name: asText(data.name).trim() || 'Untitled',
    description: asText(data.description || ''),
    fields,
    primaryUrl,
    coverImage: firstCover(fields)
  };
}

function buildTree(root, allCollections, nodesByCollection) {
  const byParent = new Map();
  for (const item of allCollections) {
    const parent = item.parentCollectionId == null || item.parentCollectionId === '' ? null : item.parentCollectionId;
    if (!byParent.has(parent)) {
      byParent.set(parent, []);
    }
    byParent.get(parent).push(item);
  }

  function walk(id) {
    const children = byParent.get(id) || [];
    return children.map(child => ({
      name: asText(child.name).trim() || 'Untitled',
      description: asText(child.description || ''),
      nodes: nodesByCollection.get(child.id) || [],
      collections: walk(child.id)
    }));
  }

  return {
    name: asText(root.name).trim() || 'Untitled',
    description: asText(root.description || ''),
    nodes: nodesByCollection.get(root.id) || [],
    collections: walk(root.id)
  };
}

async function loadPersonalCollections(ownerId) {
  const snap = await db().collection(`users/${ownerId}/collections`).limit(MAX_COLLECTIONS).get();
  return snap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
}

async function loadWorkspaceCollections(workspaceId) {
  const snap = await db().collection(`workspaces/${workspaceId}/collections`).limit(MAX_COLLECTIONS).get();
  return snap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
}

function descendantIds(rootId, collections) {
  const ids = new Set([rootId]);
  let added = true;
  while (added) {
    added = false;
    for (const item of collections) {
      const parent = item.parentCollectionId == null || item.parentCollectionId === '' ? null : item.parentCollectionId;
      if (parent && ids.has(parent) && !ids.has(item.id)) {
        ids.add(item.id);
        added = true;
      }
    }
  }
  return ids;
}

async function loadNodes(pathFor, collectionIds) {
  const nodesByCollection = new Map();
  let count = 0;
  for (const collectionId of collectionIds) {
    const snap = await db().collection(pathFor(collectionId)).limit(MAX_NODES).get();
    const nodes = [];
    for (const docSnap of snap.docs) {
      if (count >= MAX_NODES) {
        break;
      }
      nodes.push(toPublicNode(docSnap.data()));
      count += 1;
    }
    nodesByCollection.set(collectionId, nodes);
    if (count >= MAX_NODES) {
      break;
    }
  }
  return nodesByCollection;
}

function openPathFor(pointer) {
  if (pointer.origin === 'workspace' && pointer.workspaceId) {
    if (pointer.collectionId) {
      return `/workspaces/${pointer.workspaceId}/collections/${pointer.collectionId}`;
    }
    return `/workspaces/${pointer.workspaceId}`;
  }
  if (pointer.collectionId) {
    return `/collections/${pointer.collectionId}`;
  }
  return '/dashboard';
}

async function loadNodePayload(pointer) {
  let snap;
  if (pointer.origin === 'workspace') {
    const path = pointer.collectionId
      ? `workspaces/${pointer.workspaceId}/collections/${pointer.collectionId}/nodes/${pointer.nodeId}`
      : `workspaces/${pointer.workspaceId}/nodes/${pointer.nodeId}`;
    snap = await db().doc(path).get();
  } else {
    snap = await db().doc(`users/${pointer.ownerId}/collections/${pointer.collectionId}/nodes/${pointer.nodeId}`).get();
  }
  if (!snap.exists) {
    return null;
  }
  return toPublicNode(snap.data());
}

async function loadCollectionPayload(pointer) {
  if (pointer.origin === 'workspace') {
    const rootSnap = await db().doc(`workspaces/${pointer.workspaceId}/collections/${pointer.collectionId}`).get();
    if (!rootSnap.exists) {
      return null;
    }
    const collections = await loadWorkspaceCollections(pointer.workspaceId);
    const ids = descendantIds(pointer.collectionId, collections);
    const nodesByCollection = await loadNodes(
      id => `workspaces/${pointer.workspaceId}/collections/${id}/nodes`,
      ids
    );
    return buildTree({ id: rootSnap.id, ...rootSnap.data() }, collections, nodesByCollection);
  }

  const rootSnap = await db().doc(`users/${pointer.ownerId}/collections/${pointer.collectionId}`).get();
  if (!rootSnap.exists) {
    return null;
  }
  const collections = await loadPersonalCollections(pointer.ownerId);
  const ids = descendantIds(pointer.collectionId, collections);
  const nodesByCollection = await loadNodes(
    id => `users/${pointer.ownerId}/collections/${id}/nodes`,
    ids
  );
  return buildTree({ id: rootSnap.id, ...rootSnap.data() }, collections, nodesByCollection);
}

function collectionCover(tree) {
  if (!tree) {
    return null;
  }
  for (const node of tree.nodes || []) {
    if (node.coverImage) {
      return node.coverImage;
    }
  }
  for (const child of tree.collections || []) {
    const nested = collectionCover(child);
    if (nested) {
      return nested;
    }
  }
  return null;
}

function collectionBlurb(tree) {
  if (!tree) {
    return '';
  }
  const own = stripHtml(tree.description);
  if (own) {
    return own;
  }
  const firstNode = (tree.nodes || []).find(node => stripHtml(node.description) || node.name);
  if (firstNode) {
    return stripHtml(firstNode.description) || firstNode.name;
  }
  return '';
}

function previewId(url) {
  return createHash('sha256').update(url).digest('base64url').slice(0, 22);
}

function metaContent(html, names) {
  for (const name of names) {
    const property = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match =
      html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']+)`, 'i')) ||
      html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${property}["']`, 'i'));
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  return '';
}

async function scrapeOgImage(url) {
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      signal: AbortSignal.timeout(4500),
      headers: {
        'User-Agent': 'facebookexternalhit/1.1; DashLink/1.0',
        Accept: 'text/html'
      }
    });
    if (!res.ok) {
      return null;
    }
    const html = (await res.text()).slice(0, 180000);
    const raw = metaContent(html, ['og:image', 'og:image:url', 'twitter:image', 'twitter:image:src']);
    if (!raw) {
      return null;
    }
    const absolute = /^https?:\/\//i.test(raw) ? raw : new URL(raw, url).href;
    return isHttpUrl(absolute) ? absolute : null;
  } catch {
    return null;
  }
}

async function fetchLinkPreview(url) {
  const href = toHref(url, true);
  if (!href) {
    return { image: null };
  }
  const ref = db().doc(`link_previews/${previewId(href)}`);
  const snap = await ref.get();
  const now = Date.now();
  if (snap.exists) {
    const data = snap.data() || {};
    const at = data.fetchedAt && typeof data.fetchedAt.toMillis === 'function' ? data.fetchedAt.toMillis() : 0;
    const age = now - at;
    const fresh = data.image ? age < 14 * 24 * 60 * 60 * 1000 : age < 24 * 60 * 60 * 1000;
    if (fresh) {
      return { image: data.image || null };
    }
  }
  const image = await scrapeOgImage(href);
  await ref.set({ url: href, image, fetchedAt: new Date() });
  return { image };
}

async function fetchLinkPreviews(urls) {
  const unique = [...new Set((urls || []).map(item => toHref(item, true)).filter(Boolean))].slice(0, 20);
  const previews = {};
  for (let i = 0; i < unique.length; i += 4) {
    const chunk = unique.slice(i, i + 4);
    await Promise.all(chunk.map(async item => {
      previews[item] = await fetchLinkPreview(item);
    }));
  }
  return previews;
}

async function attachPreview(node) {
  if (!node || node.coverImage || !node.primaryUrl) {
    return node;
  }
  const preview = await fetchLinkPreview(node.primaryUrl);
  if (preview.image) {
    node.coverImage = preview.image;
  }
  return node;
}

async function enrichTree(tree) {
  if (!tree) {
    return tree;
  }
  await Promise.all((tree.nodes || []).map(attachPreview));
  for (const child of tree.collections || []) {
    await enrichTree(child);
  }
  return tree;
}

function previewFromContent(node, collection) {
  if (node) {
    return {
      title: node.name,
      description: stripHtml(node.description) || 'Shared with DashLink.',
      coverImage: node.coverImage
    };
  }
  if (collection) {
    return {
      title: collection.name,
      description: collectionBlurb(collection) || 'A DashLink collection.',
      coverImage: collectionCover(collection)
    };
  }
  return {
    title: 'Unavailable',
    description: 'This DashLink is no longer available.',
    coverImage: null
  };
}

async function loadShare(shareId, viewerUid) {
  if (!shareId || !/^[A-Za-z0-9_-]{8,64}$/.test(shareId)) {
    return unavailablePayload(shareId || '');
  }

  const pointerSnap = await db().doc(`shares/${shareId}`).get();
  if (!pointerSnap.exists) {
    return unavailablePayload(shareId);
  }

  const pointer = pointerSnap.data() || {};
  const ownerId = asText(pointer.ownerId);
  const kind = pointer.kind === 'collection' ? 'collection' : 'node';
  const origin = pointer.origin === 'workspace' ? 'workspace' : 'personal';
  const ownerName = asText(pointer.ownerName).trim() || 'A DashLink user';
  const viewer = viewerUid && viewerUid === ownerId ? 'owner' : (viewerUid ? 'signed-in' : 'guest');
  const normalizedPointer = {
    kind,
    origin,
    ownerId,
    ownerName,
    workspaceId: pointer.workspaceId || null,
    collectionId: pointer.collectionId || null,
    nodeId: pointer.nodeId || null
  };

  let node = null;
  let collection = null;
  try {
    if (kind === 'node') {
      node = await attachPreview(await loadNodePayload(normalizedPointer));
    } else {
      collection = await enrichTree(await loadCollectionPayload(normalizedPointer));
    }
  } catch (error) {
    console.error('Failed to load share source', shareId, error);
    return unavailablePayload(shareId, ownerName);
  }

  if (!node && !collection) {
    return unavailablePayload(shareId, ownerName);
  }

  const preview = previewFromContent(node, collection);
  const coverImage = preview.coverImage || FALLBACK_IMAGE;

  return {
    shareId,
    kind,
    origin,
    ownerName,
    title: preview.title,
    description: preview.description.slice(0, 220),
    coverImage,
    viewer,
    openPath: viewer === 'owner' ? openPathFor(normalizedPointer) : null,
    node,
    collection,
    unavailable: false
  };
}

function unavailablePayload(shareId, ownerName) {
  return {
    shareId,
    kind: 'node',
    origin: 'personal',
    ownerName: ownerName || '',
    title: 'This DashLink is unavailable',
    description: 'The original item may have been deleted.',
    coverImage: FALLBACK_IMAGE,
    viewer: 'guest',
    openPath: null,
    node: null,
    collection: null,
    unavailable: true
  };
}

module.exports = {
  SITE,
  FALLBACK_IMAGE,
  loadShare,
  stripHtml,
  fetchLinkPreviews
};
