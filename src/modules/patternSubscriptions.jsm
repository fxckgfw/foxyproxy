/**
  FoxyProxy
  Copyright (C) 2006-#%#% Eric H. Jung and LeahScape, Inc.
  http://getfoxyproxy.org/
  eric.jung@yahoo.com

  This source code is released under the GPL license,
  available in the LICENSE file at the root of this installation
  and also online at http://www.gnu.org/licenses/gpl.txt
**/

"use strict";

var Ci = Components.interfaces, Cu = Components.utils, Cc = Components.classes;

Cu.import("resource://foxyproxy/patternSubscription.jsm");

var EXPORTED_SYMBOLS = ["patternSubscriptions"];

var patternSubscriptions = {
 
  subscriptionsList: [],

  loadSubscription: function(aURLString) {
    try {
      var nativeJSON;
      var subscriptionText;
      var subscriptionJSON;
      var req = Cc["@mozilla.org/xmlextras/xmlhttprequest;1"].
        createInstance(Ci.nsIXMLHttpRequest);

      req.open("GET", aURLString, false);
      // We do need the following line of code. Otherwise we would get an error
      // that our JSON is not well formed if we load it from a local drive. See:
      // http://stackoverflow.com/questions/677902/not-well-formed-error-in-
      // firefox-when-loading-json-file-with-xmlhttprequest 
      req.overrideMimeType("application/json");
      req.send(null);
      subscriptionText = req.responseText;

      // As FoxyProxy shall be usable with FF < 3.5 we use nsIJSON.
      nativeJSON = Cc["@mozilla.org/dom/json;1"].createInstance(Ci.nsIJSON);
      subscriptionJSON = nativeJSON.decode(subscriptionText);
      this.parseSubscription(subscriptionJSON, aURLString);
    } catch (e) {
      dump("Error fetching the example JSON file: " + e);
    }
  },

  parseSubscription: function(aSubscription, aURLString) {
    var subProperty;
    var newSub = new PatternSubscription();
    for (subProperty in aSubscription.metadata) {
      // Maybe someone cluttered the metadata or mistyped a property...
      if (newSub.hasOwnProperty(subProperty)) {
        newSub[subProperty] = aSubscription.metadata[subProperty];
      }
    }
    // If we still do not have a name for our subscription let it be its URL.
    if (!newSub.name || newSub.name === "") {
      newSub.name = aURLString;
    }
    // If no URL is given in the metadata set it to the current one.
    if (!newSub.url || newSub.url === "") {
      newSub.url = aURLString;
    }
    newSub.patterns = aSubscription.subscription.patterns;
    this.subscriptionsList.push(newSub);
  },

  makeSubscriptionsTreeView: function() {
    var that = this;
    var ret = {
      rowCount : that.subscriptionsList.length,
      getCellText : function(row, column) {
        var i = that.subscriptionsList[row];
        switch(column.id) {
          case "subscriptionsEnabled" : return i.enabled;
	  case "subscriptionsName" : return i.name;
          case "subscriptionsNotes" : return i.notes;
          case "subscriptionsUri" : return i.url;           
          case "subscriptionsProxy":
	    var proxyString = "";
	    for (var j = 0; j < i.proxies.length; j++) {
              proxyString = proxyString + i.proxies[j].name;
	      if (j < i.proxies.length - 1) {
		proxyString = proxyString + ", ";
              }
	    }
	    return proxyString; 
          case "subscriptionsRefresh" : return i.refresh;                   
          case "subscriptionsStatus" : return i.lastStatus;
          case "subscriptionsLastUpdate" : return i.lastUpdate;   
          case "subscriptionsFormat" : return i.format;
          case "subscriptionsOfuscation" : return i.obfuscation;
        }
      },
      setCellValue: function(row, col, val) {
		      that.subscriptionsList[row].enabled = val;
		    },
      getCellValue: function(row, col) {
		      return that.subscriptionsList[row].enabled;
		    },    
      isSeparator: function(aIndex) { return false; },
      isSorted: function() { return false; },
      isEditable: function(row, col) { return false; },
      isContainer: function(aIndex) { return false; },
      setTree: function(aTree){},
      getImageSrc: function(aRow, aColumn) {return null;},
      getProgressMode: function(aRow, aColumn) {},
      cycleHeader: function(aColId, aElt) {},
      getRowProperties: function(aRow, aColumn, aProperty) {},
      getColumnProperties: function(aColumn, aColumnElement, aProperty) {},
      getCellProperties: function(row, col, props) {},
      getLevel: function(row){ return 0; } 
    };
    return ret;
  },

  toDOM: function() {

  },

  fromDOM: function(doc) {

  }
}
