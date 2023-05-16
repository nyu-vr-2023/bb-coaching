let savedPresets = [];

export function loadPresets(){
    return savedPresets;
}

export function savePreset(playersList){
    let playerPresetList = [];
    for (let i = 0; i < 5; i++) {
        var playerPreset = {
            directions : structuredClone(playersList[i].directions),
            positions : structuredClone(playersList[i].positions),
            startTimeList : structuredClone(playersList[i].startTimeList),
            endTimeList : structuredClone(playersList[i].endTimeList)
        }
        playerPresetList.push(playerPreset);
    }
    var preset = {players : playerPresetList};

    // save to an array only
    savedPresets.push(preset);
    // console.log(preset);
}
