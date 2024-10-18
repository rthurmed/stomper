import { Comp, GameObj, KaboomCtx, PosComp, Vec2 } from "kaplay";

export const chase = (k: KaboomCtx, obj: GameObj<PosComp>, accel: number = 2, offset: Vec2 = k.vec2(0, 0)): Comp => {
    return {
        id: "chase",
        require: ["area", "pos"],
        update() {
            this.pos = this.pos.lerp(obj.pos.add(offset), k.dt() * accel);
        }
    }
}