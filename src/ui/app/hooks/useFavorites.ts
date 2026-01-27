import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';

interface Favorites {
  repos: string[];
  recentRepos: string[];
}

export function useFavorites() {
  const [favorites, setFavorites] = useState<Favorites>({ repos: [], recentRepos: [] });
  const [loading, setLoading] = useState(true);

  const loadFavorites = useCallback(async () => {
    try {
      const data = await api<Favorites>('GET', '/settings/favorites');
      setFavorites(data);
    } catch (error) {
      console.error('Failed to load favorites:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const toggleFavorite = useCallback(async (repoId: string) => {
    const isFav = favorites.repos.includes(repoId);
    try {
      if (isFav) {
        await api('DELETE', `/settings/favorites/repos/${repoId}`);
        setFavorites(prev => ({ ...prev, repos: prev.repos.filter(id => id !== repoId) }));
      } else {
        await api('POST', `/settings/favorites/repos/${repoId}`);
        setFavorites(prev => ({ ...prev, repos: [...prev.repos, repoId] }));
      }
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    }
  }, [favorites.repos]);

  const isFavorite = useCallback((repoId: string) => {
    return favorites.repos.includes(repoId);
  }, [favorites.repos]);

  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  return { favorites, loading, toggleFavorite, isFavorite, reload: loadFavorites };
}
