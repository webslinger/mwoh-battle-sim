define(function() {
	function Encounter() {
		this.adapter = false;
		this.position = false;
		this.scrapper = false;
		this.supportAbility = false;
		this.supportBoost = false;
		this.ability1 = false;
		this.ability2 = false;
		this.ability3 = false;
		this.win = false;
		this.combo = false;
		this.total = 0;
	}
	
	Encounter.prototype = {
		constructor: Encounter,
		addAbility: function(ability) {
			if (!this.ability1) {
				this.ability1 = ability; 
			} else if (!this.ability2) {
				this.ability2 = ability; 
			} else {
				this.ability3 = ability;
			}	
		},
		getAbilities: function() {
			var abilities = [];
			if (!this.ability1) {
				return false;
			} else {
				abilities.push(this.ability1);
				if (!this.ability2) {
					return abilities;
				} else {
					abilities.push(this.ability2);
					if (!this.ability3) {
						return abilities;
					} else {
						abilities.push(this.ability3);
						return abilities;
					}
				}
			}
		}
	}
	
	return {
		create: function() {
			return new Encounter();	
		}
	}
});