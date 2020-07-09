MAX_TIMEOUT = 1000;

function randomRange(min, max) {
    return min + Math.floor(Math.random()*(max-min+1));
}

function tryTo(description, callback) {
    for (let timeout = MAX_TIMEOUT; timeout > 0; timeout--) {
        if (callback()) {
            return;
        }
    }
    throw "Timeout when trying to " + description;
}

function shuffle(arr) {
    let temp, r;
    for (let i = 1; i < arr.length; i++) {
        r = randomRange(0, i);
        temp = arr[i];
        arr[i] = arr[r];
        arr[r] = temp;
    }
    return arr;
}

function rightPad(text_array) {
    let final_text = "";
    text_array.forEach(text => {
        text += "";
        for (let i = text.length; i < 10; i++) {
            text += " ";
        }
        final_text += text;
    });
    return final_text;
}
