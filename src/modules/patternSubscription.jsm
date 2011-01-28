"use strict";

var EXPORTED_SYMBOLS = ["PatternSubscription"];

function PatternSubscription() {
 this.wrappedJSObject = this;
 this.formatVersion = 1;
 this.checksum = "";
 this.algorithm = "";
 this.url = "";
 this.format = "FoxyProxy";
 this.obfuscation = "none";
 this.name = "";
 this.notes = "";
 this.enabled = true;
 this.refresh = 60;
 this.lastStatus = "";
 this.lastUpdate = new Date();
 this.proxies = [];
 this.patterns = [];
}

PatternSubscription.prototype = {

  toDOM: function() {

  },

  fromDOM: function(doc) {

  }
}
