const REVEAL_SOUND_VOLUME = 0.5;

let revealSound: HTMLAudioElement | null = null;
let priming: Promise<void> | null = null;

function getRevealSound() {
  if (typeof Audio === "undefined") return null;
  if (!revealSound) {
    revealSound = new Audio("/assets/elegant-reveal.mp3");
    revealSound.preload = "auto";
  }
  return revealSound;
}

export function primeRevealSound() {
  const audio = getRevealSound();
  if (!audio) return;

  audio.pause();
  audio.currentTime = 0;
  audio.volume = 0;
  priming = audio.play()
    .then(() => undefined)
    .catch(() => {
      audio.volume = REVEAL_SOUND_VOLUME;
    });
}

export function playRevealSound() {
  const audio = getRevealSound();
  if (!audio) return;

  const play = () => {
    audio.volume = REVEAL_SOUND_VOLUME;
    audio.currentTime = 0;
    if (audio.paused) {
      void audio.play().catch(() => {
        // A direct visit can still be silent until the person interacts with the page.
      });
    }
  };

  if (priming) void priming.finally(play);
  else play();
}
