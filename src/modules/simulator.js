/* 
	This file defines the Simulator object which is primarily responsible for running battle simulations
	and housing deck objects, and session objects. It also is responsible for working with the card 
	catalogue, e.g. filtration.
*/

define(["./encounter","./session", "./deck", "./presets"], function (encounter, session, deck, presets) {
	
	function Simulator(cards, offense, defense) {
		this.cards = cards;
		this.offenseSession = session.create();
		this.defenseSession = session.create();
		this.offense = deck.create("offense", offense, this.cards[0]);
		this.defense = deck.create("defense", defense, this.cards[0]);
		this.fixed_ob = 3;
		this.fixed_db = 3;
		for (var i = 0; i < 3; i++) {
			this.offense.cards[i].active = true;
			this.defense.cards[i].active = true;
		}
	}
	
	Simulator.prototype = {
		constructor: Simulator,
		battle: function(blocking, is_fixed) {
			var fixed_o = encounter.create(), fixed_d = encounter.create(),
				offenseCache = this.offenseSession.cache, defenseCache = this.defenseSession.cache, 
				type, ability, target, dcombo = false, ocombo = false, oprocs = false, dprocs = false, calculate = true;
			
			/* determine variable factors (procs, combos) */
			oprocs = this.offense.procs(blocking, this.defense.cards, is_fixed);
			dprocs = this.defense.procs(blocking, this.offense.cards, is_fixed);
			
			if (is_fixed) {
				ocombo = (this.offense.combo_enabled) ? this.offense.combo() : false;
				dcombo = (this.defense.combo_enabled) ? this.defense.combo() : false;
			} else {
				if (this.offense.comboProc()) {
					if (offenseCache.combo) {
						ocombo = offenseCache.combo;	
					} else {
						ocombo = this.offense.combo();
					}
				} else {
					ocombo = false;
				}
				if (this.defense.comboProc()) {
					if (defenseCache.combo) {
						dcombo = defenseCache.combo;
					} else {
						dcombo = this.defense.combo();
					}
				} else {
					dcombo = false;
				}
			}		
			
			// if this is an automated battle, check if we've done it before,
			// by comparing variable factors, and if we have done it before
			// skip all the calculating and load the end result from cache
			if (!is_fixed && offenseCache.data) {
				// for each dataset in the cache
				for (var p = 0; p < offenseCache.data.length; p++) {
					// if the # of procs for this encounter match those in a dataset
					if (offenseCache.data[p].procs.length === oprocs.length) {
						// and the datasets are the same
						if (oprocs.toString() === offenseCache.data[p].procs.toString()) {
							// and the combos are the same
							if (ocombo.toString() === offenseCache.data[p].combo.toString()) {
								// we don't have to do anything
								calculate = false;
							} else {
								continue;
							}
						}
					}
					// but the defense has to be the same too, because it can affect the offense
					// so we check the defense too (if the offense was a match)
					if (!calculate && defenseCache.data[p].procs.length === dprocs.length) {
						if (dprocs.toString() !== defenseCache.data[p].procs.toString()) {
							calculate = true;
							continue;
						} else {
							if (dcombo.toString() !== defenseCache.data[p].combo.toString()) {
								calculate = true;	
								continue;
							}
						}
					} else {
						calculate = true;
						continue;
					}
					// if both have matched (then calculate has remained set to false)
					if (!calculate) {
						fixed_o = offenseCache.data[p].encounter;
						fixed_d = defenseCache.data[p].encounter;
						for (var oc = 0; oc < oprocs.length; oc++) {
							this.offenseSession.cards.push(this.offense.cards[oprocs[oc]].view);	
						}
						this.offenseSession.procs.push(oprocs);
						for (var dc = 0; dc < dprocs.length; dc++) {
							this.defenseSession.cards.push(this.defense.cards[dprocs[dc]].view);	
						}
						this.defenseSession.procs.push(dprocs);
						this.offenseSession.evaluate(fixed_o, fixed_d);
						this.defenseSession.evaluate(fixed_d, fixed_o);
						break;
					}
				}
				if (!calculate) {
					return [this.offenseSession, this.defenseSession];	
				}			
			}
			
			// if we got here, it wasn't cached or this is a fixed battle
	
			/* offense initials */
			fixed_o.adapter = (this.offense.use_adapter) ? this.offense.adapterReaction() : 0;
			fixed_o.position = this.offense.affect(this.offense.position, "All");
			fixed_o.scrapper = this.offense.affect(this.offense.scrapper, "All");
			
			/* defense initials */
			fixed_d.adapter = (this.defense.use_adapter) ? this.defense.adapterReaction() : 0;
			fixed_d.position = this.defense.affect(this.defense.position, "All");
			
			// run offense
			for (var oa = 0; oa < oprocs.length; oa++) {
				ability = this.offense.cards[oprocs[oa]].ability();
				target = this.offense.cards[oprocs[oa]].data.target;
				type = this.offense.cards[oprocs[oa]].data.type;
				if (type === "Degrade") {
					ability = this.defense.affect(ability, target);
				} else {
					ability = (target === "Self") ? this.offense.cards[oprocs[oa]].boostSelf() : this.offense.affect(ability, target);
				}
				fixed_o.addAbility([this.offense.cards[oprocs[oa]].data.name, type, target, ability]);
			}
			
			// run defense
			for (var da = 0; da < dprocs.length; da++) {
				ability = this.defense.cards[dprocs[da]].ability();
				target = this.defense.cards[dprocs[da]].data.target;
				type = this.defense.cards[dprocs[da]].data.type;
				if (type === "Degrade") {
					ability = this.offense.affect(ability, target);	
				} else {
					ability = (target === "Self") ? this.defense.cards[dprocs[da]].boostSelf() : this.defense.affect(ability, target);
				}
				fixed_d.addAbility([this.defense.cards[dprocs[da]].data.name, type, target, ability]);
			}
			
			// special combos
			if (ocombo && ocombo[0] !== "No") {
				if (!is_fixed) {
					fixed_o.combo =	(ocombo[1] < 1) ? this.defense.affect(ocombo[1], ocombo[2]) : this.offense.affect(ocombo[1], ocombo[2]);
				} else {
					fixed_o.combo = (ocombo[1] < 1) ? [ocombo[0],"Degrade", this.defense.affect(ocombo[1], ocombo[2]), ocombo[2]] : [ocombo[0], "Boost", this.offense.affect(ocombo[1], ocombo[2]), ocombo[2]];	
				}
			}
			if (dcombo && dcombo[0] !== "No") {
				if (!is_fixed) {
					fixed_d.combo = (dcombo[1] < 1) ? this.offense.affect(dcombo[1], dcombo[2]) : this.defense.affect(dcombo[1], dcombo[2]);
				} else {
					fixed_d.combo = (dcombo[1] < 1) ? [dcombo[0],"Degrade", this.offense.affect(dcombo[1], dcombo[2]), dcombo[2]] : [dcombo[0], "Boost", this.defense.affect(dcombo[1], dcombo[2]), dcombo[2]];
				}
			}
			
			// totals
			fixed_o.total = this.offense.total();
			fixed_d.total = this.defense.total();
			
			// cache
			if (!is_fixed) {
				this.defenseSession.procs.push(dprocs);
				for (var dc = 0; dc < dprocs.length; dc++) {
					this.defenseSession.cards.push(this.defense.cards[dprocs[dc]].view);	
				}
				this.offenseSession.procs.push(oprocs);
				for (var oc = 0; oc < oprocs.length; oc++) {
					this.offenseSession.cards.push(this.offense.cards[oprocs[oc]].view);	
				}
				this.offenseSession.cache.data.push({
					procs: oprocs,
					combo: ocombo,
					encounter: fixed_o	
				});
				this.defenseSession.cache.data.push({
					procs: dprocs,
					combo: dcombo,
					encounter: fixed_d
				});
				if (!this.offenseSession.combo) {
					this.offenseSession.combo = this.offense.combo();
				}
				if (!this.defenseSession.combo) {
					this.defenseSession.combo = this.defense.combo();	
				}
			}
		
			// update session properties
			if (!is_fixed) {
				this.offenseSession.evaluate(fixed_o, fixed_d);
				this.defenseSession.evaluate(fixed_d, fixed_o);
				for (var y = 0; y < this.offense.cards.length; y++) {
					this.offense.cards[y].reboot();	
				}
				for (var z = 0; z < this.defense.cards.length; z++) {
					this.defense.cards[z].reboot();	
				}
				return [this.offenseSession, this.defenseSession];
			} else {
				if (fixed_o.total > fixed_d.total) {
					fixed_o.win = true;
				} else {
					fixed_d.win = true;
				}
				for (var y = 0; y < this.offense.cards.length; y++) {
					this.offense.cards[y].reboot();	
				}
				for (var z = 0; z < this.defense.cards.length; z++) {
					this.defense.cards[z].reboot();	
				}
				return [fixed_o, fixed_d];
			}	
		},
		changeCard: function(view, data) {
			var found = false, index;
			for (var c in this.cards) {
				if (this.cards[c].id === data) {
					data = this.cards[c];	
				}
			}
			for (var a = 0; a < this.offense.cards.length; a++) {
				if (this.offense.cards[a].view === view) {
					found = true;
					return this.offense.cards[a].update(data);					
				}
			}
			if (!found) {
				for (var b = 0; b < this.defense.cards.length; b++) {
					if (this.defense.cards[b].view === view) {
						return this.defense.cards[b].update(data);	
					}
				}
			}
		},
		setPresets: function (off, def) {
			presets.set(off, def);
		},
		getPresets: function (faction, id) {
			var cards;
			if (faction === "offense") {
				cards = presets.getOffense(id);	
			} else {
				cards = presets.getDefense(id);
			}
			return cards;
		},
		addPreset: function (preset, faction) {
			presets.pushPreset(preset, faction);	
		},
		debug: function() {
			return presets.debugPresets();	
		},
		filterCards: function(alignment, rarity) {
			var filtered = [];
			var refiltered = [];
			for (var a in this.cards) {
				if (this.cards[a].alignment === alignment || alignment === "All") {
					filtered.push(this.cards[a]);
				}
			}
			for (var b = 0; b < filtered.length; b++) {
				if (filtered[b].rarity === rarity || rarity === "All") {
					refiltered.push(filtered[b]);
				}
			}
			return refiltered;
		},
		toggleCard: function(view) {
			if (view[0] == "o") {
				for (var a = 0; a < this.offense.cards.length; a++) {
					if (this.offense.cards[a].view === view) {
						this.offense.cards[a].active = !this.offense.cards[a].active;
						return this.offense.cards[a].active;
					}
				}
			} else {
				for (var b = 0; b < this.defense.cards.length; b++) {
					if (this.defense.cards[b].view === view) {
						this.defense.cards[b].active = !this.defense.cards[b].active;
						return this.defense.cards[b].active;
					}
				}
			}
		},
		adjustSkill: function(view, skill) {
			var cards;
			if (view[0] === "o") {
				cards = this.offense.cards;
				for (var a = 0; a < cards.length; a++) {
					if (cards[a].view === view) {
						this.offense.cards[a].skill = skill;
						break;
					}
				}
			} else {
				cards = this.defense.cards;
				for (var a = 0; a < cards.length; a++) {
					if (cards[a].view === view) {
						this.defense.cards[a].skill = skill;
						break;
					}
				}
			}
		},
		comboToggle: function(view) {
			var deck, combo, toggle;
			if (view[0] === "o") {
				this.offense.combo_enabled = !this.offense.combo_enabled;
				deck = this.offense;
			} else {
				this.defense.combo_enabled = !this.defense.combo_enabled;
				deck = this.defense;
			}
			combo = deck.combo();
			toggle = deck.combo_enabled;
			return [combo[0], toggle];
		},
		hasCombo: function(id) {
			var combo;
			if (id[0] === "o") {
				combo = this.offense.combo();
			} else {
				combo = this.defense.combo();
			}
			if (combo[0] !== "No") {
				return true;
			} else {
				return false;
			}
		}
	}
	
	return {
		initialize: function(cards, offense, defense) {
			return new Simulator(cards, offense, defense);
		}
	}
});