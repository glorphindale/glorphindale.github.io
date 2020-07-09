function setupCanvas() {
    canvas = document.querySelector("canvas");
    canvas.width = tile_size * (num_tiles + ui_width);
    canvas.height = tile_size * num_tiles;
    canvas.style.width = canvas.width + 'px';
    canvas.style.height = canvas.height + 'px';

    ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = false;
}

function drawSprite(sprite, x, y) {
    ctx.drawImage(
        spritesheet,
        sprite*16, 0, 16, 16,
        x*tile_size + shake_x,
        y*tile_size + shake_y,
        tile_size,
        tile_size
    );
}

function drawText(text, size, centered, textY, color) {
    ctx.fillStyle = color;
    ctx.font = size + "px monospace";
    let textX;
    if (centered) {
        textX = (canvas.width - ctx.measureText(text).width)/2;
    } else {
        textX = canvas.width - ui_width*tile_size + 25;
    }

    ctx.fillText(text, textX, textY);
}

function draw() {
    if (game_state == "running" || game_state == "dead") {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        screenshake();

        for (let i = 0; i < num_tiles; i++) {
            for (let j = 0; j < num_tiles; j++) {
                let tile = getTile(i, j);
                tile.draw();
            }
        }
        for (let i = 0; i < monsters.length; i++) {
            monsters[i].draw();
        }
        player.draw();
        // We need to make a second pass because we need to draw effects over the monsters
        for (let i = 0; i < num_tiles; i++) {
            for (let j = 0; j < num_tiles; j++) {
                let tile = getTile(i, j);
                tile.drawEffect();
            }
        }

        drawText("Level: " + level, 30, false, 30, "white");
        drawText("Score: " + score, 30, false, 60, "white");

        for (let i = 0; i < player.spells.length; i++) {
            let spell_text = (i+1) + ") " + (player.spells[i] || "");
            drawText(spell_text, 20, false, 90 + i * 20, "aqua");
        }
    }

    if (game_state == "dead") {
        drawText("YOU DIED", 30, false, 180, "RED");
    }
}

function screenshake() {
    if (shake_amount) {
        shake_amount--;
    }

    let shake_angle = Math.random() * Math.PI * 2;
    shake_x = Math.round(Math.cos(shake_angle) * shake_amount * 0.3);
    shake_y = Math.round(Math.sin(shake_angle) * shake_amount * 0.3);
}

function drawScores() {
    let scores = getScores();
    if (scores.length == 0) {
        return;
    }

    drawText(
        rightPad(["RUN", "SCORE", "TOTAL"]),
        18,
        true,
        canvas.height/2 - 30,
        "white"
    );

    let newest_score = scores.pop();
    scores.sort(function(a, b) {
        return b.total_score - a.total_score;
    });

    scores.unshift(newest_score);

    for (let i = 0; i < Math.min(10, scores.length); i++) {
        let score_text = rightPad([scores[i].run, scores[i].score, scores[i].total_score]);
        drawText(
            score_text,
            18,
            true,
            canvas.height/2 - 30 + 24 + i*34,
            i == 0 ? "orange" : "white"
        );
    }
}

function tick() {
    for (let k = monsters.length-1; k >= 0; k--) {
        if (!monsters[k].dead) {
            monsters[k].update();
        } else {
            monsters.splice(k, 1);
        }
    }
    player.update();
    if (player.dead) {
        addScore(score, false);
        game_state = "dead";
    }

    spawn_counter--;
    if (spawn_counter <= 0) {
        spawnMonster();
        spawn_counter = spawn_rate;
        spawn_rate--;
    }

}

function placePlayer() {
    return new Player(getRandomPassableTile());
}

function showTitle() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawText("SUPER", 40, true, canvas.height/2 - 220, "red");
    drawText("BROUGH BROS.", 70, true, canvas.height/2 - 150, "white");

    drawText("Press any key to start", 30, true, canvas.height/2 - 110, "white");

    drawScores();

    game_state = "title";
}

function startGame() {
    level = 1;
    score = 0;
    x = y = 0;
    num_spells = 2;

    startLevel(starting_hp, false);
    game_state = "running";
}

function startLevel(player_hp, player_spells) {
    spawn_rate = 15;
    spawn_counter = spawn_rate;

    generateLevel();

    num_spells++;
    player = placePlayer();
    player.hp = player_hp;
    if (player_spells) {
        player.spells = player_spells;
    }
        
    getRandomPassableTile().replace(Exit);
}

function getScores() {
    if (localStorage["scores"]) {
        return JSON.parse(localStorage["scores"]);
    } else {
        return [];
    }
}

function addScore(new_score, won) {
    let scores = getScores();
    let score_obj = {score: score, run: 1, total_score: score, active: won};
    let last_score = scores.pop();

    if (last_score) {
        if (last_score.active) {
            score_obj.run = last_score.run + 1;
            score_obj.total_score += last_score.total_score;
        } else {
            scores.push(last_score);
        }
    }

    scores.push(score_obj);

    localStorage["scores"] = JSON.stringify(scores);
}

function initSounds() {
    sounds = {
        hit1: new Audio("sounds/player_hit.wav"),
        hit2: new Audio("sounds/monster_hit.wav"),
        treasure: new Audio("sounds/treasure.wav"),
        new_level: new Audio("sounds/new_level.wav"),
        spell: new Audio("sounds/spell.wav")
    };
}

function playSound(sound_name) {
    sounds[sound_name].current_time = 0;
    sounds[sound_name].play();
}
