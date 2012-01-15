/**
  FoxyProxy
  Copyright (C) 2006-#%#% Eric H. Jung and FoxyProxy, Inc.
  http://getfoxyproxy.org/
  eric.jung@yahoo.com

  This source code is released under the GPL license,
  available in the LICENSE file at the root of this installation
  and also online at http://www.gnu.org/licenses/old-licenses/gpl-2.0.html
**/

function onOK() {
  let proxyURI;
  let fp = Components.classes["@leahscape.org/foxyproxy/service;1"].getService().
    wrappedJSObject;
  let url = "https://getfoxyproxy.org/proxyservice/get-details-fp.php?subscription="
  let subscriptionID = document.getElementById("subscriptionID").value; 
  let req = new XMLHttpRequest();
  req.onreadystatechange = function (oEvent) {
    if (req.readyState === 1) {
      document.getElementById("loadHint").collapsed = false;
      sizeToContent();
    } else if (req.readyState === 4) {
      document.getElementById("loadHint").collapsed = true;
      sizeToContent();
      if (req.status === 200) {
        // We got something back. Let's try to create a proxy-URL and parse it.
        let fpc = Components.classes["@leahscape.org/foxyproxy/common;1"].
          getService().wrappedJSObject;
        try {
          proxyURI = fpc._ios.newURI(req.responseText, null, null);
        } catch(e) {
          // We could not generate a URI. Thus, parsing of the proxy details
          // will fail...
          fp.alert(null, fp.getMessage("proxywiz.parse.failure"));
          return;
        }
        fpc.processProxyURI(proxyURI);
      } else {
        fp.alert(null, fp.getMessage("proxywiz.load.failure"));     
      }
    } else { } 
  }
  req.open("GET", url + subscriptionID, false);
  req.send(null);
  return true;
}
