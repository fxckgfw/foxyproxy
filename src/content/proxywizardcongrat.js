/**
  FoxyProxy
  Copyright (C) 2006-#%#% Eric H. Jung and FoxyProxy, Inc.
  http://getfoxyproxy.org/
  eric.jung@yahoo.com

  This source code is released under the GPL license,
  available in the LICENSE file at the root of this installation
  and also online at http://www.gnu.org/licenses/old-licenses/gpl-2.0.html
**/

function openLocationURL() {
  Component.classes["@leahscape.org/foxyproxy/common;1"].getService().
    wrappedJSObject.openAndReuseOneTabPerURL("https://getfoxyproxy.org/" +
    "proxyservice/geoip/whatsmyip.html");
}
