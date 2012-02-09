/**
  FoxyProxy
  Copyright (C) 2006-#%#% Eric H. Jung and FoxyProxy, Inc.
  http://getfoxyproxy.org/
  eric.jung@yahoo.com

  This source code is released under the GPL license,
  available in the LICENSE file at the root of this installation
  and also online at http://www.gnu.org/licenses/old-licenses/gpl-2.0.html
**/

var req, aborted = false;
function onLoad() {
  sizeToContent();
}

function openLocationURL() {
  Components.classes["@leahscape.org/foxyproxy/common;1"].getService().
    wrappedJSObject.openAndReuseOneTabPerURL("https://getfoxyproxy.org/" +
    "proxyservice/");
}

function onOK() {
  // Cancel any outstanding XHR calls to prevent memory leaks;
  // We don't want any references to the XHR callback functions
  // when this dialog closes.
  req.abort();
  aborted = true;
  return true;
}

function onCheck() {
  let proxyURI;
  let fp = Components.classes["@leahscape.org/foxyproxy/service;1"].getService().
    wrappedJSObject;
  let url = "https://getfoxyproxy.org/proxyservice/get-details-fp.php?subscription="
  let subscriptionID = document.getElementById("subscriptionID").value; 
  req = new XMLHttpRequest();
  // We need to signal the parent dialog whether the proxy got successfully
  // configured.
  req.success = false;
  req.onreadystatechange = function (oEvent) {
    if (req.readyState === 1) {
      // Let's show the user that we are fetching her proxy details.
      wait();
    } else if (req.readyState === 4) {
      unWait();
      if (req.status === 200) {
        let response = req.responseText;
        // We got something back. Let's try to create a proxy-URL and parse it
        // if it is not an "error" message.
        if (response !== "error") {
          let fpc = Components.classes["@leahscape.org/foxyproxy/common;1"].
            getService().wrappedJSObject;
          try {
            proxyURI = fpc._ios.newURI(req.responseText, null, null);
          } catch(e) {
            // We could not generate a URI. Thus, parsing of the proxy details
            // will fail...
            fp.alert(null, fp.getMessage("proxywiz.parse.failure"));
          }
          window.arguments[0].proxy = fpc.processProxyURI(proxyURI);
          window.document.documentElement.acceptDialog();
        } else {
          // The user entered an invalid subscription id
          fp.alert(null, fp.getMessage("proxywiz.id.failure"));
        }
      } else {
        if (!aborted)
          fp.alert(null, fp.getMessage("proxywiz.load.failure"));
      }
    } else { } 
  }
  req.open("GET", url + subscriptionID, true);
  req.send(null);
  return false;
}

function wait() {
  document.getElementById("loadHint").collapsed = false;
  document.getElementById("checkBtn").disabled = true;
  // Hide the OK btn
  document.documentElement.getButton("accept").hidden = true;
  sizeToContent();
}

function unWait() {
  document.getElementById("loadHint").collapsed = true;
  document.getElementById("checkBtn").disabled = false;
  // Show the OK btn
  document.documentElement.getButton("accept").hidden = false;
  sizeToContent();
}

function onCancel() {
  // Cancel any outstanding XHR calls to prevent memory leaks;
  // We don't want any references to the XHR callback functions
  // when this dialog closes.
  req.abort();
  aborted = true;
  return true;
}
