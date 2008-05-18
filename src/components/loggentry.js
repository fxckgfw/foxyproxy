/**
  FoxyProxy
  Copyright (C) 2006-2008 Eric H. Jung and LeahScape, Inc.
  http://foxyproxy.mozdev.org/
  eric.jung@yahoo.com

  This source code is released under the GPL license,
  available in the LICENSE file at the root of this installation
  and also online at http://www.gnu.org/licenses/gpl.txt
**/

///////////////////////////// LoggEntry class ///////////////////////
function LoggEntry(proxy, aMatch, uriStr, type, errMsg) {
    this.timestamp = Date.now();  
    (!this.randomMsg && this.init());
    this.uri = uriStr;
    this.proxy = proxy;
    this.proxyName = proxy.name; // Make local copy so logg history doesn't change if user changes proxy    
    this.proxyNotes = proxy.notes;  // ""
    if (type == "pat") {
      this.matchName = aMatch.name;  // Make local copy so logg history doesn't change if user changes proxy
      this.matchPattern = aMatch.pattern; // ""
      this.matchType = aMatch.isRegEx ? this.regExMsg : this.wcMsg;  
      this.whiteBlack = aMatch.isBlackList ? this.blackMsg : this.whiteMsg; // ""
      this.caseSensitive = aMatch.caseSensitive ? this.yes : this.no; // ""
    }
    else if (type == "ded") {
      this.caseSensitive = this.whiteBlack = this.matchName = this.matchPattern = this.matchType = this.allMsg;
    }   
    else if (type == "rand") {
      this.matchName = this.matchPattern = this.matchType = this.whiteBlack = this.randomMsg;
    }
    else if (type == "round") {
    }
    else if (type == "err") {
      this.errMsg = errMsg;
    }
}

LoggEntry.prototype = {
  errMsg : "", // Default value for MPs which don't have errors
  pacResult : "", // Default value for MPs which don't have PAC results (i.e., they probably don't use PACs or the PAC returned null
  init : function() { /* one-time init to get localized msgs */
    this.randomMsg = gFP.getMessage("proxy.random");
    this.allMsg = gFP.getMessage("proxy.all.urls");
    this.regExMsg = gFP.getMessage("foxyproxy.regex.label");
    this.wcMsg = gFP.getMessage("foxyproxy.wildcard.label");
    this.blackMsg = gFP.getMessage("foxyproxy.blacklist.label");
    this.whiteMsg = gFP.getMessage("foxyproxy.whitelist.label");
    this.yes = gFP.getMessage("yes");  
    this.no = gFP.getMessage("no");    
  }
};
