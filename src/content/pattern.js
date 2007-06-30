/*
  FoxyProxy
  Copyright (C) 2006, 2007 Eric H. Jung and LeahScape, Inc.
  http://foxyproxy.mozdev.org/
  eric.jung@yahoo.com

  This library is free software; you can redistribute it and/or modify it
  under the terms of the GNU Lesser General Public License as published by
  the Free Software Foundation; either version 2.1 of the License, or (at
  your option) any later version.

  This library is distributed in the hope that it will be useful, but WITHOUT
  ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
  FITNESSFOR A PARTICULAR PURPOSE. See the GNU Lesser General Public License
  for more details.

  You should have received a copy of the GNU Lesser General Public License
  along with this library; if not, write to the Free Software Foundation,
  Inc., 59 Temple Place, Suite 330, Boston, MA 02111-1307 USA

  ALL RIGHTS RESERVED. U.S. PATENT PENDING.
*/
var overlay;

function onOK() {
  var r = document.getElementById("regex").selected;
  var p = overlay.common.validatePattern(window, r, document.getElementById("pattern").value);
  if (p) {
	  window.arguments[0].out = {name:document.getElementById("name").value,
	    pattern:p, isRegEx:r,
	    isBlackList:document.getElementById("black").selected,
	    isEnabled:document.getElementById("enabled").checked};
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
  sizeToContent();
}
