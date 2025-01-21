import { AbilitySaveFail } from "../fails.js";
import {
  AbilityCheckMessage,
  AbilitySaveMessage,
  AttackMessageV2,
  ConcentrationMessage,
  DamageMessageV2,
  DeathSaveMessage,
  SkillMessage,
  AccuracyMessageV2,
} from "../messages.js";
import {
  AttackReminderV2,
  AbilityCheckReminder,
  AbilitySaveReminder,
  CriticalReminderV2,
  DeathSaveReminder,
  SkillReminder,
  AccuracyReminder,
} from "../reminders.js";
import {
  AbilityCheckSource,
  AbilitySaveSource,
  AttackSourceV2,
  ConcentrationSource,
  CriticalSourceV2,
  DeathSaveSource,
  SkillSource,
  AccuracySource,
} from "../sources.js";
import { showSources } from "../settings.js";
import { debug, getDistanceToTargetFn, getTarget } from "../util.js";

/**
 * Setup the dnd5e.preRoll hooks for use with the core roller.
 */
export default class CoreRollerHooks {
  /**
   * If true, check armor for stealth checks.
   * @type {boolean}
   */
  checkArmorStealth;

  /**
   * Initialize the hooks.
   */
  init() {
    // DAE version 0.8.81 added support for "impose stealth disadvantage"
    this.checkArmorStealth = !game.modules.get("dae")?.active;
    debug("checkArmorStealth", this.checkArmorStealth);

    // register all the dnd5e.pre hooks
    Hooks.on("dnd5e.preRollAttackV2", this.preRollAttackV2.bind(this));
    Hooks.on("dnd5e.preRollAbilitySave", this.preRollAbilitySave.bind(this));
    Hooks.on("dnd5e.preRollConcentration", this.preRollConcentration.bind(this));
    Hooks.on("dnd5e.preRollAbilityTest", this.preRollAbilityTest.bind(this));
    Hooks.on("dnd5e.preRollSkill", this.preRollSkill.bind(this));
    Hooks.on("dnd5e.preRollToolCheck", this.preRollToolCheck.bind(this));
    Hooks.on("dnd5e.preRollDeathSave", this.preRollDeathSave.bind(this));
    Hooks.on("dnd5e.preRollDamageV2", this.preRollDamageV2.bind(this));
    Hooks.on("dnd5e.preRollV2", this.preRollV2.bind(this));
  }

  /**
   * Returns a boolean to tell whether or not to handle Midi's flags
   * @returns true to register a hook to handle Midi's flags, false otherwise
   */
  shouldApplyMidiActiveEffect() {
    return true;
  }

  preRollAttackV2(config, dialog, message) {
    debug("preRollAttackV2 hook called", config, dialog, message);

    if (this.isFastForwarding(config, dialog)) return;
    const target = getTarget();
    const distanceFn = getDistanceToTargetFn(message.data.speaker);
    const activity = config.subject;

    new AttackMessageV2(activity.actor, target, activity).addMessage(dialog);
    if (showSources) new AttackSourceV2(activity.actor, target, activity, distanceFn).updateOptions(dialog);
    new AttackReminderV2(activity.actor, target, activity, distanceFn).updateOptions(config.rolls[0].options);
  }

  preRollAbilitySave(actor, config, abilityId) {
    debug("preRollAbilitySave hook called");

    const failChecker = new AbilitySaveFail(actor, abilityId);
    if (failChecker.fails(config)) return false;

    if (this.isFastForwarding(config)) return;

    new AbilitySaveMessage(actor, abilityId).addMessage(config);
    if (showSources) new AbilitySaveSource(actor, abilityId).updateOptions(config);
    new AbilitySaveReminder(actor, abilityId).updateOptions(config);
  }

  preRollConcentration(actor, options) {
    debug("preRollConcentration hook called");

    if (this.isFastForwarding(options)) return;

    new ConcentrationMessage(actor, options.ability).addMessage(options);
    if (showSources) new ConcentrationSource(actor, options.ability).updateOptions(options);
    // don't need a reminder, the system will set advantage/disadvantage
  }

