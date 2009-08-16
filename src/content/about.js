/**
  FoxyProxy
  Copyright (C) 2006-2009 Eric H. Jung and LeahScape, Inc.
  http://foxyproxy.mozdev.org/
  eric.jung@yahoo.com

  This source code is released under the GPL license,
  available in the LICENSE file at the root of this installation
  and also online at http://www.gnu.org/licenses/gpl.txt
**/
var fpc;

function onLoad() {
  document.documentElement.getButton("accept").focus()
  fpc = Components.classes["@leahscape.org/foxyproxy/common;1"].getService().wrappedJSObject;
  document.getElementById("ver").value += " " + fpc.getVersion();
	sizeToContent();      
}
