import { PlayerStats, RaidState, RaidParticipant, BuffState, PlayerCommand, RaidBossState, Player } from '../types';
import { MonsterDef, MonsterActionDef } from '../data/monsters';
import { getSpellById } from '../data/spells';

export const rollDice = (count: number, sides: number = 6): number => {
    let total = 0;
    for (let i = 0; i < count; i++) {
        total += Math.floor(Math.random() * sides) + 1;
    }
    return total;
};

export const rollD100 = (): number => Math.floor(Math.random() * 100) + 1;

export const createEmptyBuffState = (): BuffState => ({
    defStage: 0,
    atkStage: 0,
    magicBarrier: 0,
    fubaha: 0,
    sleep: false,
    sleepTurns: 0,
    manusa: false,
    manusaTurns: 0,
    stun: false,
    magicAwaken: false,
    magicAwakenTurns: 0,
    charge: false,
    chargeTurns: 0,
    eerieLight: 0,
    eerieLightTurns: 0,
    saika: false,
    saikaTurns: 0,
    spellSeal: false,
    spellSealTurns: 0,
    banished: false,
    banishedTurns: 0
});

export const initRaidBoss = (monster: MonsterDef): RaidBossState => {
    return {
        id: monster.id,
        hp: monster.hp,
        maxHp: monster.hp,
        buffs: createEmptyBuffState(),
        lastActionId: null,
        consecutiveActionCount: 0,
        phase: 'A',
        actionHistory: []
    };
};

export const processRaidRound = (raid: RaidState, monsterDef: MonsterDef, allPlayers: Player[]): { newRaid: RaidState, roundLogs: string[] } => {
    let logs: string[] = [];
    const pushLog = (text: string) => logs.push(text);

    // Deep copy state to mutate
    let nextRaid = JSON.parse(JSON.stringify(raid)) as RaidState;

    // Sort participants by SPD
    const pKeys = Object.keys(nextRaid.participants).map(Number);
    let participantsArr = pKeys.map(k => ({ id: k, p: nextRaid.participants[k] }));

    // Boss SPD
    const bossSpd = monsterDef.spd;

    // Create execution order
    interface ExeItem {
        type: 'player' | 'boss';
        id?: number;
        spd: number;
    }

    let execOrder: ExeItem[] = participantsArr
        .filter(x => !x.p.isDead && !x.p.buffs.banished)
        .map(x => ({ type: 'player' as const, id: x.id, spd: x.p.stats.spd }));

    execOrder.push({ type: 'boss', spd: bossSpd });

    execOrder.sort((a, b) => b.spd - a.spd);

    // Helper to get player name
    const getPName = (pId: number) => {
        return allPlayers.find(p => p.id === pId)?.name || `Player${pId}`;
    };

    // Process Actions
    for (const actor of execOrder) {
        if (nextRaid.bossState.hp <= 0) break; // Boss dead

        if (actor.type === 'player') {
            const pId = actor.id!;
            const participant = nextRaid.participants[pId];
            const pName = getPName(pId);

            // Skip if dead or sleeping/stunned
            if (participant.isDead || participant.buffs.sleep || participant.buffs.stun) {
                if (participant.buffs.sleep) pushLog(`${pName}は眠っている…`);
                if (participant.buffs.stun) pushLog(`${pName}は動けない！`);
                continue;
            }

            const cmd = participant.command;
            if (!cmd) {
                pushLog(`[System] ${pName} did not submit command.`);
                continue;
            }

            if (cmd.type === 'defend') {
                pushLog(`${pName}は身を守っている。`);
                participant.cp += 0.25;
            } else if (cmd.type === 'attack') {
                pushLog(`${pName}の攻撃！`);
                const damage = Math.max(1, Math.floor(participant.stats.atk / 2) - Math.floor(monsterDef.def / 4) + rollDice(2, 6));
                nextRaid.bossState.hp -= damage;
                pushLog(`ボスに ${damage} のダメージ！`);
                participant.cp += 1.0;
            }
            // Magic/Item omitted for brevity in skeleton

        } else {
            // Boss Action
            if (nextRaid.bossState.buffs.sleep) {
                pushLog(`${monsterDef.name}は眠っている…`);
                continue;
            }

            pushLog(`${monsterDef.name}の攻撃！`);
            // Simplified boss attack targeting random living player
            const livingIds = pKeys.filter(k => !nextRaid.participants[k].isDead && !nextRaid.participants[k].buffs.banished);
            if (livingIds.length > 0) {
                const targetId = livingIds[Math.floor(Math.random() * livingIds.length)];
                const target = nextRaid.participants[targetId];
                const tName = getPName(targetId);

                const damage = Math.max(1, Math.floor(monsterDef.atk / 2) - Math.floor(target.stats.def / 4) + rollDice(2, 6));

                let finalDamage = target.command?.type === 'defend' ? Math.max(1, Math.floor(damage / 2)) : damage;

                target.hp -= finalDamage;
                pushLog(`${tName}に ${finalDamage} のダメージ！`);

                if (target.hp <= 0) {
                    target.hp = 0;
                    target.isDead = true;
                    pushLog(`${tName}は死んでしまった！`);
                }
            } else {
                pushLog(`しかし対象がいなかった！`);
            }
        }
    }

    // End of round: apply phase changes, tick buffs
    if (nextRaid.bossState.hp <= 0) {
        nextRaid.bossState.hp = 0;
        nextRaid.status = 'VICTORY';
    } else {
        const allDead = pKeys.every(k => nextRaid.participants[k].isDead || nextRaid.participants[k].buffs.banished);
        if (allDead) {
            nextRaid.status = 'DEFEAT';
        } else {
            nextRaid.round++;
            nextRaid.status = 'WAITING_FOR_COMMANDS';

            // Reset commands
            pKeys.forEach(k => {
                nextRaid.participants[k].command = null;
                // Simple buff tick...
            });
        }
    }

    return { newRaid: nextRaid, roundLogs: logs };
};
