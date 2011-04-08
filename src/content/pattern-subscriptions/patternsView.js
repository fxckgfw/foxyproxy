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

function onLoad() {
  var patternsViewTree = document.getElementById("patternsViewTree");
  var subscription = window.arguments[0].inn.subscription;
  patternsViewTree.view = makePatternsViewTree(subscription);
}

function makePatternsViewTree(aSubscription) {
  return {
      rowCount : aSubscription.patterns.length,
      getCellText : function(row, column) {
        return getTextForCell(aSubscription.patterns[row], column.id ? column.id : column);
      },
      setCellValue: function(row, col, val) {aSubscription.patterns[row].enabled = val;},
      getCellValue: function(row, col) {return aSubscription.patterns[row].enabled;},
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
      getCellProperties: function(aRow, aProperty) {},
      getLevel: function(row){ return 0; }
    }; 
}

function getTextForCell(pat, col) {
  var foxyproxy = Components.classes["@leahscape.org/foxyproxy/service;1"].
    getService().wrappedJSObject; 
  switch (col) {
    case "name" : return pat.name;
    case "pattern" : return pat.pattern;
    case "isRegEx" : return foxyproxy.getMessage(pat.type.toLowerCase() ===
                            "wildcard" ? "foxyproxy.wildcard.label" : 
                            "foxyproxy.regex.label");
    case "isBlackList" : return foxyproxy.getMessage(pat.whitelist ? 
                                "foxyproxy.whitelist.label" : 
                                "foxyproxy.blacklist.label");
  };
}

