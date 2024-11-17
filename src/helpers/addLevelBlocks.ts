import { Comp, CompList, GameObj, KaboomCtx, LevelOpt, Vec2 } from "kaplay";

interface AddLevelBlocksOpt {
    key: string;
    tileWidth: number;
    tileHeight: number;
    sprite: string;
    comps: CompList<any>;
}

export function addLevelBlocks(k: KaboomCtx, root: GameObj, map: string[], options: AddLevelBlocksOpt): CompList<any> {
    const { key, tileWidth, tileHeight, sprite, comps } = options;
    const objs = [];

    // TODO: also compute vertically (flood fill?)

    for (let i = 0; i < map.length; i++) {
        const cols = map[i];
        const groups: number[][] = [];
        
        let lastOneMatches = false;
        let group: number[] = [];
        
        for (let j = 0; j < cols.length; j++) {
            const col = cols[j];
            const match = col === key;
            if (match) {
                group.push(j);
            }
            if (!match && lastOneMatches) {
                groups.push(group);
                group = [];
            }
            lastOneMatches = match;
        }

        for (let j = 0; j < groups.length; j++) {
            const group = groups[j];
            const firstX = group[0];
            const lastX = group[group.length - 1];
            const size = lastX - firstX + 1;
            const obj = root.add([
                k.pos(firstX * tileWidth, i * tileHeight),
                k.area({
                    shape: new k.Rect(k.vec2(0, 0), size * tileWidth, tileHeight)
                }),
                k.sprite(sprite, {
                    tiled: true,
                    width: size * tileWidth,
                    height: tileHeight,
                }),
                ...comps
            ]);
            objs.push(obj);
        }
    }

    return objs;
}
