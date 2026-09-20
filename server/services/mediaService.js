/**
 * Media storage provider abstraction.
 * Configure Cloudinary, Vercel Blob, or local without rewriting callers.
 * Binary images are never stored in PostgreSQL.
 */
import { serverEnv } from '../config/env.js';

export function getMediaProviderName() {
  return serverEnv.mediaProvider || 'local';
}

export async function createMediaProvider() {
  const name = getMediaProviderName();

  if (name === 'cloudinary') {
    return {
      name: 'cloudinary',
      async upload(_file, _options = {}) {
        throw new Error('Cloudinary provider not configured yet');
      },
      async delete(_publicId) {
        throw new Error('Cloudinary provider not configured yet');
      },
    };
  }

  if (name === 'vercel_blob') {
    return {
      name: 'vercel_blob',
      async upload(_file, _options = {}) {
        throw new Error('Vercel Blob provider not configured yet');
      },
      async delete(_url) {
        throw new Error('Vercel Blob provider not configured yet');
      },
    };
  }

  return {
    name: 'local',
    async upload(_file, _options = {}) {
      throw new Error('Local media upload not implemented in Phase 1');
    },
    async delete(_path) {
      return { deleted: false };
    },
  };
}
