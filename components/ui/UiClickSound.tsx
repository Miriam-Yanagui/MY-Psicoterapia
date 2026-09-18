"use client";

import { useEffect } from "react";

const INTERACTIVE_SELECTOR = [
  "button:not(:disabled)",
  "a[href]",
  "select:not(:disabled)",
  "summary",
  "[role='button']:not([aria-disabled='true'])",
  "[role='checkbox']:not([aria-disabled='true'])",
  "[role='radio']:not([aria-disabled='true'])",
  "input[type='button']:not(:disabled)",
  "input[type='submit']:not(:disabled)",
  "input[type='checkbox']:not(:disabled)",
  "input[type='radio']:not(:disabled)",
  "[data-click-sound]",
].join(",");

export function UiClickSound() {
  useEffect(() => {
    const players = Array.from({ length: 3 }, () => {
      const audio = new Audio("/assets/ui-click.mp3");
      audio.preload = "auto";
      audio.volume = 0.19;
      return audio;
    });
    let playerIndex = 0;

    function playForInteraction(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const interactive = target.closest(INTERACTIVE_SELECTOR);
      if (!interactive || interactive.closest("[data-click-sound='off']")) return;

      const player = players[playerIndex];
      playerIndex = (playerIndex + 1) % players.length;
      player.currentTime = 0;
      void player.play().catch(() => {
        // Some browsers can still reject audio while restoring a background tab.
      });
    }

    document.addEventListener("click", playForInteraction, true);
    return () => {
      document.removeEventListener("click", playForInteraction, true);
      players.forEach((player) => {
        player.pause();
        player.src = "";
      });
    };
  }, []);

  return null;
}
