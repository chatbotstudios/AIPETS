export interface PetState {
  uuid: string;
  name: string;
  xp: number;
  level: number;
  hp: number;
  rep: number;
  currentClass: string;
}

export class GameEngine {
  /**
   * Initializes a brand-new AIPET companion state profile.
   */
  static createNewPet(name: string, startingClass: string = "Cyber-Egg"): PetState {
    const uuid = "CLAW-" + Math.floor(Math.random() * 0xfffffff).toString(16).toUpperCase();
    return {
      uuid,
      name,
      xp: 50, // Starter XP
      level: 1,
      hp: 100,
      rep: 1.0,
      currentClass: startingClass,
    };
  }

  /**
   * Dynamically adds XP based on swarm multipliers and computes potential evolutionary level-ups.
   */
  static addXP(
    state: PetState,
    amount: number,
    swarmSize: number = 1
  ): { state: PetState; gained: number; evolved: boolean } {
    let multiplier = 1.0;
    if (swarmSize > 1) {
      multiplier += 0.15 * (swarmSize - 1);
    }
    const gained = Math.floor(amount * multiplier);
    const newState = { ...state };
    newState.xp += gained;

    const newLvl = 1 + Math.floor(newState.xp / 1000);
    let evolved = false;
    if (newLvl > newState.level) {
      newState.level = newLvl;
      evolved = true;

      // Class evolution milestones
      if (newState.level >= 10 && newState.currentClass === "Cyber-Egg") {
        newState.currentClass = "Phantom";
      } else if (newState.level >= 20 && newState.currentClass === "Phantom") {
        newState.currentClass = "Spectre";
      } else if (newState.level >= 30 && newState.currentClass === "Spectre") {
        newState.currentClass = "Ghost-Protocol";
      }
    }

    return { state: newState, gained, evolved };
  }

  /**
   * Decays companion metabolic energy (HP) by a specified amount.
   */
  static decayHP(state: PetState, amount: number): PetState {
    return {
      ...state,
      hp: Math.max(0, state.hp - amount),
    };
  }

  /**
   * Restores companion energy (HP) e.g., during deep sleep or neural synching.
   */
  static restoreHP(state: PetState, amount: number): PetState {
    return {
      ...state,
      hp: Math.min(100, state.hp + amount),
    };
  }

  /**
   * Adjusts Swarm Trust (REP) rating between nominal boundaries.
   */
  static modifyREP(state: PetState, delta: number): PetState {
    return {
      ...state,
      rep: Math.max(0.0, Math.min(2.0, state.rep + delta)),
    };
  }
}
