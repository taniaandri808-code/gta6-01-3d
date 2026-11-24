export class Missions {
  constructor() {
    this.missions = this._defineMissions();
    this.completed = new Set();
    this.currentMission = null;
    this.currentStage = 0;
  }

  _defineMissions() {
    return [
      {
        id: 'heist_downtown',
        name: 'The Corvina Crown',
        district: 'Downtown',
        type: 'heist',
        intro: 'Under the neon glow, the Crown Jewel of Corvina Bay sits in the Veldt Tower vault. Tonight, we make it ours.',
        reward: { cash: 50000, respect: 500, unlock: 'getaway_docks' },
        stages: [
          { type: 'goto', target: 'veldt_tower', label: 'Enter Veldt Tower', marker: { x: 1200, y: 800, radius: 5 } },
          { type: 'steal', target: 'crown_jewel', label: 'Steal the Crown Jewel', marker: { x: 1210, y: 805, radius: 2 } },
          { type: 'survive', target: 'alarm_timer', label: 'Survive the alarm', duration: 120, marker: { x: 1200, y: 800, radius: 10 } },
          { type: 'goto', target: 'extraction', label: 'Reach extraction point', marker: { x: 900, y: 600, radius: 5 } }
        ]
      },
      {
        id: 'getaway_docks',
        name: 'Harbor Run',
        district: 'Docks',
        type: 'getaway',
        intro: 'Salt and exhaust fill the air—the heat is on. The Docks are crawling with Corvina PD. Keep the wheels turning.',
        reward: { cash: 35000, respect: 400, unlock: 'convoy_industrial' },
        stages: [
          { type: 'goto', target: 'dock_warehouse', label: 'Reach the warehouse', marker: { x: 300, y: 2200, radius: 5 } },
          { type: 'steal', target: 'getaway_vehicle', label: 'Steal the transport', marker: { x: 310, y: 2190, radius: 3 } },
          { type: 'survive', target: 'police_pursuit', label: 'Lose the tail', duration: 180, marker: { x: 500, y: 1800, radius: 15 } },
          { type: 'deliver', target: 'safehouse_docks', label: 'Deliver to safehouse', marker: { x: 800, y: 1500, radius: 5 } }
        ]
      },
      {
        id: 'convoy_industrial',
        name: 'Iron Horse',
        district: 'Industrial',
        type: 'convoy raid',
        intro: 'Smoke rises from the smokestacks—a Vagner Group convoy moves through the Industrial sector. Heavy armor. Heavier payload.',
        reward: { cash: 45000, respect: 450, unlock: 'dock_deal_southside' },
        stages: [
          { type: 'goto', target: 'intercept_point', label: 'Intercept the convoy', marker: { x: 2500, y: 1500, radius: 8 } },
          { type: 'eliminate', target: 'escort_vehicles', label: 'Eliminate escorts', count: 4, marker: { x: 2500, y: 1500, radius: 20 } },
          { type: 'steal', target: 'convoy_cargo', label: 'Seize the cargo', marker: { x: 2510, y: 1505, radius: 3 } },
          { type: 'deliver', target: 'fence_industrial', label: 'Deliver to the fence', marker: { x: 2200, y: 1200, radius: 5 } }
        ]
      },
      {
        id: 'dock_deal_southside',
        name: 'Salt & Steel',
        district: 'Southside',
        type: 'dock deal gone wrong',
        intro: 'Gulls circle above rust and ruin—the meet at Pier 9 was supposed to be clean. The Marquez cartel disagreed.',
        reward: { cash: 40000, respect: 420, unlock: 'race_highway' },
        stages: [
          { type: 'goto', target: 'pier_9', label: 'Reach Pier 9', marker: { x: 500, y: 2800, radius: 5 } },
          { type: 'survive', target: 'ambush', label: 'Survive the ambush', duration: 90, marker: { x: 500, y: 2800, radius: 15 } },
          { type: 'eliminate', target: 'cartel_hitters', label: 'Eliminate cartel hitters', count: 6, marker: { x: 520, y: 2780, radius: 18 } },
          { type: 'steal', target: 'deal_briefcase', label: 'Retrieve the briefcase', marker: { x: 505, y: 2805, radius: 2 } },
          { type: 'goto', target: 'exit_southside', label: 'Escape Southside', marker: { x: 800, y: 2400, radius: 5 } }
        ]
      },
      {
        id: 'race_highway',
        name: 'Neon Sprint',
        district: 'Highway Loop',
        type: 'race',
        intro: 'City lights blur into streaks of color—the Highway Loop at midnight. No lights. No law. Just you, the asphalt, and the competition.',
        reward: { cash: 30000, respect: 350, unlock: 'protection_suburbs' },
        stages: [
          { type: 'goto', target: 'start_line', label: 'Reach the start line', marker: { x: 3500, y: 500, radius: 5 } },
          { type: 'goto', target: 'checkpoint_1', label: 'Checkpoint 1', marker: { x: 3200, y: 800, radius: 8 } },
          { type: 'goto', target: 'checkpoint_2', label: 'Checkpoint 2', marker: { x: 2800, y: 1200, radius: 8 } },
          { type: 'goto', target: 'checkpoint_3', label: 'Checkpoint 3', marker: { x: 2400, y: 800, radius: 8 } },
          { type: 'goto', target: 'finish_line', label: 'Cross the finish line', marker: { x: 3500, y: 500, radius: 5 } }
        ]
      },
      {
        id: 'protection_suburbs',
        name: 'Quiet Streets',
        district: 'Suburbs',
        type: 'protection',
        intro: 'Lawn mowers and silence hide deadly secrets—a witness in the Suburbs holds testimony that breaks the Vagner case. Keep them breathing.',
        reward: { cash: 38000, respect: 380, unlock: 'rooftop_uptown' },
        stages: [
          { type: 'goto', target: 'witness_house', label: 'Reach the witness', marker: { x: 1800, y: 300, radius: 5 } },
          { type: 'survive', target: 'hit_squad_waves', label: 'Survive hit squad waves', duration: 240, marker: { x: 1800, y: 300, radius: 20 } },
          { type: 'eliminate', target: 'squad_leaders', label: 'Eliminate squad leaders', count: 3, marker: { x: 1820, y: 280, radius: 15 } },
          { type: 'deliver', target: 'courthouse', label: 'Escort to courthouse', marker: { x: 1200, y: 800, radius: 5 } }
        ]
      },
      {
        id: 'rooftop_uptown',
        name: 'Vertical Limit',
        district: 'Uptown',
        type: 'rooftop chase',
        intro: 'The target fled to the Uptown towers. Across cranes, vents, and glass—we run them down.',
        reward: { cash: 42000, respect: 430, unlock: 'bank_vault_financial' },
        stages: [
          { type: 'goto', target: 'crane_start', label: 'Mount the crane', marker: { x: 3200, y: 300, radius: 4 } },
          { type: 'goto', target: 'rooftop_1', label: 'Cross to Rooftop 1', marker: { x: 3100, y: 350, radius: 5 } },
          { type: 'goto', target: 'rooftop_2', label: 'Cross to Rooftop 2', marker: { x: 3000, y: 400, radius: 5 } },
          { type: 'eliminate', target: 'target_bodyguards', label: 'Eliminate bodyguards', count: 4, marker: { x: 2950, y: 420, radius: 10 } },
          { type: 'steal', target: 'target_keycard', label: 'Take the keycard', marker: { x: 2940, y: 425, radius: 2 } }
        ]
      },
      {
        id: 'bank_vault_financial',
        name: 'The Vault',
        district: 'Financial District',
        type: 'bank vault',
        intro: 'Corvina Bay Federal Reserve. The score that retires legends. Or buries them.',
        reward: { cash: 100000, respect: 600, unlock: 'revenge_mansion' },
        stages: [
          { type: 'goto', target: 'bank_entrance', label: 'Enter the bank', marker: { x: 2000, y: 1000, radius: 5 } },
          { type: 'eliminate', target: 'guards', label: 'Neutralize guards', count: 8, marker: { x: 2000, y: 1000, radius: 15 } },
          { type: 'steal', target: 'vault_code', label: 'Hack the vault code', marker: { x: 2020, y: 1010, radius: 3 } },
          { type: 'steal', target: 'gold_bars', label: 'Load the gold', marker: { x: 2010, y: 1005, radius: 4 } },
          { type: 'survive', target: 'swat_siege', label: 'Survive SWAT siege', duration: 300, marker: { x: 2000, y: 1000, radius: 20 } },
          { type: 'goto', target: 'heli_extract', label: 'Reach rooftop extraction', marker: { x: 1980, y: 980, radius: 5 } }
        ]
      },
      {
        id: 'revenge_mansion',
        name: 'Old Scores',
        district: 'Mansions',
        type: 'revenge',
        intro: 'Victor Veldt ordered the hit on my crew. His mansion on the cliffs. Tonight he pays.',
        reward: { cash: 50000, respect: 550, unlock: 'final_showdown' },
        stages: [
          { type: 'goto', target: 'mansion_gates', label: 'Breach the gates', marker: { x: 4000, y: 200, radius: 5 } },
          { type: 'eliminate', target: 'estate_security', label: 'Clear estate security', count: 10, marker: { x: 4000, y: 200, radius: 25 } },
          { type: 'goto', target: 'veldt_office', label: 'Reach Veldt office', marker: { x: 4050, y: 220, radius: 4 } },
          { type: 'survive', target: 'veldt_last_stand', label: 'Survive Veldt last stand', duration: 120, marker: { x: 4050, y: 220, radius: 8 } },
          { type: 'eliminate', target: 'victor_veldt', label: 'Confront Victor Veldt', count: 1, marker: { x: 4055, y: 225, radius: 3 } }
        ]
      },
      {
        id: 'final_showdown',
        name: 'Corvina Dawn',
        district: 'City Center',
        type: 'final showdown',
        intro: 'The city burns. The syndicate falls. One last stand at the Corvina Bay Bridge. This ends now.',
        reward: { cash: 200000, respect: 1000, unlock: null },
        stages: [
          { type: 'goto', target: 'bridge_approach', label: 'Approach the bridge', marker: { x: 2200, y: 1500, radius: 8 } },
          { type: 'eliminate', target: 'syndicate_lieutenants', label: 'Eliminate lieutenants', count: 5, marker: { x: 2200, y: 1500, radius: 30 } },
          { type: 'survive', target: 'heli_assault', label: 'Survive helicopter assault', duration: 180, marker: { x: 2200, y: 1500, radius: 40 } },
          { type: 'goto', target: 'bridge_center', label: 'Reach bridge center', marker: { x: 2180, y: 1520, radius: 5 } },
          { type: 'eliminate', target: 'don_corvina', label: 'Defeat Don Corvina', count: 1, marker: { x: 2175, y: 1525, radius: 3 } },
          { type: 'goto', target: 'escape_boat', label: 'Escape on the boat', marker: { x: 2100, y: 1600, radius: 5 } }
        ]
      }
    ];
  }

  getMission(id) {
    return this.missions.find(m => m.id === id);
  }

  getNextMission() {
    if (!this.currentMission) {
      return this.missions[0];
    }
    const idx = this.missions.findIndex(m => m.id === this.currentMission.id);
    return this.missions[idx + 1] || null;
  }

  startMission(id) {
    const mission = this.getMission(id);
    if (!mission) return false;
    this.currentMission = mission;
    this.currentStage = 0;
    return true;
  }

  getCurrentStage() {
    if (!this.currentMission) return null;
    return this.currentMission.stages[this.currentStage] || null;
  }

  advanceStage() {
    if (!this.currentMission) return false;
    this.currentStage++;
    if (this.currentStage >= this.currentMission.stages.length) {
      this.completeMission();
      return 'completed';
    }
    return 'advanced';
  }

  completeMission() {
    if (this.currentMission) {
      this.completed.add(this.currentMission.id);
      this.currentMission = null;
      this.currentStage = 0;
      return true;
    }
    return false;
  }

  isCompleted(id) {
    return this.completed.has(id);
  }

  getProgress() {
    return {
      completed: this.completed.size,
      total: this.missions.length,
      current: this.currentMission?.id || null,
      stage: this.currentStage
    };
  }

  getReward(missionId) {
    const mission = this.getMission(missionId);
    return mission?.reward || null;
  }
}
