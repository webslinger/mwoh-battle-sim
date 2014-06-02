/*
	The deck object is responsible for working with a deck of cards, primarily applying buffs/debuffs and communicating with individual cards. 
*/
define(["./card", "./presets"], function(card, presets) {
	function Deck(faction, views, data) {
		this.faction = faction;
		this.use_adapter = true;
		this.combo_enabled = true;
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
		for (var i = 0; i < views.length; i++) {
			this.cards[i].view = views[i];
		}
	}
	
	Deck.prototype = {
		constructor: Deck,
		// Retrieve current deck total
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
		// Determine which cards proc.
		procs: function(blocking, opponent, is_fixed) {
			var qualified_procs = [];
			var active_procs = [];
			var qualified;
            // loop through the deck
			for (var d = 0; d < this.cards.length; d++) {
                // if card is not qualified, it cannot proc (e.g. defense card on offence)
				qualified = false;
				if (this.cards[d].role() == this.faction || this.cards[d].role() == "Dual") {
                    // card qualifies if its in the right role.
					qualified = true;
				}
				if (qualified) {
                    // If the card is qualified, determine what the card does
					switch (this.cards[d].data.target) {
                        // if it targets "All" or "Self" we will handle that elsewhere
						case "All":
						case "Self": break;
                        // if it does nothing (hulk), this card will do nothing.
						case "None": qualified = false; break;
                        // If it targets "hero" or "heroes"
						case "Hero":
                        case "Heroes":
                            // disqualify the card, but re-qualify if a hero is found in the deck.
							qualified = false;
							for (var h = 0; h < this.cards.length; h++) {
								if (this.cards[h].data.hero) {
									qualified = true;	
								}
							}
							break;
                        // If it targets "villain" or "villains"
						case "Villain":
                        case "Villains":
                            // disqualify the card, but re-qualify if a hero is found in the deck.
							qualified = false;
							for (var v = 0; v < this.cards.length; v++) {
								if (!this.cards[v].data.hero || this.cards[v].data.hero == "0") {
									qualified = true;
								}
							}
							break;
                        // If the card targets 2 alignments, based off the alignment it doesnt target:
						case "!Bruiser":
						case "!Speed":
						case "!Tactics":
                            // Disqualify the card but re-qualify once cards that are not bruiser are found
							qualified = false;
							for (var m = 0; m < this.cards.length; m++) {
								if (this.cards[m].data.alignment !== this.cards[d].data.target.substring(1)) {
									qualified = true;	
								}
							}
							break;
                        // In other cases check if this is a degrader
						default:
							if (this.cards[d].data.type === "Degrade") {
                                // Disqualify the card but re-qualify if there are appropriate alignments
                                // in the opponents deck.
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
                // If the card is still qualified to proc
				if (qualified) {
                    // If this is a fixed battle (not-automated)
                    // make sure the card is active (checked cards become active)
                    // if active, add to list of procs to perform.
					if (is_fixed) {
						if (this.cards[d].active && this.cards[d].data.ability !== 0) {
							qualified_procs.push(d);
						}
                    // otherwise this is an automated battle, add proc to list of procs to perform
                    // if the proc procs.
					} else {
						if (this.cards[d].proc()) {
							qualified_procs.push(d);
						}
					}
				}
			}
            // if this is a fixed battle, define the active procs as the curated list of procs from above
			if (is_fixed) {
				active_procs = qualified_procs;
            // otherwise, in automated battles limit the # of procs to 3.
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
        // Apply buff or degrade to deck
		affect: function(mod, criteria) {
			var total = 0;
            // If there is more than 1 criteria (e.g. sex/faction and alignment)
			if (Object.prototype.toString.call(criteria) === '[object Array]') {
                // for each criteria
				for (var c = 0; c < criteria.length; c++) {
                    // for each card in deck
					for (var d = 0; d < this.cards.length; d++) {
                        // if the card fits the criteria
						if (this.cards[d].data.name.match(criteria[c])) {
                            // apply to card and update running deck total
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
							if (this.cards[c].data.alignment == criteria || this.cards[c].data.alignment == "All") {
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

        // Perform Adapter Reaction
		adapterReaction: function() {
			var initial_stats = this.total();
			for (var c = 0; c < this.cards.length; c++) {
				this.cards[c].stat = Math.round(this.cards[c].stat * this.adapter);
			}
			return (this.total() - initial_stats);	
		},

        // Qualify deck for certain conditions (e.g. all heroes, all same sex, for combos)
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

        // Determine if the deck qualfies for a special combo, ordered by strength-- stronger combos take precedence.
		combo: function() {
			var finalCombo;
            // Offensive Combos
			if (this.faction == "offense") {
				if (this.qualify("name",["Sentinel", "Iron Monger", "Ultron"])) {
					finalCombo = ["Modern Weapons", 0.88, "Hero"];
				} else if (this.qualify("name",["Thing", "She-Hulk", "Hulk"])) {
					finalCombo = ["Unlimited Power", 1.1, "Bruiser"];	
				} else if (this.qualify("name", ["Torch", "Nova", "Surfer"])) {
					finalCombo = ["Shooting Star", 1.0889, ["Torch", "Nova", "Surfer"]];
				} else if (this.qualify("name", ["Spider-Man", "Raccoon", "Deadpool", "Ghost Rider"])) {
					finalCombo = ["Cracking Wise", 1.07, "Speed"];
				} else if (this.qualify("name", ["Spider-Man", "Raccoon"])) {
					finalCombo = ["Hey Rocky!", 1.05, "Speed"];
				} else if (this.qualify("name", ["Ghost Rider", "Spider-Man", "Blade"])) {
					finalCombo = ["Ogre, Devil, Spider", 1.07, "Speed"];
				} else if (this.qualify("name", ["Doctor Strange", "Iron Man", "Mr. Fantastic"])) {
					finalCombo = ["Great Brains", 1.07, "Tactics"];
				} else if (this.qualify("name", ["Giant Man", "Iron Man", "Mr. Fantastic"])) {
					finalCombo = ["Brain Trust", 0.94, "Tactics"];
				} else if (this.qualify("name", ["Giant Man", "Tony Stark", "Mr. Fantastic"])) {
					finalCombo = ["Brain Trust", 0.94, "Tactics"];
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
				} else if (this.qualify("name", ["Magneto", "Doom", "Red Skull"])) {
					finalCombo = ["Masterminds", 1.06, "Villains"];
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
					finalCombo = ["Claws", 1.1, ["X-23", "Wolverine", "Daken"]];
				} else if (this.qualify("name", ["Vision", "Sentinel", "Ultron"])) {
					finalCombo = ["Synthetic Life", 1.06, ["Vision", "Sentinel", "Ultron"]];
				} else if (this.qualify("name", ["Hulkling", "Spider-Man"])) {
					finalCombo = ["Unmasked", 1.05, "Speed"];
				} else if (this.qualify("name", ["Punisher", "Captain America"])) {
					finalCombo = ["Veterans", 1.05, "Tactics"];					
				} else if (this.qualify("sex", "F")) {
					finalCombo = ["Dangerous Beauties", 0.96, "All"];	
				} else if (this.qualify("sex", "M") && this.qualify("hero", "1")) {
					finalCombo = ["Fury Blast", 1.03, "All"];
				} else {
					finalCombo = ["No", 1, "All"];
				}
            // Defensive Combos
			} else {
				if (this.qualify("name", ["Strange", "Surfer", "Hulk"])) {
					finalCombo = ["Defenders", 1.12, "All"];	
				} else if (this.qualify("name", ["Thing", "Mr. Fantastic", "Torch", "Invisible"])) {
					finalCombo = ["Fantastic Four", 1.1, ["Thing", "Mr. Fantastic", "Torch", "Invisible"]];
				} else if (this.qualify("name", ["Hulk", "A-Bomb"])) {
					finalCombo = ["Gamma Brothers", 1.05, "Bruiser"];	
				} else if (this.qualify("name", ["She-Hulk", "Iron Man"])) {
					finalCombo = ["Law and Order", 1.05, "Heroes"];
				} else if (this.qualify("name", ["Vision", "Captain America"])) {
					finalCombo = ["Man & Machine", 1.05, "Tactics"];					
				} else if (this.qualify("hero", "1")) {
					finalCombo = ["Marvel Hero Team", 1.03, "All"];
				} else if (this.qualify("villain", "1")) {
					finalCombo = ["Evil Alliance", 0.97, "All"];
				} else {
					finalCombo = ["No", 1, "All"];
				}
			}
			return finalCombo;
		},

        // Determine if the combo actually proc'd
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
				case "Masterminds":
				case "Mutant Masterminds":
				case "Spider Bite":
				case "X-Power":
				case "Sorcerers Three":
				case "Brain Trust":
				case "Synthetic Life":
				case "Evil Alliance":
					if (Math.ceil(100*(Math.random())) > 15) {
						proc = true;	
					}
					break;
				case "Marvel Hero Team":
				case "Dark Powers":
				case "Fantastic Four":
				case "Defenders":
				case "Hungry for Death":
				case "Gamma Brothers":
				case "Hey Rocky!":
				case "Unmasked":
				case "Electromagnetic":
				case "Veterans":
				case "Man & Machine":
				case "Law and Order":
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

        // Shuffles an array.
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

        // Save deck to localStorage
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

        // Update deck in localStorage
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

        // Remove deck from localStorage
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
		create: function(f, d, c) {
			return new Deck(f, d, c);	
		}
	}
});