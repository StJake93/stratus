// Screen-reader announcements (WCAG 4.1.3 status messages).
// App.svelte renders the two live regions; anything can call announce() to be heard without moving focus.

class Announcer {
  polite = $state('');
  assertive = $state('');
  #timer: ReturnType<typeof setTimeout> | undefined;

  say(message: string, urgent = false) {
    clearTimeout(this.#timer);
    // Clear first so repeating the same message is announced again.
    this.polite = '';
    this.assertive = '';
    this.#timer = setTimeout(() => {
      if (urgent) this.assertive = message;
      else this.polite = message;
    }, 60);
  }
}

export const announcer = new Announcer();
export const announce = (message: string, urgent = false) => announcer.say(message, urgent);
