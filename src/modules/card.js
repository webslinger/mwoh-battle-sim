/*
    This file defines the card object, its properties and methods.
 */

define(function() {
	function Card(data, faction) {
		this.base_stat;
		this.stat;
		this.faction = faction;
		this.data = data;
		this.view;
		this.skill = 1;
		this.active = false;
		this.primary = false;		
		if (faction === "offense") {
			this.base_stat = this.data.atk;
			this.stat = this.base_stat;
		} else {
			this.base_stat = this.data.def;
			this.stat = this.base_stat;
		}		
	}
		
	Card.prototype = {
		constructor: Card,
        // determine if this card is offensive or defensive, or both.
		role: function() {
			var scope = this.data.scope;
			var ability = this.ability();
			var role;
			if (scope === "ATKDEF") {
				role = "Dual";
			} else if (scope === "ATK") {
				role = (ability > 1) ? "offense" : "defense";
			} else {
				role = (ability > 1) ? "defense" : "offense";
			}
			return role;
		},
        // update the stats of the card (after receiving boost/degrade)
		update: function(data) {
			this.data = data;
			if (this.faction === "offense") {
				this.stat = data.atk;
				this.base_stat = data.atk;	
			} else {
				this.stat = data.def;
				this.base_stat = data.def;
			}
			return this.data.id;
		},
        // switches data, effectively switching cards.
		swap: function(data) {
			var oldData = this.data;
			this.data = data;
			return oldData;	
		},
        // return card to base stats
		reboot: function() {
			this.stat = this.base_stat;
		},
        // determine if the card's ability will proc
		proc: function() {
			var chance = parseInt(this.data.frequency);
			if (this.primary) {
				chance *= 1.275;	
			}
			if (this.skill > 1) {
				chance += (this.skill-1);
			}
			if ((Math.random() * 100) <= chance) {
				return true;
			}
			return false;
		},
        // determine the card ability's strength based on level and type.
		ability: function() {
			var ability = parseInt(this.data.ability);
			if (ability != 0) {
				if (parseInt(this.skill) === 10) {
					ability += (this.data.modifier * 10);	
				} else {
					ability += (this.data.modifier * (this.skill-1));
				}
				ability /= 100;
				ability += 1;
				if (this.data.type === "Degrade") {
					ability -= 2;
					ability = Math.abs(ability);
				}
				return ability.toFixed(2);
			}
			return 1;
		},
        // self boost is its own beast
		boostSelf: function() {
			var stat = this.stat;
			this.stat *= this.ability();
			return (Math.round(this.stat - stat));
		}		
	}
	
	return {
		create: function(d, f) {
			return new Card(d, f);	
		}
	}
});