// Web Audio API based notification sounds
// No external files needed - generates sounds programmatically

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  }
  return audioContext;
}

export function playSuccessSound(volume: number = 0.3): void {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // Create a pleasant two-tone chime
    const frequencies = [523.25, 659.25]; // C5 and E5

    frequencies.forEach((freq, i) => {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(freq, now);

      // Quick attack, medium decay
      gainNode.gain.setValueAtTime(0, now + (i * 0.1));
      gainNode.gain.linearRampToValueAtTime(volume, now + (i * 0.1) + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + (i * 0.1) + 0.3);

      oscillator.start(now + (i * 0.1));
      oscillator.stop(now + (i * 0.1) + 0.35);
    });
  } catch (error) {
    console.warn('Could not play success sound:', error);
  }
}

export function playErrorSound(volume: number = 0.3): void {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // Create a descending tone for errors
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.type = 'sine';

    // Descending frequency
    oscillator.frequency.setValueAtTime(440, now); // A4
    oscillator.frequency.linearRampToValueAtTime(330, now + 0.2); // E4

    // Quick attack, medium decay
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(volume, now + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

    oscillator.start(now);
    oscillator.stop(now + 0.35);
  } catch (error) {
    console.warn('Could not play error sound:', error);
  }
}

export function playNotificationSound(volume: number = 0.2): void {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // Simple notification ping
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, now); // A5

    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(volume, now + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

    oscillator.start(now);
    oscillator.stop(now + 0.2);
  } catch (error) {
    console.warn('Could not play notification sound:', error);
  }
}
