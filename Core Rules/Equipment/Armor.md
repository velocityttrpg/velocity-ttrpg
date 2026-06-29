# Armor

## Combat flow

1. Resolve hit chance (see Hit Resolution).	
2. If the attack hits, roll damage.	
3. Apply all armor mitigation.	
4. If mitigation reduces damage to 0 or below, the defender takes 0 damage.	
5. If damage remains after mitigation, apply it to the defender's Health.

## Hit resolution

1. An attack is resolved as an Opposition Check (see Opposition Checks). The attacker rolls their dice pool against the defender's chosen defense.
2. An attack fails when the defender wins the Opposition Check. This may represent:
	1. a parry	
	2. a dodge	
	3. a block	
	4. a mistimed or poorly-aimed strike	
3. The Narrator or rules text may introduce additional failure conditions beyond those listed above.
4. If the attacker wins the Opposition Check, the attack hits.

## Damage resolution

1. When an attack hits, the attacker rolls damage.
2. The defender applies all relevant armor mitigation.
3. If mitigation reduces damage to 0 or below, the defender takes 0 damage.
4. If mitigation doesn't reduce damage to 0, the remaining damage is applied to the defender's Health.

## Armor

1. Armor provides flat damage mitigation.
2. Armor doesn't modify hit chance.
3. Armor is applied to every hit unless a rule states otherwise.
4. Armor values may come from:
	1. Worn armor
	2. Natural armor
	3. Temporary effects
	4. Abilities or traits
5. Multiple sources of armor stack unless a rule specifies a cap or exception.

## What Armor Protects Against

Armor mitigates damage from physical attacks only.

**Mitigated:**
1. Mundane weapons — slashing, piercing, and bludgeoning damage from non-magical weapons.
2. Natural attacks — claws, teeth, unarmed strikes, and similar physical attacks from any creature.

**Not mitigated (armor provides no benefit against):**
1. Magic weapons — weapons with magical properties or enhancements bypass armor entirely, regardless of damage type.
2. Spells — all magical effects bypass armor.
3. Magical creature abilities — breath weapons, supernatural attacks, and similar abilities bypass armor.
4. Environmental hazards — toxic atmosphere, extreme temperatures, poison, and similar threats bypass armor.

## Natural armor

1. Natural armor functions identically to worn armor.
2. Natural armor is always active unless suppressed by a specific effect.
3. Large or resilient creatures may have high natural armor values.

## Armor and Health

1. Armor reduces incoming damage before health is lost.
2. High armor reduces the need for high health pools.
3. Health represents biological endurance, not avoidance.

## Armor Types

1. Worn armor is grouped into three categories — Light, Medium, and Heavy — each with its own skill tree (see [Light Armor](../Skills/Universal/Combat/Light Armor.md), [Medium Armor](../Skills/Universal/Combat/Medium Armor.md), [Heavy Armor](../Skills/Universal/Combat/Heavy Armor.md)).
2. Each armor item provides its own flat mitigation value. Trained mitigation applies when the character has at least tier I in the matching skill tree; untrained mitigation applies when they do not. A character wearing no armor receives no mitigation at all.
3. Wearing armor without the matching skill training imposes the following untrained wear penalties by category:
    1. **Light** — no additional penalties. The mitigation reduction (trained vs. untrained column) is the only cost.
    2. **Medium** — −2 to Stealth Opposition Checks.
    3. **Heavy** — −2 to Reflex-based Opposition Checks, −5 ft per AP spent on movement, and −4 to Stealth Opposition Checks.
4. These penalties are removed by investing in the matching armor skill tree. See each tree for which skill removes which penalty.
5. Sizes follow [Inventory](Inventory.md) §2. Costs are ported from d20 source material in gold pieces (gp) and have no effect on inventory slots — see [Currency](Currency.md) for the currency note.

| Category | Item            | Size   |     Cost | Mitigation (trained) | Mitigation (untrained) |
| :------- | :-------------- | :----- | -------: | -------------------: | ---------------------: |
| Light    | Padded armor    | Medium |     5 gp |                    2 |                      1 |
| Light    | Leather armor   | Medium |    10 gp |                    3 |                      2 |
| Light    | Studded leather | Medium |    25 gp |                    5 |                      3 |
| Medium   | Hide armor      | Large  |    15 gp |                    8 |                      4 |
| Medium   | Chain shirt     | Medium |    50 gp |                   10 |                      5 |
| Medium   | Scale mail      | Large  |    50 gp |                   12 |                      6 |
| Heavy    | Chain mail      | Large  |   150 gp |                   14 |                      7 |
| Heavy    | Splint armor    | Large  |   200 gp |                   16 |                      8 |
| Heavy    | Plate armor     | Large  | 1,500 gp |                   18 |                      9 |

5. **Shields**, if used, are a separate worn item from body armor and grant their own mitigation or defensive bonus as specified by the Narrator or a relevant skill — they are not covered by the table above.
5. The mitigation values above are a first draft intended for playtesting, in keeping with [Weapons](Weapons.md)'s draft status. They're expected to be tuned once tested against Velocity's damage dice scale (base die + attribute/skill bonus dice).
