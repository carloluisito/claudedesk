import QRCode from 'qrcode';

export interface QRResult {
  success: boolean;
  ascii?: string;
  error?: string;
}

/**
 * Generate an ASCII QR code for terminal display
 */
export async function generateTerminalQR(url: string): Promise<QRResult> {
  try {
    const ascii = await QRCode.toString(url, {
      type: 'terminal',
      small: true,
      margin: 1,
    });
    return { success: true, ascii };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return { success: false, error: errorMsg };
  }
}

/**
 * Generate a data URL for the QR code (for UI display)
 */
export async function generateQRDataUrl(url: string): Promise<string | null> {
  try {
    return await QRCode.toDataURL(url, {
      margin: 1,
      width: 200,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    });
  } catch (error) {
    console.error('Failed to generate QR data URL:', error);
    return null;
  }
}

/**
 * Display QR code and connection info in the terminal
 */
export async function displayMobileAccessInfo(
  localUrl: string,
  tunnelUrl: string | null,
  token: string
): Promise<void> {
  if (!tunnelUrl) {
    console.log(`
  MOBILE ACCESS
  To enable mobile access, enable tunnel in Settings or set tunnel.autoStart: true
`);
    return;
  }

  // Build the URL with embedded token for easy mobile login
  const mobileUrl = `${tunnelUrl}?token=${encodeURIComponent(token)}`;

  const qrResult = await generateTerminalQR(mobileUrl);

  console.log(`
  MOBILE ACCESS`);

  if (qrResult.success && qrResult.ascii) {
    console.log(qrResult.ascii);
  }

  console.log(`  Scan QR code or visit:
  ${mobileUrl}
`);
}
