/*
	The session object stores data about a series of automated battles.
*/
define(function() {
	function Session() {
		this.battles = 0;
		this.total = 0;
		this.values = [];
		this.wins = 0;
		this.losses = 0;
		this.peak = 0;
		this.combo = 0;
		this.valley = Infinity;
		this.procs = [];
		this.cards = [];
		this.cache = {
				data: []
			};
	}
	
	Session.prototype = {
		constructor: Session,
		cardCount: function(view) {
			var views = this.cards, count = 0;
			for (var i = 0; i < views.length; i++) {
				if (views[i] === view) {
					count += 1;
				}
			}
			return Math.round((count/this.battles)*100)+"%";
		},
		procCount: function(n) {
			var procs = this.procs, count = 0;
			for (var i = 0; i < procs.length; i++) {
				if (procs[i].length === n) {
					count += 1;
				}
			}
			return Math.round((count/this.battles)*100)+"%";
		},
		clear: function() {
			this.battles = 0;
			this.total = 0;
			this.values = [];
			this.wins = 0;
			this.losses = 0;
			this.peak = 0;
			this.valley = Infinity;
			this.procs = [];
			this.cards = [];
			this.cache = {
				data: []
			};
		},
		
		ratio: function() {
			var ratio = this.wins/this.battles;
			ratio *= 100;
			return Math.round(ratio);	
		},
		average: function() {
			var average = this.total/this.battles;
			return Math.round(average);	
		},
		
		mode: function() {
			var ary = this.values;
			var counter = {};
			var mode = [];
			var freq;
			var returnMode = "";
			var max = 0;
			for (var i in ary) {
				if (!(ary[i] in counter))
					counter[ary[i]] = 0;
				counter[ary[i]]++;
		 
				if (counter[ary[i]] == max) 
					mode.push(ary[i]);
				else if (counter[ary[i]] > max) {
					max = counter[ary[i]];
					mode = [ary[i]];
				}
			}
			freq = this.valueCount(mode[0]);
			if (mode.length > 1) {
				returnMode += mode[0];
				for (var m = 1; m < mode.length; m++) {
					returnMode += ","+mode[m];
				}
				returnMode += "("+freq+")";
			} else {
				return (mode[0] + "("+freq+")");
			}
		},
		valueCount: function(n) {
			var values = this.values, count = 0;
			for (var i = 0; i < values.length; i++) {
				if (values[i] === n) {
					count += 1;
				}
			}
			return Math.round((count/this.values.length)*100)+"%";
		},
		stdDev: function() {
			var square = 0, values = this.values, average;
			for (var a = 0; a < values.length; a++) {
				square += Math.pow(values[a]-this.average(),2);
			}
			return Math.round(Math.sqrt(square/(this.battles-1)));
		},
		evaluate: function(self, opponent) {
			this.battles += 1;
			if (opponent.total < self.total) {
				this.wins += 1;	
			} else {
				this.losses += 1;
			}
			if (self.total > this.peak) this.peak = self.total;
			if (self.total < this.valley) this.valley = self.total;
			
			this.total += self.total;
			this.values.push(self.total);
		}
	}
	
	return {
		create: function() {
			return new Session();	
		}
	}
});