function onOK() {
  let proxyURI;
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
        // We got seomthing back. Let's try to create a proxy-URL out of it.
        let ios = Components.classes["@mozilla.org/network/io-service;1"]
                .getService(Components.interfaces.nsIIOService);
        try {
          proxyURI = ios.newURI(req.responseText, null, null);
        } catch(e) {
          dump("Error while trying to create the proxy URI..." + e + "\n");
        }
        let fpc = Components.classes["@leahscape.org/foxyproxy/common;1"].
          getService().wrappedJSObject;
        fpc.processProxyURI(proxyURI);
        dump(req.responseText);
      } else {
        
      }
    } else { } 
  }
  req.open("GET", url + subscriptionID, false);
  req.send(null);
  return true;
}