  preRollAbilityTest(actor, config, abilityId) {
    debug("preRollAbilityTest hook called");

    if (this.isFastForwarding(config)) return;

    new AbilityCheckMessage(actor, abilityId).addMessage(config);
    if (showSources) new AbilityCheckSource(actor, abilityId).updateOptions(config);
    new AbilityCheckReminder(actor, abilityId).updateOptions(config);
  }

  preRollSkill(actor, config, skillId) {
    debug("preRollSkill hook called");

    if (this.isFastForwarding(config)) return;

    const ability = config.data.defaultAbility;
    new SkillMessage(actor, ability, skillId).addMessage(config);
    if (showSources) new SkillSource(actor, ability, skillId, true).updateOptions(config);
    new SkillReminder(actor, ability, skillId, this.checkArmorStealth).updateOptions(config);
  }

  preRollToolCheck(actor, config, toolId) {
    debug("preRollToolCheck hook called");

    if (this.isFastForwarding(config)) return;

    const ability = config.data.defaultAbility;
    new AbilityCheckMessage(actor, ability).addMessage(config);
    if (showSources) new AbilityCheckSource(actor, ability).updateOptions(config);
    new AbilityCheckReminder(actor, ability).updateOptions(config);
  }

  preRollDeathSave(actor, config) {
    debug("preRollDeathSave hook called");

    if (this.isFastForwarding(config)) return;

    new DeathSaveMessage(actor).addMessage(config);
    if (showSources) new DeathSaveSource(actor).updateOptions(config);
    new DeathSaveReminder(actor).updateOptions(config);
  }

  preRollDamageV2(config, dialog, message) {
    debug("preRollDamageV2 hook called", config, dialog, message);

    if (this.isFastForwarding(config, dialog)) return;
    const target = getTarget();
    const distanceFn = getDistanceToTargetFn(message.data.speaker);
    const activity = config.subject;

    new DamageMessageV2(activity.actor, target, activity).addMessage(dialog);
    if (showSources) new CriticalSourceV2(activity.actor, target, activity, distanceFn).updateOptions(dialog);
    const reminder = new CriticalReminderV2(activity.actor, target, activity, distanceFn);
    config.rolls.forEach(roll => reminder.updateOptions(roll.options, "isCritical"));
  }

  preRollV2(config, dialog, message) {
    debug("preRollV2 hook called");

    if (this.isFastForwarding(config, dialog)) return;
    const target = getTarget();
    const distanceFn = getDistanceToTargetFn(message.data.speaker);
    const activity = config.subject;

    if (activity.identifier != "accuracy") return;

    new AccuracyMessageV2(activity.actor, target, activity).addMessage(dialog);
    if (showSources) new AccuracySource(activity.actor).updateOptions(config);
    new AccuracyReminder(activity.actor).updateOptions(config);
  }
  /**
   * Check if we should fast-forward the roll by checking the fastForward flag
   * and if one of the modifier keys was pressed.
   * @param {object} options
   * @param {boolean} [options.fastForward] a specific fastForward flag
   * @param {Event} [options.event] the triggering event
   * @param {object} dialog
   * @param {boolean} [dialog.configure] whether or not to show the dialog
   * @returns {boolean} true if they are fast-forwarding, false otherwise
   */
  isFastForwarding({ fastForward = false, event = {} }, { configure = true } = {}) {
    const isFF = !!(
      fastForward ||
      !configure ||
      dnd5e.utils.areKeysPressed(event, "skipDialogNormal") ||
      dnd5e.utils.areKeysPressed(event, "skipDialogAdvantage") ||
      dnd5e.utils.areKeysPressed(event, "skipDialogDisadvantage")
    );
    if (isFF) debug("fast-forwarding the roll, stop processing");
    return isFF;
  }
}
