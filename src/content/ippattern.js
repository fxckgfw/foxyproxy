/**
  FoxyProxy
  Copyright (C) 2006-2008 Eric H. Jung and LeahScape, Inc.
  http://foxyproxy.mozdev.org/
  eric.jung@yahoo.com

  This source code is released under the GPL license,
  available in the LICENSE file at the root of this installation
  and also online at http://www.gnu.org/licenses/gpl.txt
**/
var pattern, fp, fpc, matchStatus, CC = Components.classes;
function onLoad() {
  var p = window.arguments[0].inn.pattern;
  document.getElementById("enabled").checked = p.enabled;
  document.getElementById("name").value = p.name;
  document.getElementById("whiteblacktype").selectedIndex = p.isBlackList ? 1 : 0;
  document.getElementById("temp").checked = p.temp;
  pattern = document.getElementById("pattern");
  pattern.value = p.pattern;
  fp = CC["@leahscape.org/foxyproxy/service;1"].getService().wrappedJSObject;  
  fpc = CC["@leahscape.org/foxyproxy/common;1"].getService().wrappedJSObject;
  matchStatus = document.getElementById("match-status"); 
  refreshLocalIPs();
  sizeToContent();
}

function onOK() {
  var r = document.getElementById("matchtype").value == "r";
  var p = CC["@leahscape.org/foxyproxy/common;1"].getService()
      .wrappedJSObject.validatePattern(window, r, pattern.value);
  if (p) {
    var ret = CC["@leahscape.org/foxyproxy/match;1"].createInstance().wrappedJSObject;
    //order is (enabled, name, pattern, temp, isRegEx, caseSensitive, isBlackList, isMultiLine)
    ret.init(document.getElementById("enabled").checked,
      document.getElementById("name").value, pattern.value,
      document.getElementById("temp").checked, r,
      false, document.getElementById("whiteblacktype").value == "b", false);
    window.arguments[0].out = {pattern:ret};
    return true;
  }
  return false;
}

function refreshLocalIPs() {
  var menu = document.getElementById("ipsMenu"),
    popup=menu.firstChild,
    fpc = CC["@leahscape.org/foxyproxy/common;1"].getService().wrappedJSObject;
  fpc.removeChildren(popup);
  fp.refreshLocalIPs();
  for (var i in fp.ips)
    popup.appendChild(fpc.createMenuItem({idVal:fp.ips[i], labelVal:fp.ips[i], document:document}));
  menu.selectedIndex = 0;
  updateMatchStatus();  
}

function copyIP() {
  pattern.value = document.getElementById("ipsMenu").value;
  updateMatchStatus();
}

function updateMatchStatus() {
  var mb = document.getElementById("match-broadcaster"),
    nmb = document.getElementById("no-match-broadcaster");
  var m = CC["@leahscape.org/foxyproxy/match;1"].createInstance().wrappedJSObject;
  //order is [enabled, name, pattern, temp, isRegEx, caseSensitive, isBlackList, isMultiLine]
  m.init(true, "", pattern.value, false, document.getElementById("matchtype").value == "r",
    false, false, false);
  for (var i in fp.ips) {
    if (m.pattern == fp.ips[i] || m.regex.test(fp.ips[i])) {
      nmb.hidden = true;
      mb.hidden = false; 
      return;
    }
  }
  nmb.hidden = false;
  mb.hidden = true;   
}