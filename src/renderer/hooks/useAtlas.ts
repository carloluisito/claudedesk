/**
 * Custom hook for Repository Atlas Engine
 */

import { useState, useCallback, useEffect } from 'react';
import type {
  AtlasScanProgress,
  AtlasScanResult,
  AtlasGeneratedContent,
  AtlasStatus,
  AtlasSettings,
  InlineTag,
} from '../../shared/types/atlas-types';

export function useAtlas(projectPath: string | null) {
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState<AtlasScanProgress | null>(null);
  const [scanResult, setScanResult] = useState<AtlasScanResult | null>(null);
  const [generatedContent, setGeneratedContent] = useState<AtlasGeneratedContent | null>(null);
  const [atlasStatus, setAtlasStatus] = useState<AtlasStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Listen for scan progress events
  useEffect(() => {
    const unsub = window.electronAPI.onAtlasScanProgress((progress) => {
      setScanProgress(progress);
    });
    return unsub;
  }, []);

  // Load status when project path changes
  useEffect(() => {
    if (projectPath) {
      checkStatus();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectPath]);

  const checkStatus = useCallback(async () => {
    if (!projectPath) return;
    setError(null);
    try {
      const status = await window.electronAPI.getAtlasStatus(projectPath);
      setAtlasStatus(status);
    } catch (err) {
      console.error('Failed to get atlas status:', err);
      setError('Failed to check atlas status');
    }
  }, [projectPath]);

  const generateAtlas = useCallback(async (settings?: Partial<AtlasSettings>) => {
    if (!projectPath) return;
    setIsScanning(true);
    setScanProgress(null);
    setScanResult(null);
    setGeneratedContent(null);
    setError(null);

    try {
      const result = await window.electronAPI.generateAtlas({
        projectPath,
        settings,
      });
      setScanResult(result.scanResult);
      setGeneratedContent(result.generatedContent);
    } catch (err) {
      console.error('Failed to generate atlas:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate atlas');
    } finally {
      setIsScanning(false);
      setScanProgress(null);
    }
  }, [projectPath]);

  const writeAtlas = useCallback(async (
    claudeMd: string,
    repoIndex: string,
    inlineTags: InlineTag[]
  ) => {
    if (!projectPath) {
      const error = 'No project path available';
      setError(error);
      throw new Error(error);
    }
    setError(null);

    try {
      const result = await window.electronAPI.writeAtlas({
        projectPath,
        claudeMd,
        repoIndex,
        inlineTags,
      });

      // Refresh status after write
      await checkStatus();

      return result;
    } catch (err) {
      console.error('Failed to write atlas:', err);
      setError(err instanceof Error ? err.message : 'Failed to write atlas');
      throw err;
    }
  }, [projectPath, checkStatus]);

  const reset = useCallback(() => {
    setIsScanning(false);
    setScanProgress(null);
    setScanResult(null);
    setGeneratedContent(null);
    setError(null);
  }, []);

  return {
    isScanning,
    scanProgress,
    scanResult,
    generatedContent,
    atlasStatus,
    error,
    generateAtlas,
    writeAtlas,
    checkStatus,
    reset,
  };
}
