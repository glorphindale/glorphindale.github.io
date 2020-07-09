class Monster {
    constructor(tile, sprite, hp) {
        this.move(tile);
        this.sprite = sprite;
        this.hp = hp;
        this.offset_x = 0;
        this.offset_y = 0;
        this.last_move = [-1, 0];

        this.teleport_counter = 2;
        this.bonus_attack = 0;
    }

    replace(new_monster_type) {
        this.tile.monster = new new_monster_type(this.tile);
        return this.tile.monster;
    }

    update() {
        if (this.teleport_counter > 0) {
            this.teleport_counter--;
        }

        if (this.stunned || this.teleport_counter > 0) {
            this.stunned = false;
            return;
        }
        this.doStuff();
    }

    doStuff() {
        let neighbors = this.tile.getPassableNeighbors();

        neighbors = neighbors.filter(t => !t.monster || t.monster.is_player);

        if (neighbors && neighbors.length > 0) {
            neighbors.sort((a, b) => a.dist(player.tile) - b.dist(player.tile));
            let direction = 0;
            if (this.fear_counter) {
                direction = neighbors.length-1;
                this.fear_counter--;
            }
            let new_tile = neighbors[direction];
            this.tryMove(new_tile.x - this.tile.x, new_tile.y - this.tile.y);
        }
    }

    drawHP() {
        for (let i = 0; i < this.hp; i++) {
            drawSprite(
                SPRITE_HEALTH,
                this.getDisplayX() + (i%3)*5/16,
                this.getDisplayY() + Math.floor(i/3)*(5/16)
            );
        }
    }

    getDisplayX() {
        return this.tile.x + this.offset_x;
    }
    getDisplayY() {
        return this.tile.y + this.offset_y;
    }

    draw() {
        if (this.teleport_counter) {
            drawSprite(SPRITE_PORTAL, this.getDisplayX(), this.getDisplayY());
        } else {
            drawSprite(this.sprite, this.getDisplayX(), this.getDisplayY());
            this.drawHP();
        }

        this.offset_x -= Math.sign(this.offset_x)*(1/8);
        this.offset_y -= Math.sign(this.offset_y)*(1/8);
    }

    tryMove(dx, dy) {
        let new_tile = this.tile.getNeighbor(dx, dy);
        if (new_tile.passable) {
            this.last_move = [dx, dy];
            if (!new_tile.monster) {
                this.move(new_tile);
            } else {
                if (this.is_player != new_tile.monster.is_player) {
                    this.attacked_this_turn = true;
                    new_tile.monster.stunned = true;
                    new_tile.monster.hit(1 + this.bonus_attack);
                    this.bonus_attack = 0;

                    shake_amount = 5;

                    this.offset_x = (new_tile.x - this.tile.x) / 2;
                    this.offset_y = (new_tile.y - this.tile.y) / 2;
                }
            }
            return true;
        } else {
            return false;
        }
    }

    hit(dmg) {
        if (this.is_player && this.shield) {
            return;
        }
        this.hp -= dmg;
        if (this.hp <= 0) {
            this.die();
        }

        if (this.is_player) {
            playSound("hit1");
        } else {
            playSound("hit2");
        }
    }

    heal(amount) {
        this.hp = Math.min(max_hp, this.hp + amount);
    }

    die() {
        this.dead = true;
        this.tile.monster = null;
    }

    move(tile) {
        if (this.tile) {
            this.tile.monster = null;

            this.offset_x = this.tile.x - tile.x;
            this.offset_y = this.tile.y - tile.y;
        }
        this.tile = tile;
        tile.monster = this;

        tile.stepOn(this);
    }
}

class Player extends Monster {
    constructor(tile) {
        super(tile, SPRITE_PLAYER, starting_hp);
        this.is_player = true;
        this.teleport_counter = 0;

        this.spells = shuffle(Object.keys(spells)).splice(0, num_spells);
    }

    draw() {
        super.draw();

        if (this.shield) {
            drawSprite(SPRITE_SHIELD, this.getDisplayX(), this.getDisplayY());
        }
    }

    tryMove(dx, dy) {
        if (super.tryMove(dx, dy)) {
            tick();
        }
    }

    die() {
        super.die();
        this.sprite = SPRITE_PLAYER_DEAD;
    }

    addSpell() {
        let new_spell = shuffle(Object.keys(spells))[0];
        this.spells.push(new_spell);
    }

    castSpell(index) {
        let spell_name = this.spells[index];
        if (spell_name) {
            delete this.spells[index];
            spells[spell_name]();
            playSound("spell");
            tick();
        }
    }

    update() {
        if (this.shield > 0) {
            this.shield--;
        }
    }
}

class Dodo extends Monster {
    constructor(tile) {
        super(tile, SPRITE_DODO, 2);
    }
}

class Lizard extends Monster {
    constructor(tile) {
        super(tile, SPRITE_LIZARD, 3);
    }

    doStuff() {
        this.attacked_this_turn = false;
        super.doStuff();

        if (!this.attacked_this_turn) {
            super.doStuff();
        }
    }
}

class Ecto extends Monster {
    constructor(tile) {
        super(tile, SPRITE_ECTO, 1);
    }

    doStuff() {
        let neighbors = this.tile.getNeighbors().filter(t => !t.passable && isInBounds(t.x, t.y));
        if (neighbors.length) {
            neighbors[0].replace(Floor);
            this.heal(0.5);
        } else {
            super.doStuff()
        }
    }
}

class Snake extends Monster {
    constructor(tile) {
        super(tile, SPRITE_SNAKE, 3);
    }

    update() {
        let started_stunned = this.stunned;
        super.update();
        if (!started_stunned) {
            this.stunned = true;
        }
    }
}

class Jester extends Monster {
    constructor(tile) {
        super(tile, SPRITE_JESTER, 2);
    }

    doStuff() {
        let neighbors = this.tile.getNeighborsDiagonal();
        neighbors = neighbors.filter(t => t.passable);
        if (neighbors) {
            neighbors.sort((a, b) => a.dist(player.tile) - b.dist(player.tile));
            let new_tile = neighbors[0];
            this.tryMove(new_tile.x - this.tile.x, new_tile.y - this.tile.y);
        }
    }
}
