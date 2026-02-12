import '@testing-library/jest-dom';
import { beforeEach } from 'vitest';
import { resetElectronAPI } from './helpers/electron-api-mock';

// Reset the electronAPI mock before each test
beforeEach(() => {
  resetElectronAPI();
});
