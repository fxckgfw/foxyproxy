/**
  FoxyProxy
  Copyright (C) 2006-2008 Eric H. Jung and LeahScape, Inc.
  http://foxyproxy.mozdev.org/
  eric.jung@yahoo.com

  This source code is released under the GPL license,
  available in the LICENSE file at the root of this installation
  and also online at http://www.gnu.org/licenses/gpl.txt
**/
var exampleURL, pattern, generatedPattern, caseSensitive, fpc;
function onLoad() {
  var inn = window.arguments[0].inn;
  document.getElementById("name").value = inn.name;
  document.getElementById("pattern").value = inn.pattern;
  document.getElementById("matchtype").selectedIndex = inn.regex ? 1 : 0;
  document.getElementById("whiteblacktype").selectedIndex = inn.black ? 1 : 0;
  document.getElementById("enabled").checked = inn.enabled;
  document.getElementById("caseSensitive").checked = inn.caseSensitive;
  document.getElementById("temp").checked = inn.temp;
  if (inn.superadd) {
    document.getElementById("superadd").setAttribute("hidden", false);  
    document.getElementById("not-superadd").setAttribute("hidden", true);    
  }
  else {
    document.getElementById("superadd").setAttribute("hidden", true);  
    document.getElementById("not-superadd").setAttribute("hidden", false);   
  }
  exampleURL = document.getElementById("exampleURL");
  pattern = document.getElementById("pattern");
  generatedPattern = document.getElementById("generatedPattern");
  caseSensitive = document.getElementById("caseSensitive");
  fpc = Components.classes["@leahscape.org/foxyproxy/common;1"].getService().wrappedJSObject;
  updateGeneratedPattern();
  sizeToContent();
}

function onOK() {
  var r = document.getElementById("matchtype").value == "r";
  var p = Components.classes["@leahscape.org/foxyproxy/common;1"].getService()
      .wrappedJSObject.validatePattern(window, r, generatedPattern.value);
  if (p) {
    window.arguments[0].out = {name:document.getElementById("name").value,
      pattern:pattern.value, isRegEx:r,
      isBlackList:document.getElementById("whiteblacktype").value == "b",
      isEnabled:document.getElementById("enabled").checked,
      caseSensitive:caseSensitive.checked,
      temp:document.getElementById("temp").checked};
    return true;
  }
  return false;
}

function updateGeneratedPattern() {
  generatedPattern.value = fpc.applyTemplate(exampleURL.value, pattern.value, caseSensitive.checked);
}