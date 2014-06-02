// JavaScript Document

define(["./card", "./presets"], function(card, presets) {
	function supportDeck(faction, views, data) {
		this.faction = faction;
		this.cards = [
			card.create(data, faction),
			card.create(data, faction),
			card.create(data, faction)
		];
		this.cards[0].primary = true;		
		for (var i = 0; i < views.length; i++) {
			this.cards[i].view = views[i];
		}
	}
	
	supportDeck.prototype = {
		constructor: supportDeck,
		supportBoost: function(atkdef) {
			var total = 0;
			for (var c = 0; c < this.cards.length; c++) {
				if (atkdef) {
					total += (atkdef === "atk") ? parseInt(this.cards[c].data.atk) : parseInt(this.cards[c].data.def);	
				} else {
					total += Math.round(this.cards[c].stat);
				}
			}
			return Math.round(total*0.1);
		},
		
		procs: function(homeTeam, awayTeam, is_fixed) {
			var qualified_procs = [];
			var active_procs = [];
			var targetDeck;
			var qualified;
			for (var d = 0; d < this.cards.length; d++) {
				qualified = false;
				if (this.cards[d].mod > 1) {
					targetDeck = homeTeam;	
				} else {
					targetDeck = awayTeam;
				}
				if (this.cards[d].role() == this.faction || this.cards[d].role() == "Dual") {
					qualified = true;
				}
				if (qualified) {
					switch (this.cards[d].data.target) {
						case "All":
						case "Self": break;
						case "None": qualified = false; break;
						case "Hero":
						case "Heroes":
							qualified = false;
							for (var h = 0; h < targetDeck.cards.length; h++) {
								if (targetDeck.cards[h].data.hero) {
									qualified = true;	
								}
							}
							break;
						case "Villain":
						case "Villains":
							qualified = false;
							for (var v = 0; v < targetDeck.cards.length; v++) {
								if (!targetDeck.cards[v].data.hero || targetDeck.cards[v].data.hero == "0") {
									qualified = true;
								}
							}
							break;
						case "!Bruiser":
						case "!Speed":
						case "!Tactics":
							qualified = false;
							for (var m = 0; m < targetDeck.cards.length; m++) {
								if (targetDeck.cards[m].data.alignment !== this.cards[d].data.target.substring(1)) {
									qualified = true;	
								}
							}
							break;
						default:
							if (this.cards[d].data.type === "Degrade") {
								qualified = false;
								for (var e = 0; e < targetDeck.length; e++) {
									if (targetDeck.cards[e].data.alignment === this.cards[d].data.target) {
										qualified = true;
									}
								}
							} 
							break;
					}
				}
				if (qualified) {
					if (is_fixed) {
						if (/*this.cards[d].active && */this.cards[d].data.ability !== 0) {
							qualified_procs.push(d);
						}
					} else {
						if (this.cards[d].proc()) {
							qualified_procs.push(d);
						}
					}
				}
			}
			if (is_fixed) {
				active_procs = qualified_procs;
			} else {
				while (active_procs.length < 1) {
					active_procs.push(qualified_procs.shift());
				}
			}
			
			if (active_procs.length) {
				return active_procs;
			} else {
				return false;
			}
		},
		affect: function(mod, criteria) {
			mod = (mod * 100 / 2) / 100;
			var total = 0;
			if (Object.prototype.toString.call(criteria) === '[object Array]') {
				for (var c = 0; c < criteria.length; c++) {
					for (var d = 0; d < this.cards.length; d++) {
						if (this.cards[d].data.name.match(criteria[c])) {
							total += Math.round(this.cards[d].stat * mod - this.cards[d].stat);
							this.cards[d].stat *= mod;
							break
						}
					}
				}
			} else {
				switch (criteria) {
					case "All":
						for (var c = 0; c < this.cards.length; c++) {
							total += Math.abs(Math.round(this.cards[c].stat * mod - this.cards[c].stat));
							this.cards[c].stat *= mod;
						}
						break;
					case "Speed":
					case "Tactics":
					case "Bruiser":
						for (var c = 0; c < this.cards.length; c++) {
							if (this.cards[c].data.alignment == criteria) {
								total += Math.abs(Math.round(this.cards[c].stat * mod - this.cards[c].stat));
								this.cards[c].stat *= mod;
							}
						}
						break;
					case "!Bruiser":
					case "!Tactics":
					case "!Speed":
						criteria = criteria.substring(1);
						for (var c = 0; c < this.cards.length; c++) {
							if (this.cards[c].data.alignment !=	criteria) {
								total += Math.abs(Math.round(this.cards[c].stat * mod - this.cards[c].stat));
								this.cards[c].stat *= mod;	
							}
						}
						break;
					case "Villain":
					case "Villains":
						for (var c = 0; c < this.cards.length; c++) {
							if (!this.cards[c].data.hero || this.cards[c].data.hero == "0") {
								total += Math.abs(Math.round(this.cards[c].stat * mod - this.cards[c].stat));
								this.cards[c].stat *= mod;	
							}
						}
						break;
					case "Hero":
					case "Heroes":
						for (var c = 0; c < this.cards.length; c++) {
							if (this.cards[c].data.hero) {
								total += Math.abs(Math.round(this.cards[c].stat * mod - this.cards[c].stat));
								this.cards[c].stat *= mod;	
							}
						}
						break;
				}
			}
			return total;
		},
		
		qualify: function (vertical, values) {
			var qualify = true;
			switch (vertical) {
				case "sex":
					for (var a = 0; a < this.cards.length; a++) {
						if (this.cards[a].data.sex != values[0]) {
							qualify = false;
							break;
						}
					}
					break;
				case "hero":
					for (var b = 0; b < this.cards.length; b++) {
						if (this.cards[b].data.hero != values[0]) {
							qualify = false;
							break;	
						}
					}
					break;
				case "name":
					for (var c = 0; c < values.length; c++) {
						for (var d = 0; d < this.cards.length; d++) {
							if (this.cards[d].data.name.match(values[c])) {
								values[c] = "match";
								break;	
							}
						}
						if (values[c] != "match") {
							qualify = false;
							break;
						}
					}
					break;	
			}
			return qualify;
		},
	}
	
	return {
		create: function(f, d, c) {
			return new supportDeck(f, d, c);	
		}
	}	
});