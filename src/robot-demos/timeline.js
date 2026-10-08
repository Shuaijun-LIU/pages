/** Reusable playback clock; time and duration are seconds. Scrubbing pauses. */
export function createTimeline({
  duration,
  playing = true,
  loop = true,
  onChange = () => {},
}) {
  const state = { time: 0, duration, playing, speed: 1 };
  const notify = () => onChange({ ...state });
  return {
    state,
    tick(dt) {
      if (!state.playing) return;
      state.time += dt * state.speed;
      if (state.time >= duration) {
        state.time = loop ? state.time % duration : duration;
        if (!loop) state.playing = false;
      }
      notify();
    },
    toggle() {
      state.playing = !state.playing;
      notify();
    },
    pause() {
      state.playing = false;
      notify();
    },
    seek(time) {
      state.time = Math.max(0, Math.min(duration, Number(time)));
      state.playing = false;
      notify();
    },
    speed(value) {
      state.speed = Number(value);
      notify();
    },
    reset() {
      state.time = 0;
      state.playing = false;
      notify();
    },
    notify,
  };
}
