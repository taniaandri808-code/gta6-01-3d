// City-wide gameplay configuration for the Vice Bay sandbox.
// All tuning values live here so the rest of the game stays data-driven.

export const CFG = {
  // 12x12 grid of city blocks; blocks are 60 units square and separated
  // by roads that are 12 units wide.
  city: {
    widthBlocks: 12,
    heightBlocks: 12,
    blockSize: 60,
    roadWidth: 12,
  },

  // District color palette keyed by district name. The city generator
  // assigns one palette entry per block region.
  districts: {
    palette: {
      downtown: 0x334455,
      beach: 0xf2c14e,
      suburbs: 0x8fbf9f,
      industrial: 0x7a7468,
    },
  },

  // Player movement speeds in world units per second.
  player: {
    walkSpeed: 8,
    runSpeed: 16,
  },

  // Arcade car physics: acceleration raises forward speed, friction and
  // braking pull it back down, turnSpeed is radians per second at full
  // steering input.
  car: {
    acceleration: 0.6,
    maxSpeed: 64,
    friction: 0.04,
    turnSpeed: 0.055,
    brakeForce: 0.9,
  },

  // Heat thresholds: once the wanted meter crosses a threshold for a
  // given star level, decay pauses until the meter cools below it.
  wanted: {
    decayThresholds: {
      1: 450,
      2: 600,
      3: 800,
      4: 1100,
      5: 1500,
    },
  },

  // Weather states the simulation can cycle through.
  weather: [
    "Clear",
    "Cloudy",
    "Rain",
    "Fog",
    "Dusk haze",
  ],

  // Four original radio stations for the car stereo.
  radioStations: [
    { name: "Corvina FM", frequency: 91.4, genre: "disco" },
    { name: "Sunset Wave", frequency: 96.2, genre: "synth-pop" },
    { name: "Bay Beat", frequency: 101.7, genre: "funk" },
    { name: "Nightstatic", frequency: 104.9, genre: "new wave" },
  ],

  // Story blurb strings shown on the title screen and mission board.
  story: {
    intro: "You just washed ashore in Vice Bay with nothing but a fake ID.",
    hook: "Find the crew, fix up a ride, and hustle your way to the top of the bay.",
    outro: "Every corner of the map has a side job if you know where to look.",
  },

  // Player starts the campaign with this much cash.
  economy: {
    startingMoney: 500,
  },
};
CFG.startMoney = CFG.economy.startingMoney;
