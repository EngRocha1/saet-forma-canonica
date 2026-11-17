/** Só o relógio da página: play, pausa e o controle de progresso. */

export function createPlayer(opts) {
  let timer = null;
  let idx = 0;
  function stop() {
    if (timer) clearInterval(timer);
    timer = null;
    opts.onPlay(false);
  }
  return {
    stop,
    show(i, n) {
      idx = Math.max(0, Math.min(i, n - 1));
      opts.draw(idx);
    },
    last(n) { this.show(n - 1, n); },
    toggle(n) {
      if (timer) { stop(); return; }
      if (n < 2) return;
      opts.onPlay(true);
      timer = setInterval(() => {
        idx = (idx + 1) % n;
        opts.draw(idx);
      }, 180);
    },
    scrub(fraction, n) {
      stop();
      this.show(Math.round(fraction * (n - 1)), n);
    }
  };
}
