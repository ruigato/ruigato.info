declare module "gsap/flip.js" {
  const Flip: {
    readonly version: string
    getState(
      targets: gsap.DOMTarget,
      vars?: Flip.FlipStateVars | string,
    ): Flip.FlipState
    from(
      state: Flip.FlipState,
      vars?: Flip.FromToVars,
    ): gsap.core.Timeline
    killFlipsOf(targets: gsap.DOMTarget, complete?: boolean): void
    register(core: typeof gsap): void
  }
  export default Flip
}
