/**
  FoxyProxy
  Copyright (C) 2006-2008 Eric H. Jung and LeahScape, Inc.
  http://foxyproxy.mozdev.org/
  eric.jung@yahoo.com

  This source code is released under the GPL license,
  available in the LICENSE file at the root of this installation
  and also online at http://www.gnu.org/licenses/gpl.txt
**/

var overlay;

function onOK() {
  var r = document.getElementById("regex").selected;
  var p = foxyproxy_common.validatePattern(window, r, document.getElementById("pattern").value);
  if (p) {
	  window.arguments[0].out = {name:document.getElementById("name").value,
	    pattern:p, isRegEx:r,
	    isBlackList:document.getElementById("black").selected,
	    isEnabled:document.getElementById("enabled").checked,
        caseSensitive:document.getElementById("caseSensitive").checked};
	  return true;
	}
  return false;
}

function onLoad() {
  overlay = window.arguments[0].inn.overlay;
  document.getElementById("name").value = window.arguments[0].inn.name;
  document.getElementById("pattern").value = window.arguments[0].inn.pattern;
  document.getElementById("matchtype").selectedIndex = window.arguments[0].inn.regex ? 1 : 0;
  document.getElementById("whiteblacktype").selectedIndex = window.arguments[0].inn.black ? 1 : 0;
  document.getElementById("enabled").checked = window.arguments[0].inn.enabled;
  document.getElementById("caseSensitive").checked = window.arguments[0].inn.caseSensitive;
  sizeToContent();
}
