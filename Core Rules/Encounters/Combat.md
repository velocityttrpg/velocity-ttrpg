# Combat

## What Combat Is

Combat is a structured scene resolved through Opposition Checks. There are no guaranteed hits, no passive defenses, and no separate hit-point-attrition subsystem. Every offensive and defensive action is a contested roll — attacker versus defender — and the outcome of each exchange is always uncertain until the dice land.

Combat begins when the Narrator determines that timing, danger, or opposition requires structured turns. Everything between that moment and the resolution of the conflict follows the rules in this section and its referenced documents.

## Structure of a Combat Encounter

A combat encounter proceeds in three phases:

1. **Opening** — The Narrator privately determines which side acts first (see [Turn Order](Turn%20Order.md) §3). If the Element of Surprise applies, a surprise round occurs before the first standard round (see [Turn Order](Turn%20Order.md) §5).
2. **Rounds** — Each round, one side completes all of its turns before the other side begins. Within a side, participants choose their own acting order at the start of each round. Rounds continue until the encounter ends.
3. **Resolution** — The encounter ends when all hostile participants are defeated, incapacitated, or withdrawn; one side surrenders or ceases hostilities; or the Narrator determines the conflict has resolved (see [Encounter Structure](Encounter%20Structure.md)).

## Action Points

Each participant receives **3 Action Points (AP)** at the start of their turn. AP is spent on everything — attacks, movement, maintaining Concentration, and Reactions. Unspent AP do not carry over.

The standard AP costs are:

1. Standard actions (attacks, abilities, maneuvers): 1–3 AP as listed in the action's description.
2. Movement: 1 AP grants a full base movement pool (see [Movement](Movement.md)).
3. Concentration maintenance: 1 AP per round, paid before anything else (see [Concentration](Concentration.md) §2).
4. Reactions: 1 AP, taken outside the participant's turn on a trigger. Maximum 1 per round unless a rule says otherwise (see [Reactions](Reactions.md)).

See [Turn Structure](Turn%20Structure.md) for full turn rules and [Actions](Actions.md) for a complete list of action types.

## Making an Attack

All attacks are Opposition Checks (see [Opposition Checks](Opposition%20Checks.md)).

**Assembling the attack roll:** the attacker's dice pool comes from skills that explicitly grant attack dice, plus a flat bonus from the relevant attribute:

1. Melee attacks use **Strength**.
2. Ranged attacks use **Strength**.
3. Magical attacks use **Willpower**.

**The defender responds** with their own dice pool and attribute bonus, choosing one defensive option:

1. Against melee or ranged attacks: **Dodge** (dice pool + Reflex), **Parry** (dice pool + Reflex), or **Block** (dice pool + Reflex).
2. Against physical or elemental spells (fire, lightning, force, cold, and similar): **Dodge only**. Parry and Block cannot deflect magic.
3. Against mind-affecting spells (charm, compulsion, illusion, fear, and similar): **Willpower resistance** (dice pool + Willpower). Physical defenses are unavailable.

**Resolving the exchange:**

1. If the attacker's total exceeds the defender's total, the attack hits.
2. If the totals are equal, the exchange is a stalemate — neither side gains the upper hand. Narrate accordingly.
3. If the defender's total exceeds the attacker's total, the attack fails.
4. If the defender cannot make a defensive roll at all (Vulnerable, Stunned, Unconscious, Incapacitated, or out of AP for a Reaction), the attack hits automatically. Armor mitigation still applies.

See [Actions](Actions.md) §8 for the full attack resolution rules, including defender restrictions and simultaneous-attack tiebreaking.

## Damage

On a hit, the attacker rolls for damage immediately.

1. **Base damage** is determined by the specific weapon — see [Weapons](../Equipment/Weapons.md) for each weapon's die. Unarmed attacks have no base die — damage is Strength bonus only.
2. **Attribute bonus damage:** +1 die (same size as the weapon die) per 3 points of Strength for melee and ranged attacks, or per 3 points of Willpower for magical attacks.
3. **Skill bonus damage:** as explicitly granted by applicable skills.
4. **Armor mitigation:** the defender subtracts their armor's mitigation value from the total. Mitigation applies after all damage dice are summed.

See [Damage](Damage.md) for the full damage rules. See [Armor](../Equipment/Armor.md) for mitigation values by armor category.

## Spellcasting in Combat

Casting a spell costs the caster Health equal to the spell's level (Level 0 costs nothing; a 9th-level spell costs 9 Health). This cost is never reduced by skill investment. Casting 3rd-level spells and above recklessly in quick succession may draw supernatural attention — the nature of that attention depends on the campaign setting. See [Magic Attack](../Skills/Universal/Combat/Magic%20Attack.md).

## Conditions

Combat regularly imposes conditions on participants — Dying, Prone, Hindered, Stunned, Bleeding Out, Frightened, and others. Each condition has specific mechanical effects and defined removal triggers. See [Conditions](Conditions.md) for the full list.

## Dying and Death

When a character's Health falls to or below their **wounded threshold** (half their Vitality, rounded up — 13 Health at base Vitality 25), they enter the Wounded condition and begin Bleeding Out. When Health falls further to or below their **dying threshold** (one quarter of their Vitality, rounded up — 7 Health at base Vitality 25), they enter the Dying condition: −2 on all Opposition Checks, movement reduced by 5 ft, Consciousness Checks on incoming damage. Reaching 0 Health means death.

See [Dying](../Characters/Dying.md), [Stabilization](../Characters/Stabilization.md), and [Death](../Characters/Death.md).
