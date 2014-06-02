define(function() {
	var off_presets = [];
	var def_presets = [];
	
	function matchId(presets, id) {
		for (var i = 0; i < presets.length; i++) {
			if (presets[i].id === id) {
				return presets[i].cards;	
			}
		}
	}
	
	return {
        // set the offensive and defensive presets
		set: function(off, def) {
			off_presets = off;
			def_presets = def;
		},

        // get offensive preset
		getOffense: function(id) {
			id = parseInt(id);
			return matchId(off_presets, id);			
		},

        // get defensive preset
		getDefense: function(id) {
			id = parseInt(id);
			return matchId(def_presets, id);
		},

        // add preset to presets
		pushPreset: function(dest, preset) {
			if (dest === "offense") {
				off_presets.push(preset);
			} else {
				def_presets.push(preset);
			}
		},

        // probably not used anymore
		debugPresets: function() {
			return off_presets;	
		}
	}
})