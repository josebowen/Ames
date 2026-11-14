# The Ames Room

An 8 minute learning simulation for a sensation and perception unit. Look through the peephole at two people of the same height, work out where they must be standing, then step outside the room, name the depth cues, build your own Ames room with a slider and break the illusion by moving your head.

Live: https://josebowen.github.io/Ames/

## What is real
- The geometry. The room is authored as a box and every point is moved along its line of sight from the peephole (`X' = X / (1 + c x)`), so the peephole image is identical at every slider setting. Distances and image sizes on screen are measured from the scene at run time.
- Sources and their check status are in `data/sources-verified.md`. Depth cue definitions were checked against OpenStax, Psychology 2e, 5.3 (CC BY 4.0).

## Build and test
    npm install
    node build.mjs          # writes the single self-contained index.html
    npm test                # puppeteer walkthrough at 1600x900 and 390x844, screenshots in test/out

One of the faculty workshop demos listed at https://weteachwithai.com/vibe-coding/
