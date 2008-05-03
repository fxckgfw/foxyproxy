/**
  FoxyProxy
  Copyright (C) 2006-2008 Eric H. Jung and LeahScape, Inc.
  http://foxyproxy.mozdev.org/
  eric.jung@yahoo.com

  This source code is released under the GPL license,
  available in the LICENSE file at the root of this installation
  and also online at http://www.gnu.org/licenses/gpl.txt
**/
function onOK() {
  var r = document.getElementById("matchtype").value == "r",
    pattern = document.getElementById("pattern").value;
  var p = Components.classes["@leahscape.org/foxyproxy/common;1"].getService()
    .wrappedJSObject.validatePattern(window, r, pattern);
  if (p) {
	  window.arguments[0].out = {name:document.getElementById("name").value,
	    pattern:p, isRegEx:r,
	    isBlackList:document.getElementById("whiteblacktype").value == "b",
	    isEnabled:document.getElementById("enabled").checked,
      caseSensitive:document.getElementById("caseSensitive").checked,
      temp:document.getElementById("temp").checked};
	  return true;
	}
  return false;
}

function onLoad() {
  var inn = window.arguments[0].inn;
  document.getElementById("name").value = inn.name;
  document.getElementById("pattern").value = inn.pattern;
  document.getElementById("matchtype").selectedIndex = inn.regex ? 1 : 0;
  document.getElementById("whiteblacktype").selectedIndex = inn.black ? 1 : 0;
  document.getElementById("enabled").checked = inn.enabled;
  document.getElementById("caseSensitive").checked = inn.caseSensitive;
  document.getElementById("temp").checked = inn.temp;  
  setTimeout(function(){sizeToContent();}, 0);
}
