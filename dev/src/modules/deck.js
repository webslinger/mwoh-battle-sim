/*
	The deck object is responsible for working with a deck of cards, primarily applying buffs/debuffs and communicating with individual cards. 
*/
define(["./card", "./presets", "./supportdeck"], function(card, presets, supportdeck) {
	function Deck(faction, views, data, support_deck) {
		this.faction = faction;
		this.use_adapter = true;
		this.combo_enabled = true;
		this.support_enabled = true;
		this.position = 1;
		this.scrapper = 1;
		this.adapter = 1.07;
		this.cards = [
			card.create(data, faction),
			card.create(data, faction),
			card.create(data, faction),
			card.create(data, faction),
			card.create(data, faction)
		];
		this.cards[0].primary = true;
		this.support = supportdeck.create(support_deck[0],support_deck[1],support_deck[2]);		
		for (var i = 0; i < views.length; i++) {
			this.cards[i].view = views[i];
		}
	}
	
	Deck.prototype = {
		constructor: Deck,
		
		total: function(atkdef) {
			var total = 0;
			for (var c = 0; c < this.cards.length; c++) {
				if (atkdef) {
					total += (atkdef === "atk") ? parseInt(this.cards[c].data.atk) : parseInt(this.cards[c].data.def);	
				} else {
					total += Math.round(this.cards[c].stat);
				}
			}
			return total;
		},
		
		procs: function(blocking, opponent, is_fixed) {
			var qualified_procs = [];
			var active_procs = [];
			var qualified;
			for (var d = 0; d < this.cards.length; d++) {
				qualified = false;
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
							for (var h = 0; h < this.cards.length; h++) {
								if (this.cards[h].data.hero) {
									qualified = true;	
								}
							}
							break;
						case "Villain":
						case "Villains":
							qualified = false;
							for (var v = 0; v < this.cards.length; v++) {
								if (!this.cards[v].data.hero || this.cards[v].data.hero == "0") {
									qualified = true;
								}
							}
							break;
						case "!Bruiser":
						case "!Speed":
						case "!Tactics":
							qualified = false;
							for (var m = 0; m < this.cards.length; m++) {
								if (this.cards[m].data.alignment !== this.cards[d].data.target.substring(1)) {
									qualified = true;	
								}
							}
							break;
						default:
							if (this.cards[d].data.type === "Degrade") {
								qualified = false;
								for (var e = 0; e < opponent.length; e++) {
									if (opponent[e].data.alignment === this.cards[d].data.target) {
										qualified = true;
									}
								}
							} 
							break;
					}
				}
				if (qualified) {
					if (is_fixed) {
						if (this.cards[d].active && this.cards[d].data.ability !== 0) {
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
				while (active_procs.length < 3 && qualified_procs.length > 0) {
					active_procs.push(qualified_procs.shift());
					if (!blocking) {
						qualified_procs = this.shuffle(qualified_procs);
					}
				}
			}
			return active_procs;
		},
		supportBoost: function(atkdef) {
			var supportBoost = this.support.supportBoost(atkdef);
			return supportBoost;	
		},
		
		supportAffect: function(homeTeam, awayTeam, is_fixed) {
			var proc = this.support.procs(homeTeam, awayTeam, is_fixed), affect;
			console.log(proc);
			if (proc) {
				proc = proc[0];
				var cardMod = this.support.cards[proc].data.modifier;
				var cardTarg = this.support.cards[proc].data.target;
				if (cardMod > 1) {
					cardMod *= 100;
					cardMod -= 100;
					cardMod /= 2;
					cardMod += 100;
					cardMod /= 100;
					affect = this.affect(cardMod, cardTarg);
				} else {
					cardMod *= 100;
					cardMod = 100 - cardMod;
					cardMod /= 2;
					cardMod = 100 - cardMod;
					cardMod /= 100;
					affect = awayTeam.affect(cardMod, cardTarg);
				}	
				console.log(affect);		
				return [this.support.cards[proc].data.name, this.support.cards[proc].data.type, this.support.cards[proc].data.target, affect];
			} else {
				return false;
			}
		},
		
		affect: function(mod, criteria) {
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
		
		adapterReaction: function() {
			var initial_stats = this.total();
			for (var c = 0; c < this.cards.length; c++) {
				this.cards[c].stat = Math.round(this.cards[c].stat * this.adapter);
			}
			return (this.total() - initial_stats);	
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
		combo: function() {
			var finalCombo;
			if (this.faction == "offense") {
				if (this.qualify("name",["Sentinel", "Iron Monger", "Ultron"])) {
					finalCombo = ["Modern Weapons", 0.88, "Hero"];
				} else if (this.qualify("name",["Thing", "She-Hulk", "Hulk"])) {
					finalCombo = ["Unlimited Power", 1.1, "Bruiser"];	
				} else if (this.qualify("name", ["Torch", "Nova", "Surfer"])) {
					finalCombo = ["Shooting Star", 1.0889, ["Torch", "Nova", "Surfer"]];
				} else if (this.qualify("name", ["Spider-Man", "Racoon", "Deadpool", "Ghost Rider"])) {
					finalCombo = ["Cracking Wise", 1.07, "Speed"];
				} else if (this.qualify("name", ["Spider-Man", "Racoon"])) {
					finalCombo = ["Hey Rocky!", 1.07, "Speed"];
				} else if (this.qualify("name", ["Ghost Rider", "Spider-Man", "Blade"])) {
					finalCombo = ["Ogre, Devil, Spider", 1.07, "Speed"];
				} else if (this.qualify("name", ["Doctor Strange", "Iron Man", "Mr. Fantastic"])) {
					finalCombo = ["Great Brains", 1.07, "Tactics"];
				} else if (this.qualify("name", ["Apocalypse", "Jean Grey", "Wolverine", "Cyclops"])) {
					finalCombo = ["Homo Superior", 1.07, "Bruiser"];
				} else if (this.qualify("name", ["Scarlet Witch", "Doctor Strange", "Doctor Doom"])) {
					finalCombo = ["Sorcerers Three", 0.94, "All"];
				} else if (this.qualify("name", ["Spider-Man", "Scarlet Spider", "Spider-Woman"])) {
					finalCombo = ["Spider Bite", 0.94, "All"];
				} else if (this.qualify("name", ["Wolverine", "Cyclops", "Jean Grey"])) {
					finalCombo = ["X-Power", 1.06, "Heroes"];
				} else if (this.qualify("name", ["Cyclops", "Jean Grey", "Emma Frost"])) {
					finalCombo = ["Menage", 1.06, "All"];
				} else if (this.qualify("name", ["Magneto", "Emma Frost", "Scarlet Witch"])) {
					finalCombo = ["Mutant Masterminds", 1.06, "All"];
				} else if (this.qualify("name", ["Doom", "Magneto"])) {
					finalCombo = ["Electromagnetic", 1.05, "All"];	
				} else if (this.qualify("name", ["Venom", "Thanos"])) {
					finalCombo = ["Hungry for Death", 1.05, "Villains"];
				} else if (this.qualify("sex", "M") && this.qualify("hero", "0")) {
					finalCombo = ["Wild Villains", 1.03, "All"];
				} else if (this.qualify("hero", "0")) {
					finalCombo = ["Dark Powers", 0.97, "All"];
				} else if (this.qualify("name", ["Captain America", "Iron Man", "Thor"])) {
					finalCombo = ["Avengers Big 3", 1.1191, ["Captain America", "Iron Man", "Thor"]];
				} else if (this.qualify("name", ["Torch", "Ghost Rider", "Wolverine"])) {
					finalCombo = ["Biker's Organization", 1.07, ["Ghost Rider", "Torch", "Wolverine"]];
				} else if (this.qualify("name", ["Iron Man", "War Machine"])) {
					finalCombo = ["Synergy Drive Reactors", 1.122, ["Iron Man", "War Machine"]];
				} else if (this.qualify("name", ["Wolverine", "Punisher"])) {
					finalCombo = ["Merciless Heroes", 1.1215, ["Punisher", "Wolverine"]];
				} else if (this.qualify("name", ["Captain America", "Wolverine"])) {
					finalCombo = ["Super Soldiers", 1.1191, ["Captain America", "Wolverine"]];
				} else if (this.qualify("name", ["X-23", "Wolverine", "Daken"])) {
					finalCombo = ["Claws", 1.1, ["X-23", "Wolverine", "Darken"]]; 
				} else if (this.qualify("sex", "F") && this.qualify("hero", "1")) {
					finalCombo = ["Dangerous Beauties", 0.96, "All"];	
				} else if (this.qualify("sex", "M") && this.qualify("hero", "1")) {
					finalCombo = ["Fury Blast", 1.03, "All"];
				} else if (this.qualify("name", ["Vision", "Sentinel", "Ultron"])) {
					finalCombo = ["Synthetic Life", 1.06, ["Vision", "Sentinel", "Ultron"]];
				} else {
					finalCombo = ["No", 1, "All"];
				}	
			} else {
				if (this.qualify("name", ["Strange", "Surfer", "Hulk"])) {
					finalCombo = ["Defenders", 1.12, "All"];	
				} else if (this.qualify("name", ["Thing", "Mr. Fantastic", "Torch", "Invisible"])) {
					finalCombo = ["Fantastic Four", 1.1, ["Thing", "Mr. Fantastic", "Torch", "Invisible"]];
				} else if (this.qualify("name", ["Hulk", "A-Bomb"])) {
					finalCombo = ["Radiation Brothers", 1.05, "Bruiser"];	
				} else if (this.qualify("hero", "1")) {
					finalCombo = ["Marvel Hero Team", 1.03, "All"];
				} else {
					finalCombo = ["No", 1, "All"];
				}
			}
			return finalCombo;
		},
		comboProc: function() {
			var proc = false, 
				combo = this.combo();
				
			switch (combo[0]) {
				case "Ogre, Devil, Spider":
				case "Shooting Star":
				case "Avengers Big 3":
				case "Great Brains":
				case "Unlimited Power":
				case "Modern Weapons":
					if (Math.ceil(4*(Math.random())) > 1) {
						proc = true;	
					}
					break;
				case "Fury Blast":
				case "Dangerous Beauties":
				case "Wild Villains":
				case "Cracking Wise":
				case "Homo Superior":
					if (Math.ceil(10*(Math.random())) > 1) {
						proc = true;
					}
					break;
				case "Claws":
				case "Menage":
				case "Mutant Masterminds":
				case "Spider Bite":
				case "X-Power":
				case "Sorcerers Three":
				case "Synthetic Life":
					if (Math.ceil(100*(Math.random())) > 15) {
						proc = true;	
					}
					break;
				case "Marvel Hero Team":
				case "Dark Powers":
				case "Fantastic Four":
				case "Defenders":
				case "Hungry for Death":
				case "Radiation Brothers":
				case "Hey Rocky!":
					if (Math.ceil(10*(Math.random())) > 2) {
						proc = true;	
					}
					break;
				case "Super Soldiers":
				case "Merciless Heroes":
				case "Synergy Drive Reactors":
					if (Math.ceil(10*(Math.random())) > 4) {
						proc = true;
					}
					break;
			}
			return proc;
		},
		shuffle: function(array) {
			var i = array.length, j, temp;
			if (i === 0) return false;
			while (--i) {
				j = Math.floor(Math.random()*(i+1));
				temp = array[i];
				array[i] = array[j];
				array[j] = temp;	
			}
			return array;
		},
		save: function(name) {
			var presets1, preset, pid, newOption;
			if (!window.localStorage.getItem("presets")) {
				presets1 = {};
				presets1.offense = [];
				presets1.defense = [];
				presets1[this.faction].push({
					id: 0,
					name: name,
					cards: JSON.parse(JSON.stringify(this.cards))	
				});
				window.localStorage.setItem("presets", JSON.stringify(presets1));				
			} else {
				presets1 = JSON.parse(window.localStorage.getItem("presets"));
				pid = presets1[this.faction].length;
				presets1[this.faction].push({
					id: pid,
					name: name,
					cards: JSON.parse(JSON.stringify(this.cards))
				});
				window.localStorage.setItem("presets", JSON.stringify(presets1));
			}
			preset = JSON.parse(window.localStorage.getItem("presets"));
			preset = preset[this.faction][preset[this.faction].length-1];
			presets.set(presets1.offense, presets1.defense);
			newOption = "<option id='"+preset.id+"'>"+preset.name+"</option>";
			return newOption;
		},
		update: function(id) {
			var preset;
			if (window.localStorage) {
				preset = JSON.parse(window.localStorage.getItem("presets"));				
				if (!isNaN(id)) {
					preset[this.faction][id].cards = simulator[this.faction].cards;
					window.localStorage.setItem("presets", JSON.stringify(preset));
					preset = JSON.parse(window.localStorage.getItem("presets"));
					presets.set(preset.offense, preset.defense);
					return true;		
				} else {
					return false;
				}
			}
		},
		remove: function(id) {
			if (window.localStorage) {
				var preset = JSON.parse(window.localStorage.getItem("presets"));
				for (var i = 0; i < preset[this.faction].length; i++) {
					if (preset[this.faction][i].id === parseInt(id)) {
						preset[this.faction].splice(i,1);	
					}
				}
				window.localStorage.setItem("presets", JSON.stringify(preset));
				presets.set(presets.offense, presets.defense);
				return true;
			} else {
				return false;
			}
		}
	}
	
	return {
		create: function(f, d, c, s) {
			return new Deck(f, d, c, s);	
		}
	}
});