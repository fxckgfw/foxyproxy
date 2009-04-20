/**
  FoxyProxy
  Copyright (C) 2006-2009 Eric H. Jung and LeahScape, Inc.
  http://foxyproxy.mozdev.org/
  eric.jung@yahoo.com

  This source code is released under the GPL license,
  available in the LICENSE file at the root of this installation
  and also online at http://www.gnu.org/licenses/gpl.txt
**/

/**
 * Handles page selections; e.g., for setting new host:port from user-selected text
 */
foxyproxy.selection = {
  reloadCurrentTab: true,
  onChangeHost : function() {
    var fp = foxyproxy.fp, sel = this.parseSelection();
    if (sel.reason == 0) {
      var p = {inn:{title:fp.getMessage("choose.proxy", [sel.hostPort])}, out:null};          
      window.openDialog("chrome://foxyproxy/content/chooseproxy.xul", "",
        "chrome, dialog, modal, centerscreen=yes, resizable=yes", p).focus();
      if (p.out) {
        p = p.out;
        p.proxy.manualconf.host = sel.host;
        p.proxy.manualconf.port = sel.port;        
        fp.notifier.alert(null, fp.getMessage("changed.host", [p.proxy.name, sel.hostPort]));
        if (p.reloadcurtab) {
          var r;
          if (fp.mode == "disabled") {
            r = foxyproxy.ask(window, fp.getMessage("enable.before.reloading"), fp.getMessage("yes.use.patterns"), fp.getMessage("yes.use.proxy.for.all", [p.proxy.name]), fp.getMessage("no.keep.disabled"));
            if (r == 0) fp.setMode("patterns", false);
            else if (r == 1) fp.setMode(p.proxy.id, false);
          }
          if (r != 2 && p.proxy.mode != "manual") {
            var q = foxyproxy.ask(window, fp.getMessage("switch.proxy.mode", [p.proxy.name, sel.hostPort]));
            if (q)
              p.proxy.mode = "manual";
          }      
          gBrowser.reloadTab(gBrowser.mCurrentTab);
        }
        fp.writeSettings();        
      }
    }
    else if (sel.reason == 1)
      fp.notifier.alert(null, fp.getMessage("noHostPortSelected"));
  },
  
  /**
   * Returns object with 3 properties.
   * reason contains 0 if success, 1 if current selection can't be parsed properly (or nothing
   * selected), and 2 if the |proxy| optional argument is disabled. if no |proxy| specified,
   * |reason| is never 2.
   */
  parseSelection : function(proxy) { 
    /* Any selected text that looks like it might be a host:port?
     Found a possible host:port combination if parsed.length == 2.
     http://mxr.mozilla.org/mozilla-central/source/browser/base/content/browser.js#4620
     getBrowserSelection() never appears to return null, just the empty string, but we
     check for null anyway just in case that is changed in a future release.*/
    var ret = {};
    ret.selection = getBrowserSelection();
    // Only show these menu items if there is selected text, otherwise they their phrasing
    // appears funny: "Set <blank> as this proxy's new host and port", even if disabled.
    if (ret.selection != null && ret.selection != "") {
      var parsed = ret.selection.split(/:|\s/);        
      if (proxy && !proxy.enabled  /* || fp.mode == "disabled" */)
        ret.reason = 2;
      else if (parsed.length != 2 || parsed[1].match(/\D/) != null)
        ret.reason = 1;
      else {
        ret.reason = 0;
        // Make the returned selection look nice for cases where the delimiter wasn't a colon
        ret.hostPort = parsed[0] + ":" + parsed[1];
        ret.host = parsed[0];
        ret.port = parsed[1];
      }
    }
    else
      ret.reason = 1;
    return ret;
  }
};