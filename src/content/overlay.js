/**
  FoxyProxy
  Copyright (C) 2006-2008 Eric H. Jung and LeahScape, Inc.
  http://foxyproxy.mozdev.org/
  eric.jung@yahoo.com

  This source code is released under the GPL license,
  available in the LICENSE file at the root of this installation
  and also online at http://www.gnu.org/licenses/gpl.txt
**/

var foxyproxy = {
  checkboxType : Components.interfaces.nsITreeColumn.TYPE_CHECKBOX,
  fp : Components.classes["@leahscape.org/foxyproxy/service;1"].getService().wrappedJSObject,
  fpc : Components.classes["@leahscape.org/foxyproxy/common;1"].getService().wrappedJSObject,
  statusIcon : null,
  contextMenuIcon : null,
  toolbarIcon : null,
  toolsMenuIcon : null,
	notes: ["foxyproxy-statusbar-icon","foxyproxy-statusbar-text","foxyproxy-statusbar-width","foxyproxy-toolsmenu",
		"foxyproxy-contextmenu","foxyproxy-mode-change","foxyproxy-throb","foxyproxy-updateviews","foxyproxy-autoadd-toggle"],

  alert : function(wnd, str) {
    Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
      .getService(Components.interfaces.nsIPromptService)
      .alert(null, this.fp.getMessage("foxyproxy"), str);
  },

	observe: function(subj, topic, str) {
    var e;
		try {
			e = subj.QueryInterface(Components.interfaces.nsISupportsPRBool).data;
		}
		catch(e) {}
		switch (topic) {
			case "foxyproxy-throb":
				this.throb(subj);
				break;
			case "foxyproxy-statusbar-icon":
			  this.toggleStatusBarIcon(e);
			  break;
			case "foxyproxy-statusbar-text":
				this.toggleStatusBarText(e);
			  break;
      case "foxyproxy-statusbar-width":
        this.toggleStatusBarWidth(e);
        break;
			case "foxyproxy-autoadd-toggle":
				this.checkPageLoad();
				break;
			case "foxyproxy-mode-change":
				this.setMode(str);
				this.checkPageLoad();
				break;
			case "foxyproxy-toolsmenu":
				this.toggleToolsMenu(e);
				break;
			case "foxyproxy-contextmenu":
				this.toggleContextMenu(e);
				break;
			case "foxyproxy-updateviews":
				this.updateViews(false, false);
				break;
		}
  },

  onLoad : function() {
    dump("quickadd enabled = " + this.fp.quickadd.enabled + "\n");
    dump("autoadd enabled = " + this.fp.quickadd.enabled + "\n");
  	this.statusIcon = document.getElementById("foxyproxy-status-icon");
  	this.contextMenuIcon = document.getElementById("foxyproxy-context-menu-1");
  	this.toolbarIcon = document.getElementById("foxyproxy-button-1");
  	this.toolsMenuIcon = document.getElementById("foxyproxy-tools-menu-1");
		var obSvc = Components.classes["@mozilla.org/observer-service;1"].getService(Components.interfaces.nsIObserverService);
		for (var i in this.notes) {
			obSvc.addObserver(this, this.notes[i], false);
		}
    this.toggleToolsMenu(this.fp.toolsMenu);
    this.toggleContextMenu(this.fp.contextMenu);
    this.checkPageLoad();
    this.toggleStatusBarIcon(this.fp.statusbar.iconEnabled);
    this.toggleStatusBarText(this.fp.statusbar.textEnabled);    
    this.toggleStatusBarWidth(this.fp.statusbar.width);
		this.setMode(this.fp.mode);
    this._firstRunCheck();
  },

  toggleToolsMenu : function(e) {
 	 	this.toolsMenuIcon.hidden = !e;
  },

  toggleContextMenu : function(e) {
 	 	this.contextMenuIcon.hidden = !e;
  },

  onPageLoad : function(evt) {
	  var doc = evt.originalTarget; // doc is document that triggered "onload" event
	  if (doc && doc.location) {
      foxyproxy.fp.autoadd.perform(doc.location.href, doc.documentElement.innerHTML);
      foxyproxy.fp.autoadd.reload && doc.location.reload(); // reload page if necessary
      foxyproxy.fp.writeSettings();
    }
  },


  // The first time FP runs, "firstrun" does not exist (i.e., null || false). Subsequent times, "firstrun" == true.
  // In other words, this pref is improperly named for its purpose. Better name is "notfirstrun".
  _firstRunCheck : function() {
    var f = false;
    try {
      f = this.fp.getPrefsService("extensions.foxyproxy.").getBoolPref("firstrun");
    }
    catch(e) {}
    if (!f) {
      this.torWizard(true);
      this.fp.getPrefsService("extensions.foxyproxy.").setBoolPref("firstrun", true);
    }
  },
  
  torWizard : function(firstTime) {
    var owner = foxyproxy._getOptionsDlg();
    if (this.ask(owner, (firstTime ? (this.fp.getMessage("welcome") + " ") : "") +
        this.fp.getMessage("torwiz.configure"))) {
      var withoutPrivoxy = this.ask(owner,
        this.fp.getMessage("torwiz.with.without.privoxy"),
        this.fp.getMessage("torwiz.without"),
        this.fp.getMessage("torwiz.with"));
      !withoutPrivoxy && (withoutPrivoxy = !this.ask(owner, this.fp.getMessage("torwiz.privoxy.not.required")));
      var input = {value:withoutPrivoxy?"9050":"8118"};
      var ok, title = this.fp.getMessage("foxyproxy"),
        portMsg = this.fp.getMessage("torwiz.port", [this.fp.getMessage(withoutPrivoxy?"tor":"privoxy")]);
      do {
        ok = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
          .getService(Components.interfaces.nsIPromptService)
          .prompt(owner, title, portMsg, input, null, {});
        if (ok) {
          if (isNaN(input.value) || input.value == "") {
            foxyproxy.alert(owner, this.fp.getMessage("torwiz.nan"));
            ok = false;
          }
        }
        else
          break;
      } while (!ok);
      var proxyDNS;
      ok && (proxyDNS = this.ask(owner, this.fp.getMessage("torwiz.proxydns")));
      if (ok) {
        var p = Components.classes["@leahscape.org/foxyproxy/proxy;1"]
          .createInstance(Components.interfaces.nsISupports).wrappedJSObject;
        p.name = this.fp.getMessage("tor");
        p.notes = this.fp.getMessage("torwiz.proxy.notes");
        var match = Components.classes["@leahscape.org/foxyproxy/match;1"]
          .createInstance(Components.interfaces.nsISupports).wrappedJSObject;
        match.name = this.fp.getMessage("torwiz.google.mail");
        match.pattern = this.fp.getMessage("torwiz.pattern");
        p.matches.push(match);
        p.selectedTabIndex = 2;
        p.mode = "manual";
        if (withoutPrivoxy) {
          p.manualconf.host="127.0.0.1";
          p.manualconf.port=9050;
          p.manualconf.isSocks=true;
        }
        else {
          p.manualconf.host="127.0.0.1";
          p.manualconf.port=8118;
          p.manualconf.isSocks=false;
        }
        p.manualconf.socksversion=5;
        p.autoconf.url = "";
        var params = {inn:{proxy:p, torwiz:true}, out:null};

        var win = owner?owner:window;
        win.openDialog("chrome://foxyproxy/content/addeditproxy.xul", "",
          "chrome,dialog,modal,resizable=yes,center", params).focus();
        if (params.out) {
          this.fp.proxies.push(params.out.proxy);
          this.fp.proxyDNS = proxyDNS;
          foxyproxy.updateViews(true);
          foxyproxy.alert(owner, this.fp.getMessage("torwiz.congratulations"));
	       	proxyDNS &&	this.ask(owner, this.fp.getMessage("foxyproxy.proxydns.notice")) && this.fp.restart();
        }
        else
         ok = false;
      }
      !ok && foxyproxy.alert(owner, this.fp.getMessage("torwiz.cancelled"));
    }
  },

  /**
   * Open or focus the main window/dialog
   */
  onOptionsDialog : function() {
    this.onDialog("foxyproxy-options", "chrome://foxyproxy/content/options.xul", null, null, "foxyproxy-superadd");
  },

  onDialog : function(id, xulFile, args, parms, idToClose) {
    // If there's a window/dialog already open, just focus it and return.
    var wnd = foxyproxy.findWindow(id);
    if (wnd) {
      try {
        wnd.focus();
      }
      catch (e) {
        // nsIFilePicker dialog is open. Best we can do is flash the window.
        wnd.getAttentionWithCycleCount(4);
      }
    }
    else {
    	if (idToClose) {
				var wnd = foxyproxy.findWindow(idToClose); // close competing dialog to minimize synchronization issues between the two
				wnd && wnd.close();
			}
      window.openDialog(xulFile, "", "minimizable,dialog,chrome,resizable=yes" + (args?(","+args):""), parms).focus();
    }
  },

  onQuickAddDialog : function(evt) {
  	var fp=this.fp, q=this.fp.quickadd, url; 
		if (fp.mode != "disabled" && q.enabled) {
		  if (evt.view && evt.view.content && evt.view.content.document && evt.view.content.document.location)
        url = evt.view.content.document.location.href;
      else {
		  	fp.notifier.alert(fp.getMessage("foxyproxy"), fp.getMessage("quickadd.nourl"));
		  	return;
		  }
      var match;
			if (q._prompt) {
          match = this.fpc.onSuperAdd(window, false, url, true); 
          if (match) {                         
            // Add the match
					  _qAdd(match, url, evt.view.content.document.location);
				  }
				  // if !match then the user canceled the QuickAdd dlg
			}
			else {
         match = q.match.clone();
         match.pattern = this.fpc.applyTemplate(url, q.urlTemplate, match.caseSensitive);         
				_qAdd(match, url, evt.view.content.document.location);
      }
		}
		function _qAdd(pat, url, loc) {
      var m = pat.isBlackList ? q.proxy.isBlackMatch(url) : q.proxy.isWhiteMatch(url);
			if (m) {
		    q.notifyWhenCanceled &&
		    	fp.notifier.alert(fp.getMessage("foxyproxy.quickadd.label"), fp.getMessage("quickadd.quickadd.canceled", [m.name, q._proxy.name]));
			}
			else {
				q.addPattern(pat);
        q.notify && fp.notifier.alert(fp.getMessage(q.notificationTitle), fp.getMessage("superadd.url.added", [pat.pattern, q._proxy.name]));        
        q.reload && loc.reload(); // reload page if necessary
        fp.writeSettings();
			}
		}
  },

  updateViews : function(writeSettings, updateLogView) {
    // Update view if it's open
    var optionsDlg = foxyproxy._getOptionsDlg();
    optionsDlg && optionsDlg._updateView(false, updateLogView); // don't write settings here because optionsDlg mayn't be open
    writeSettings && this.fp.writeSettings();
  },

  _getOptionsDlg : function() {
    return Components.classes["@mozilla.org/appshell/window-mediator;1"]
      .getService(Components.interfaces.nsIWindowMediator).getMostRecentWindow("foxyproxy-options");
  },

  /**
   * Find and return the dialog/window if it's open (or null if it's not)
   */
  findWindow : function(id) {
    // Same as _getOptionsDlg() but we need a windowManager for later
    var windowManager =
      Components.classes['@mozilla.org/appshell/window-mediator;1'].getService(Components.interfaces.nsIWindowMediator);
    var win0 =
      windowManager.getMostRecentWindow(id);

    if (win0) {
      var enumerator = windowManager.getEnumerator(null);
      while (enumerator.hasMoreElements()) {
        var win1 = enumerator.getNext();
        var winID = win1.document.documentElement.id;
        if (winID == "commonDialog" && win1.opener == win0)
          return win1;
      }
      return win0;
    }
    return null;
  },

  /**
   * Function for displaying dialog box with yes/no buttons (not OK/Cancel buttons),
   * or any arbitrary button labels.
   */
  ask : function(parent, text, btn1Text, btn2Text) {
    var prompts = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
      .getService(Components.interfaces.nsIPromptService);
    !btn1Text && (btn1Text = this.fp.getMessage("yes"));
    !btn2Text && (btn2Text = this.fp.getMessage("no"));
    return prompts.confirmEx(parent, this.fp.getMessage("foxyproxy"), text,
      prompts.BUTTON_TITLE_IS_STRING * prompts.BUTTON_POS_0 +
      prompts.BUTTON_TITLE_IS_STRING * prompts.BUTTON_POS_1,
      btn1Text, btn2Text, null, null, {}) == 0; // 0 means first button ("yes") was pressed
  },

  checkPageLoad : function() {
  	var listen = this.fp.mode != "disabled" && this.fp.autoadd.enabled;
    var appcontent = document.getElementById("appcontent");
    if (appcontent) {
			appcontent.removeEventListener("load", this.onPageLoad, true); // safety
	    if (listen) {
	 	    appcontent.addEventListener("load", this.onPageLoad, true);
		 	}
			else {
	  	  appcontent.removeEventListener("load", this.onPageLoad, true);
	  	}
	  }
  },

	throb : function(mp) {
		if (mp.wrappedJSObject.animatedIcons) {
			this.statusIcon.setAttribute("animated", "true");
			// this.toolbarIcon is null if user hasn't placed it in the toolbar, so we check its existance before calling setAttribute()
	    this.toolbarIcon && this.toolbarIcon.setAttribute("animated", "true");
	  	this.contextMenuIcon.setAttribute("animated", "true");
	  	this.toolsMenuIcon.setAttribute("animated", "true");
	  }
  	this.setStatusText(mp.wrappedJSObject.name, true);
		setTimeout("foxyproxy.unthrob()",	800);
	},

	unthrob : function() {
		this.statusIcon.removeAttribute("animated");
  	this.contextMenuIcon.removeAttribute("animated");
		// this.toolbarIcon is null if user hasn't placed it in the toolbar, so we check its existance before calling setAttribute()
    this.toolbarIcon &&	this.toolbarIcon.removeAttribute("animated");
  	this.toolsMenuIcon.removeAttribute("animated");
  	this.setStatusText(this.getModeAsText(this.fp.mode), false);
	},

  ///////////////// statusbar \\\\\\\\\\\\\\\\\\\\\
  toggleStatusBarIcon : function(e) {
    this.statusIcon.hidden = !e;
  },

  toggleStatusBarText : function(e) {
  	var s=document.getElementById("foxyproxy-status-text");
  	// Statusbars don't exist on all windows (e.g,. View Source) so check for existence first,
  	// otherwise we get a JS error.
    s && (s.hidden = !e);
  },
  
  toggleStatusBarWidth : function(w) {
    var s=document.getElementById("foxyproxy-status-text");
    // Statusbars don't exist on all windows (e.g,. View Source) so check for existence first,
    // otherwise we get a JS error.
    if (!s) return;
    var w = this.fp.statusbar.width; 
    if (w > 0)
      s.width = w;
    else {
      s.width = "";
      // Work-around weird FF 2.0.x bug whereby statusbarpanel doesn't fit-to-size
      // when width is the empty string; hide then show the statusbarpanel.
      if (!s.hidden) {
        s.hidden = true;
        s.hidden = false;
      }     
    }    
  },

  // Set toolbar, statusbar, and context menu text and icon colors
  setMode : function(mode) {
	  var m = this.getModeAsText(mode);
    this.toolsMenuIcon.setAttribute("mode", m);
 	  this.contextMenuIcon.setAttribute("mode", m);
		// this.toolbarIcon is null if user hasn't placed it in the toolbar, so we check its existance before calling setAttribute()
    this.toolbarIcon && this.toolbarIcon.setAttribute("mode", m);
    this.statusIcon.setAttribute("mode", m);
    this.setStatusText(m, null);
  },

  getModeAsText : function(mode) {
		return mode != "patterns" && mode != "disabled" && mode != "random" && mode != "roundrobin" ? "static" : mode;
  },

	setStatusText : function(m, literal) {
		if (literal) {
			this._adorn(m, null);
			return;
		}
    switch(m) {
      case "patterns":
      	this._adorn(this.fp.getMessage("foxyproxy.tab.patterns.label"), "orange");
        break;
      case "disabled":
        this._adorn(this.fp.getMessage("disabled"), "red");
        break;
      case "random":
      	this._adorn(this.fp.getMessage("random"), "purple");
        break;
      default:
      	this._adorn(this.fp._selectedProxy.name, "blue");
    };
	},

	_adorn : function(m, c) {
	  var e = document.getElementById("foxyproxy-status-text");
	  var txt = this.fp.getMessage("foxyproxy") + ": " + m;
  	// Statusbars don't exist on all windows (e.g,. View Source) so check for existence first,
  	// otherwise we get a JS error.
	  e && e.setAttribute("label", txt);
	  c && e.setAttribute("class", c);
		foxyproxy.toolsMenuIcon.setAttribute("tooltiptext", txt);
		foxyproxy.contextMenuIcon.setAttribute("tooltiptext", txt);
		// this.toolbarIcon is null if user hasn't placed it in the toolbar, so we check its existance before calling setAttribute()
	  foxyproxy.toolbarIcon && foxyproxy.toolbarIcon.setAttribute("tooltiptext", txt);
		foxyproxy.statusIcon.setAttribute("tooltiptext", txt);
	},

  ///////////////// utilities \\\\\\\\\\\\\\\
  onTreeClick : function(e, tree) {
	  var row = {}, col = {};
	  tree.treeBoxObject.getCellAt(e.clientX, e.clientY, row, col, {});
	  row.value > -1 && col.value && col.value.type == this.checkboxType && tree.view.selection.select(row.value);
	},

  ///////////////// menu \\\\\\\\\\\\\\\\\\\\\
  _cmd : "foxyproxy.fp.setMode(event.target.id, true);foxyproxy.updateViews(true);",
  _popupShowing : 0,

  onSBTBClick : function(e, o) {
		if (e.button==0) {
			_act(o.leftClick, e);
		}
		else if (e.button==1) {
  		_act(o.middleClick, e);
		}
		else if (e.button==2) {
			_act(o.rightClick, e);
		}
		function _act(x, e) {
			var fp=foxyproxy.fp;
			switch (x) {
				case "options":
					foxyproxy.onOptionsDialog();
					break;
				case "cycle":
					fp.cycleMode();
					break;
				case "contextmenu":
					this._popupShowing = 0;
					document.getElementById("foxyproxy-statusbar-popup").showPopup(e.target, -1, -1, "popup", "bottomleft", "topleft");
					break;
				case "reloadcurtab":
					gBrowser.reloadTab(gBrowser.mCurrentTab);
					break;
				case "reloadtabsinbrowser":
					gBrowser.reloadAllTabs();
					break;
				case "reloadtabsinallbrowsers":
				  for (var b, e = this.fpc.getEnumerator();
						   	  e.hasMoreElements();
						   	  (b = e.getNext().getBrowser()) && b.reloadAllTabs());
					break;
				case "removeallcookies":
					Components.classes["@mozilla.org/cookiemanager;1"].
						getService(Components.interfaces.nsICookieManager).removeAll();
  		  	fp.notifier.alert(fp.getMessage("foxyproxy"), fp.getMessage("cookies.allremoved"));
					break;
        case "toggle":
          // Toggle between current mode and disabled
          fp.setMode(fp.mode == "disabled" ? "previous" : "disabled");
          break;
			}
		}
	},

  onPopupHiding : function() {
    this._popupShowing > 0 && this._popupShowing--;
  },

  onPopupShowing : function(menupopup, evt) {
    this._popupShowing++;
    if (this._popupShowing == 1) {
		  while (menupopup.hasChildNodes()) {
		    menupopup.removeChild(menupopup.firstChild);
		  }
      /*var asb = document.createElement("arrowscrollbox");
      asb.setAttribute("style", "max-height: 400px;");
      asb.setAttribute("flex", "1");
      asb.setAttribute("orient", "vertical");*/

      var checkOne = new Array();
      var itm = _createRadioMenuItem(menupopup,
        "patterns",
        this._cmd,
        this.fp.getMessage("mode.patterns.accesskey"),
        this.fp.getMessage("mode.patterns.label"),
        this.fp.getMessage("mode.patterns.tooltip"));
      itm.setAttribute("class", "orange");
      checkOne.push(itm);

      for (var i=0; i<this.fp.proxies.length; i++) {
        var p = this.fp.proxies.item(i);
        var pName = p.name;
        // Set the submenu based on advancedMenus enabled/disabled
        var sbm = this.fp.advancedMenus ? _createMenu(menupopup, pName, pName.substring(0, 1), pName) : menupopup;
        var curProxy = "foxyproxy.fp.proxies.item(" + i + ").";

        if (this.fp.advancedMenus) {
	        // Enable/disable checkbox for each proxy.
	        // Don't provide enable/disable to lastresort proxy.
	    		!p.lastresort && _createCheckMenuItem(sbm,
	          curProxy + "enabled=!" + curProxy + "enabled;",
	          p.enabled,
	          this.fp.getMessage("foxyproxy.enabled.accesskey"),
	          this.fp.getMessage("foxyproxy.enabled.label"),
	          this.fp.getMessage("foxyproxy.enabled.tooltip"));

		      _createCheckMenuItem(sbm,
		        curProxy + "animatedIcons=!" + curProxy + "animatedIcons;",
		        p.animatedIcons,
		        this.fp.getMessage("foxyproxy.animatedicons.accesskey"),
		        this.fp.getMessage("foxyproxy.animatedicons.label"),
		        this.fp.getMessage("foxyproxy.animatedicons.tooltip"));
				}

        itm = _createRadioMenuItem(sbm,
          p.id,
          this._cmd,
          pName.substring(0, 1),
          this.fp.getMessage("mode.custom.label", [pName]),
          this.fp.getMessage("mode.custom.tooltip", [pName]));
        itm.setAttribute("style", "color: blue;");
        checkOne.push(itm);

	      if (this.fp.advancedMenus) {
					var numMatches = this.fp.proxies.item(i).matches.length;
					if (!p.lastresort && numMatches > 0) {
		        // Don't provide patterns list to lastresort proxy
		        // and proxies with no patterns
		        var pmp = _createMenu(sbm,
		          this.fp.getMessage("foxyproxy.tab.patterns.label"),
		          this.fp.getMessage("foxyproxy.tab.patterns.accesskey"),
		          this.fp.getMessage("foxyproxy.tab.patterns.tooltip"));

		        for (var j=0; j<numMatches; j++) {
		          var m = this.fp.proxies.item(i).matches[j];
		          var curMatch = curProxy + "matches[" + j + "].";
		          _createCheckMenuItem(pmp,
		            curMatch + "enabled=!" + curMatch + "enabled;foxyproxy.fp.writeSettings();",
		            m.enabled,
		            m.pattern.substring(0, 1),
		            m.pattern,
		            m.name);
		        }
		      }
		    }
      }

      /*itm = _createRadioMenuItem(menupopup,
        "random",
        this._cmd,
        this.fp.getMessage("mode.random.accesskey"),
        this.fp.getMessage("mode.random.label"),
        this.fp.getMessage("mode.random.tooltip"));
      itm.setAttribute("style", "color: purple;");
      checkOne.push(itm); */

      itm = _createRadioMenuItem(menupopup,
        "disabled",
        this._cmd,
        this.fp.getMessage("mode.disabled.accesskey"),
        this.fp.getMessage("mode.disabled.label"),
        this.fp.getMessage("mode.disabled.tooltip"));
      itm.setAttribute("style", "color: red;");
      checkOne.push(itm);

      // Check the appropriate one
      for (var i=0; i<checkOne.length; i++) {
        if (checkOne[i].getAttribute("value") == this.fp.mode) {
          checkOne[i].setAttribute("checked", "true");
          //checkOne[i].parentNode.setAttribute("style", "font-weight: bold;");
          break;
        }
      }
      menupopup.appendChild(document.createElement("menuseparator"));

      // Advanced menuing
      if (this.fp.advancedMenus) {
	      var submenu = document.createElement("menu");
	      submenu.setAttribute("label", this.fp.getMessage("more.label"));
	      submenu.setAttribute("accesskey", this.fp.getMessage("more.accesskey"));
	      submenu.setAttribute("tooltiptext", this.fp.getMessage("more.tooltip"));

	      var submenupopup = document.createElement("menupopup");
	      submenu.appendChild(submenupopup);

	      var gssubmenupopup =
	        _createMenu(submenupopup,
	          this.fp.getMessage("foxyproxy.tab.global.label"),
	          this.fp.getMessage("foxyproxy.tab.global.accesskey"),
	          this.fp.getMessage("foxyproxy.tab.global.tooltip"));

	      _createCheckMenuItem(gssubmenupopup,
	        "foxyproxy.fp.proxyDNS=!foxyproxy.fp.proxyDNS;foxyproxy.updateViews(false);foxyproxy.ask(null, foxyproxy.fp.getMessage('foxyproxy.proxydns.notice')) && foxyproxy.fp.restart();",
	        this.fp.proxyDNS,
	        this.fp.getMessage("foxyproxy.proxydns.accesskey"),
	        this.fp.getMessage("foxyproxy.proxydns.label"),
	        this.fp.getMessage("foxyproxy.proxydns.tooltip"));

	      _createCheckMenuItem(gssubmenupopup,
	        "foxyproxy.fp.statusbar.iconEnabled=!foxyproxy.fp.statusbar.iconEnabled;foxyproxy.updateViews(false);",
	        this.fp.statusbar.iconEnabled,
	        this.fp.getMessage("foxyproxy.showstatusbaricon.accesskey"),
	        this.fp.getMessage("foxyproxy.showstatusbaricon.label"),
	        this.fp.getMessage("foxyproxy.showstatusbaricon.tooltip"));

	      _createCheckMenuItem(gssubmenupopup,
	        "foxyproxy.fp.statusbar.textEnabled=!foxyproxy.fp.statusbar.textEnabled;foxyproxy.updateViews(false);",
	        this.fp.statusbar.textEnabled,
	        this.fp.getMessage("foxyproxy.showstatusbarmode.accesskey"),
	        this.fp.getMessage("foxyproxy.showstatusbarmode.label"),
	        this.fp.getMessage("foxyproxy.showstatusbarmode.tooltip"));

	      _createCheckMenuItem(gssubmenupopup,
	        "foxyproxy.fp.toolsMenu=!foxyproxy.fp.toolsMenu;foxyproxy.updateViews(false);",
	        this.fp.toolsMenu,
	        this.fp.getMessage("foxyproxy.toolsmenu.accesskey"),
	        this.fp.getMessage("foxyproxy.toolsmenu.label"),
	        this.fp.getMessage("foxyproxy.toolsmenu.tooltip"));

	      _createCheckMenuItem(gssubmenupopup,
	        "foxyproxy.fp.contextMenu=!foxyproxy.fp.contextMenu;foxyproxy.updateViews(false);",
	        this.fp.contextMenu,
	        this.fp.getMessage("foxyproxy.contextmenu.accesskey"),
	        this.fp.getMessage("foxyproxy.contextmenu.label"),
	        this.fp.getMessage("foxyproxy.contextmenu.tooltip"));

	      _createCheckMenuItem(gssubmenupopup,
					// no need to write settings because changing the attribute makes the fp service re-write the settings
	        "foxyproxy.fp.advancedMenus=!foxyproxy.fp.advancedMenus;foxyproxy.updateViews(false);",
	        this.fp.advancedMenus,
	        this.fp.getMessage("foxyproxy.advancedmenus.accesskey"),
	        this.fp.getMessage("foxyproxy.advancedmenus.label"),
	        this.fp.getMessage("foxyproxy.advancedmenus.tooltip"));

	      var logsubmenupopup =
	        _createMenu(submenupopup,
	        this.fp.getMessage("foxyproxy.tab.logging.label"),
	        this.fp.getMessage("foxyproxy.tab.logging.accesskey"),
	        this.fp.getMessage("foxyproxy.tab.logging.tooltip"));

	      _createCheckMenuItem(logsubmenupopup,
	      	// no need to write settings because changing the attribute makes the fp service re-write the settings
	        "foxyproxy.fp.logging=!foxyproxy.fp.logging;foxyproxy.updateViews(false);",
	        foxyproxy.fp.logging,
	        this.fp.getMessage("foxyproxy.enabled.accesskey"),
	        this.fp.getMessage("foxyproxy.enabled.label"),
	        this.fp.getMessage("foxyproxy.enabled.tooltip"));

	      _createMenuItem(logsubmenupopup,
	        this.fp.getMessage("foxyproxy.clear.label"),
	        "foxyproxy.fp.logg.clear();foxyproxy.updateViews(false, true);",
	        this.fp.getMessage("foxyproxy.clear.accesskey"),
	        this.fp.getMessage("foxyproxy.clear.tooltip"));

	      _createMenuItem(logsubmenupopup,
	        this.fp.getMessage("foxyproxy.refresh.label"),
					// Need to refresh the log view so the refresh button is enabled/disabled appropriately
	        "foxyproxy.updateViews(false, true);",
	        this.fp.getMessage("foxyproxy.refresh.accesskey"),
	        this.fp.getMessage("foxyproxy.refresh.tooltip"));

	      _createCheckMenuItem(logsubmenupopup,
					// no need to write settings because changing the attribute makes the fp service re-writes the settings
	        "foxyproxy.onToggleNoURLs();",
	        foxyproxy.fp.logg.noURLs,
	        this.fp.getMessage("foxyproxy.logging.noURLs.accesskey"),
	        this.fp.getMessage("foxyproxy.logging.noURLs.label"),
	        this.fp.getMessage("foxyproxy.logging.noURLs.tooltip"));

	      submenupopup.appendChild(document.createElement("menuseparator"));

	      itm =_createMenuItem(submenupopup,
	        this.fp.getMessage("foxyproxy.options.label"),
	        "foxyproxy.onOptionsDialog();",
	        this.fp.getMessage("foxyproxy.options.accesskey"),
	        this.fp.getMessage("foxyproxy.options.tooltip"));
	      itm.setAttribute("key", "key_foxyproxyfocus");

	      _createMenuItem(submenupopup,
	        this.fp.getMessage("foxyproxy.help.label"),
	        "foxyproxy.fpc.openAndReuseOneTabPerURL('http://foxyproxy.mozdev.org/quickstart.html');",
	        this.fp.getMessage("foxyproxy.help.accesskey"),
	        this.fp.getMessage("foxyproxy.help.tooltip"));

	      //menupopup.appendChild(asb);
	      try {
	        menupopup.appendChild(submenu);
	      }
	      catch (e) {
	        // dunno why it throws
	      }
	    }
	    else {
	    	// advanced menus are disabled
	      itm = _createMenuItem(menupopup,
	        this.fp.getMessage("foxyproxy.options.label"),
	        "foxyproxy.onOptionsDialog();",
	        this.fp.getMessage("foxyproxy.options.accesskey"),
	        this.fp.getMessage("foxyproxy.options.tooltip"));
	      itm.setAttribute("key", "key_foxyproxyfocus");

      	_createCheckMenuItem(menupopup,
      	  "foxyproxy.fp.advancedMenus = true;foxyproxy.updateViews(false);",
       	  this.fp.advancedMenus,
        	this.fp.getMessage("foxyproxy.advancedmenus.accesskey"),
        	this.fp.getMessage("foxyproxy.advancedmenus.label"),
        	this.fp.getMessage("foxyproxy.advancedmenus.tooltip"));
	    }
    }

    function _createMenu(menupopup, label, accesskey, tooltip) {
      var submenu = document.createElement("menu");
      submenu.setAttribute("label", label);
      submenu.setAttribute("accesskey", accesskey);
      submenu.setAttribute("tooltiptext", tooltip);
      var submenupopup = document.createElement("menupopup");
      submenu.appendChild(submenupopup);
      menupopup.appendChild(submenu);
      return submenupopup;
    }

    function _createMenuItem(menupopup, label, cmd, accesskey, tooltip) {
      var e = document.createElement("menuitem");
      e.setAttribute("label", label);
      e.setAttribute("oncommand", cmd);
      e.setAttribute("accesskey", accesskey);
      e.setAttribute("tooltiptext", tooltip);
      menupopup.appendChild(e);
      return e;
    }

    function _createRadioMenuItem(menupopup, id, cmd, accesskey, label, tooltip) {
      var e = document.createElement("menuitem");
      e.setAttribute("label", label);
      e.setAttribute("id", id);
      e.setAttribute("value", id);
      e.setAttribute("type", "radio");
      e.setAttribute("name", "foxyproxy-enabled-type");
      e.setAttribute("tooltiptext", tooltip);
      e.setAttribute("oncommand", cmd);
      e.setAttribute("accesskey", accesskey);
      menupopup.appendChild(e);
      return e;
    }

    function _createCheckMenuItem(menupopup, cmd, checked, accesskey, label, tooltip) {
      var e = document.createElement("menuitem");
      e.setAttribute("label", label);
      e.setAttribute("type", "checkbox");
      e.setAttribute("checked", checked);
      e.setAttribute("tooltiptext", tooltip);
      e.setAttribute("oncommand", cmd);
      e.setAttribute("accesskey", accesskey);
      menupopup.appendChild(e);
      return e;
    }
  },

	onToggleNoURLs : function(owner) {
		this.fp.logg.noURLs=!this.fp.logg.noURLs;
		if (this.fp.logg.noURLs && this.fp.logg.length > 0) {
	  	var q=this.ask(owner?owner:window, this.fp.getMessage("log.scrub"));
	  	if (q) {
	  		this.fp.logg.scrub();
	  		this.updateViews(false, true);
	  	}
	  }
	}
};

///////////////////////////////////////////////////////

window.addEventListener("load", function(e) { foxyproxy.onLoad(e); }, false);
window.addEventListener("unload", function(e) {
	document.getElementById("appcontent") && document.getElementById("appcontent").removeEventListener("load", this.onPageLoad, true);
	var obSvc = Components.classes["@mozilla.org/observer-service;1"].getService(Components.interfaces.nsIObserverService);
	for (var i in foxyproxy.notes) {
		obSvc.removeObserver(foxyproxy, foxyproxy.notes[i]);
	}
}, false);
